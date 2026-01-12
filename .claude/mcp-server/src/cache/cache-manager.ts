/**
 * Cache Manager for MCP Tools
 *
 * Provides TTL-based caching to reduce redundant processing
 */

import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number; // in milliseconds
  cleanupInterval?: number; // in milliseconds
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private hits = 0;
  private misses = 0;
  private maxSize: number;
  private defaultTTL: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTTL = options.defaultTTL ?? 5 * 60 * 1000; // 5 minutes default

    // Start cleanup timer
    const cleanupInterval = options.cleanupInterval ?? 60 * 1000; // 1 minute
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);

    logger.debug('Cache manager initialized', {
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
    });
  }

  /**
   * Generate a cache key from input data
   */
  static generateKey(data: any): string {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return createHash('sha256').update(serialized).digest('hex').substring(0, 16);
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    entry.hits++;
    this.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + (ttl ?? this.defaultTTL),
      createdAt: now,
      hits: 0,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get or compute a value
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      logger.debug('Cache hit', { key: key.substring(0, 8) });
      return cached;
    }

    logger.debug('Cache miss, computing', { key: key.substring(0, 8) });
    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup', { removed, remaining: this.cache.size });
    }
  }

  /**
   * Evict oldest entries to make room
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Remove oldest 10%
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    logger.debug('Cache eviction', { evicted: toRemove, remaining: this.cache.size });
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Global cache instances for each tool type
export const factCache = new CacheManager({ maxSize: 500, defaultTTL: 10 * 60 * 1000 });
export const entityCache = new CacheManager({ maxSize: 500, defaultTTL: 10 * 60 * 1000 });
export const citationCache = new CacheManager({ maxSize: 200, defaultTTL: 30 * 60 * 1000 });
export const sourceRatingCache = new CacheManager({ maxSize: 1000, defaultTTL: 60 * 60 * 1000 });
export const conflictCache = new CacheManager({ maxSize: 200, defaultTTL: 5 * 60 * 1000 });
