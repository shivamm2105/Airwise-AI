/**
 * AirWise AI — Efficient In-Memory Cache with Stale-While-Revalidate support
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTLMs: number;
  private readonly maxEntries: number;

  constructor(defaultTTLMinutes: number = 15, maxEntries: number = 200) {
    this.defaultTTLMs = defaultTTLMinutes * 60 * 1000;
    this.maxEntries = maxEntries;
  }

  public set<T>(key: string, data: T, customTTLMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest item
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const now = Date.now();
    const ttl = customTTLMs ?? this.defaultTTLMs;
    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttl
    });
  }

  public get<T>(key: string): { data: T; isStale: boolean; ageSeconds: number } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    const isStale = now > entry.expiresAt;
    const ageSeconds = Math.round((now - entry.cachedAt) / 1000);

    return {
      data: entry.data,
      isStale,
      ageSeconds
    };
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const airQualityCache = new CacheService(15, 300);
