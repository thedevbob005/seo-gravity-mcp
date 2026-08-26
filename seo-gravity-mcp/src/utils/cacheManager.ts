import * as crypto from 'crypto';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hash: string;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  public computeKey(namespace: string, input: any): string {
    const serialized = typeof input === 'string' ? input : JSON.stringify(input);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
    return `${namespace}:${hash}`;
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs = 300000): void {
    const hash = crypto.createHash('md5').update(JSON.stringify(value)).digest('hex');
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      hash
    });
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const defaultCacheManager = new CacheManager();
