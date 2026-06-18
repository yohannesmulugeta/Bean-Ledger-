import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  getPendingQueue, getPendingCount,
  markActionSynced, markActionFailed, markActionSyncing, removeSyncedAction,
} from '@/lib/offlineQueue';
import { cacheSet } from '@/lib/offlineCache';

/**
 * useOfflineSync — auto-flushes the pending sync queue when online.
 * Returns the current queue state and control methods.
 */
export default function useOfflineSync() {
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue on mount
  useEffect(() => {
    setQueue(getPendingQueue());
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      const pending = getPendingQueue().filter(a => a.status === 'pending' || a.status === 'failed');
      if (pending.length > 0) {
        setQueue(pending);
        flushQueue(pending);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const flushQueue = useCallback(async (pendingActions) => {
    if (isSyncing) return;
    setIsSyncing(true);

    const toProcess = pendingActions || getPendingQueue().filter(a => a.status === 'pending' || a.status === 'failed');

    for (const action of toProcess) {
      try {
        markActionSyncing(action.id);
        setQueue(getPendingQueue());

        // Resolve entity SDK method
        const entityMethod = action.action_type === 'create'
          ? base44.entities[action.entity_name]?.create
          : base44.entities[action.entity_name]?.update;

        if (!entityMethod) {
          markActionFailed(action.id, `Unknown entity: ${action.entity_name}`);
          setQueue(getPendingQueue());
          continue;
        }

        const payload = { ...action.payload };
        // Remove temporary ID before sending to server
        if (action.action_type === 'create') {
          delete payload.local_temp_id;
        }

        if (action.action_type === 'create') {
          const result = await entityMethod(payload);
          // Refresh the cached list for this entity
          const cacheKey = _entityToCacheKey(action.entity_name);
          try {
            const fresh = await base44.entities[action.entity_name].list('-created_date', 500);
            cacheSet(cacheKey, fresh);
          } catch {
            // cache refresh is best-effort
          }
          markActionSynced(action.id);
        } else if (action.action_type === 'update') {
          const recordId = action.payload?.id || action.local_temp_id;
          if (!recordId) {
            markActionFailed(action.id, 'Missing record ID for update');
            setQueue(getPendingQueue());
            continue;
          }
          // For offline updates, we use local_temp_id — the server needs the real ID
          // If it's a temp ID, this is a create that was queued, not an update
          if (String(recordId).startsWith('temp_')) {
            markActionFailed(action.id, 'Cannot update a temporary record — must be created first');
            setQueue(getPendingQueue());
            continue;
          }
          const cleanPayload = { ...payload };
          delete cleanPayload.id;
          delete cleanPayload.local_temp_id;
          await entityMethod(recordId, cleanPayload);
          markActionSynced(action.id);
        }
      } catch (err) {
        const message = err?.message || err?.error || 'Unknown error';
        const isNetworkError = message.includes('network') || message.includes('fetch') || message.includes('Failed to fetch');

        if (isNetworkError) {
          // Keep pending, will retry
          _resetToPending(action.id);
        } else {
          // Validation/permission error — mark failed
          markActionFailed(action.id, message);
        }
      }

      setQueue(getPendingQueue());
    }

    // Clean up synced items
    const synced = getPendingQueue().filter(a => a.status === 'synced');
    synced.forEach(a => removeSyncedAction(a.id));

    setQueue(getPendingQueue().filter(a => a.status !== 'synced'));
    setIsSyncing(false);
  }, [isSyncing]);

  const retryAction = useCallback((actionId) => {
    const action = getPendingQueue().find(a => a.id === actionId);
    if (action) {
      // Reset to pending
      const queue = getPendingQueue();
      const idx = queue.findIndex(a => a.id === actionId);
      if (idx !== -1) {
        queue[idx].status = 'pending';
        queue[idx].error_message = null;
        queue[idx].retry_count = 0;
        localStorage.setItem('kkgt_offline_queue', JSON.stringify(queue));
        setQueue(queue);
        flushQueue([queue[idx]]);
      }
    }
  }, [flushQueue]);

  const clearFailed = useCallback((actionId) => {
    removeSyncedAction(actionId);
    setQueue(getPendingQueue());
  }, []);

  const pendingCount = queue.filter(a => a.status === 'pending' || a.status === 'syncing').length;
  const failedCount = queue.filter(a => a.status === 'failed').length;

  return {
    queue,
    isSyncing,
    pendingCount,
    failedCount,
    retryAction,
    clearFailed,
    flushQueue,
    refresh: () => setQueue(getPendingQueue()),
  };
}

function _resetToPending(actionId) {
  const queue = getPendingQueue();
  const idx = queue.findIndex(a => a.id === actionId);
  if (idx !== -1) {
    queue[idx].status = 'pending';
    localStorage.setItem('kkgt_offline_queue', JSON.stringify(queue));
  }
}

function _entityToCacheKey(entityName) {
  const map = {
    SampleLog: 'sample-logs',
    WarehouseReceipt: 'warehouse-receipts',
    ProcessingLog: 'processing-logs',
  };
  return map[entityName] || entityName.toLowerCase();
}