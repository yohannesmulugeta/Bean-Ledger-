import { useCallback, useEffect, useState } from 'react';
import {
  getPendingQueue,
  getPendingCount,
  markActionFailed,
  removeSyncedAction,
} from '@/lib/offlineQueue';

/**
 * Demo-local queue status hook.
 *
 * The legacy version flushed queued records through Base44. Phase 12 keeps the
 * status panel usable while preventing the active demo shell from importing or
 * calling Base44 runtime code.
 */
export default function useOfflineSync() {
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setQueue(getPendingQueue());
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      const pending = getPendingQueue().filter((action) => action.status === 'pending' || action.status === 'failed');
      if (pending.length > 0) {
        setQueue(pending);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const flushQueue = useCallback(async (pendingActions) => {
    if (isSyncing) return;
    setIsSyncing(true);

    const toProcess = pendingActions || getPendingQueue().filter((action) => action.status === 'pending' || action.status === 'failed');
    for (const action of toProcess) {
      markActionFailed(action.id, 'Demo offline sync is disabled until the Supabase sync worker replaces legacy Base44 sync.');
    }

    const synced = getPendingQueue().filter((action) => action.status === 'synced');
    synced.forEach((action) => removeSyncedAction(action.id));
    setQueue(getPendingQueue().filter((action) => action.status !== 'synced'));
    setIsSyncing(false);
  }, [isSyncing]);

  const retryAction = useCallback((actionId) => {
    const action = getPendingQueue().find((item) => item.id === actionId);
    if (action) {
      markActionFailed(action.id, 'Demo offline sync is disabled until the Supabase sync worker replaces legacy Base44 sync.');
      setQueue(getPendingQueue());
    }
  }, []);

  const clearFailed = useCallback((actionId) => {
    removeSyncedAction(actionId);
    setQueue(getPendingQueue());
  }, []);

  const pendingCount = getPendingCount();
  const failedCount = queue.filter((action) => action.status === 'failed').length;

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
