/**
 * Fast in-memory cache for server component database calls
 * Prevents redundant overseas Supabase round-trips on hot routes
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const globalCache = new Map<string, CacheEntry<any>>();

export async function fetchWithCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = globalCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const freshData = await fetcher();
    globalCache.set(key, {
      data: freshData,
      expiresAt: now + ttlMs,
    });
    return freshData;
  } catch (error) {
    // If fetch fails but we have stale cache, return stale as fallback
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    globalCache.clear();
    return;
  }
  for (const key of globalCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      globalCache.delete(key);
    }
  }
}
