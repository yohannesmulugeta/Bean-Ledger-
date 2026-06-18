// ── localStorage-backed offline cache for entity read data ──────────────────

const CACHE_PREFIX = 'kkgt_cache_';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Store data in the offline cache.
 * @param {string} key - Unique cache key (e.g. 'purchase-records')
 * @param {any} data - Serializable data
 */
export function cacheSet(key, data) {
  try {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl: DEFAULT_TTL_MS,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

/**
 * Retrieve data from cache if it exists and hasn't expired.
 * @param {string} key
 * @returns {{ data: any, fromCache: boolean, lastUpdated: number|null, expired: boolean }}
 */
export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return { data: null, fromCache: false, lastUpdated: null, expired: false };

    const entry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    const expired = age > (entry.ttl || DEFAULT_TTL_MS);

    return {
      data: entry.data,
      fromCache: true,
      lastUpdated: entry.timestamp,
      expired,
    };
  } catch {
    return { data: null, fromCache: false, lastUpdated: null, expired: false };
  }
}

/**
 * Remove a specific cache entry.
 */
export function cacheClear(key) {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Clear all offline cache entries for this app.
 */
export function cacheClearAll() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((k) => {
      if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    });
  } catch {
    // ignore
  }
}