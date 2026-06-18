// ── Offline Pending Sync Queue ────────────────────────────────────────────────
// Stores pending creates/updates in localStorage for sync when online returns.

const QUEUE_KEY = 'kkgt_offline_queue';

/**
 * Add an action to the pending sync queue.
 * @param {{ action_type: 'create'|'update', entity_name: string, payload: object, local_temp_id?: string, user_email: string }} action
 * @returns {object} The enqueued action with id and metadata
 */
export function enqueueOfflineAction({ action_type, entity_name, payload, local_temp_id, user_email }) {
  const queue = getPendingQueue();
  const action = {
    id: crypto.randomUUID?.() || `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action_type,
    entity_name,
    payload,
    local_temp_id: local_temp_id || `temp_${Date.now()}`,
    created_at: new Date().toISOString(),
    user_email: user_email || 'unknown',
    retry_count: 0,
    status: 'pending', // pending | syncing | failed | synced
    error_message: null,
  };
  queue.push(action);
  _saveQueue(queue);
  return action;
}

/**
 * Get all pending/syncing/failed actions (excludes 'synced').
 * @returns {Array}
 */
export function getPendingQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get count of pending + failed items.
 */
export function getPendingCount() {
  return getPendingQueue().filter(a => a.status !== 'synced').length;
}

/**
 * Flush all pending items — call after successful sync.
 */
export function flushPendingQueue() {
  _saveQueue([]);
}

/**
 * Mark a specific action as synced.
 */
export function markActionSynced(actionId) {
  const queue = getPendingQueue();
  const idx = queue.findIndex(a => a.id === actionId);
  if (idx !== -1) {
    queue[idx].status = 'synced';
    _saveQueue(queue);
  }
}

/**
 * Mark a specific action as failed with an error message.
 */
export function markActionFailed(actionId, errorMessage) {
  const queue = getPendingQueue();
  const idx = queue.findIndex(a => a.id === actionId);
  if (idx !== -1) {
    queue[idx].status = 'failed';
    queue[idx].error_message = errorMessage;
    _saveQueue(queue);
  }
}

/**
 * Mark an action as syncing (in-progress).
 */
export function markActionSyncing(actionId) {
  const queue = getPendingQueue();
  const idx = queue.findIndex(a => a.id === actionId);
  if (idx !== -1) {
    queue[idx].status = 'syncing';
    _saveQueue(queue);
  }
}

/**
 * Remove a specific action from the queue.
 */
export function removeSyncedAction(actionId) {
  const queue = getPendingQueue().filter(a => a.id !== actionId);
  _saveQueue(queue);
}

/**
 * Clear a failed action (with confirmation).
 */
export function clearFailedAction(actionId) {
  removeSyncedAction(actionId);
}

/**
 * Clear all cached ERP data + pending queue (for logout).
 */
export function clearAllOfflineData() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('kkgt_')) localStorage.removeItem(k);
    });
  } catch {
    // ignore
  }
}

function _saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineQueue] Failed to save queue:', e);
  }
}