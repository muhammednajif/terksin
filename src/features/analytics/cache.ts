interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL = 60_000;

class AnalyticsCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = DEFAULT_TTL): void {
    this.store.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  get expiredCount(): number {
    let count = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      if (now - entry.timestamp > entry.ttl) count++;
    }
    return count;
  }
}

export const analyticsCache = new AnalyticsCache();
