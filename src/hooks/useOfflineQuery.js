import { useQuery } from '@tanstack/react-query';
import { cacheGet, cacheSet } from '@/lib/offlineCache';

/**
 * useOfflineQuery — wraps useQuery with offline cache fallback.
 *
 * On success: caches result to localStorage.
 * On error (e.g. offline): returns most recent cached data.
 *
 * Returns the same shape as useQuery plus:
 *   { fromCache, lastUpdated }
 *
 * @param {string} cacheKey - Unique key for localStorage cache
 * @param {object} queryConfig - Standard useQuery config { queryKey, queryFn, ... }
 * @returns {object} Extended query result
 */
export function useOfflineQuery(cacheKey, queryConfig) {
  const { queryFn, ...rest } = queryConfig;

  const wrappedQueryFn = async () => {
    try {
      const data = await queryFn();
      // Cache successful result
      cacheSet(cacheKey, data);
      return data;
    } catch (err) {
      // If fetch fails (e.g. offline), try cache
      const cached = cacheGet(cacheKey);
      if (cached.data) {
        return cached.data;
      }
      // No cache fallback — rethrow original error
      throw err;
    }
  };

  const result = useQuery({
    ...rest,
    queryFn: wrappedQueryFn,
  });

  // Determine if we loaded from cache
  const cached = cacheGet(cacheKey);
  const fromCache = result.isError && cached.data ? true : false;
  const lastUpdated = cached.lastUpdated;

  return {
    ...result,
    fromCache,
    lastUpdated,
  };
}