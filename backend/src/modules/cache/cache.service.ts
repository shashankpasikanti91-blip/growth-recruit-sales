import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Lightweight Redis cache service.
 * Wraps ioredis with get/set/del helpers and a graceful fallback:
 * if Redis is unavailable, cache misses are returned (no crash).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });

    this.client.connect().then(() => {
      this.connected = true;
      this.logger.log('Redis cache connected');
    }).catch((err) => {
      this.logger.warn(`Redis cache not available — running without cache: ${err.message}`);
    });

    this.client.on('error', (err) => {
      if (this.connected) {
        this.logger.warn(`Redis cache error: ${err.message}`);
        this.connected = false;
      }
    });

    this.client.on('connect', () => {
      this.connected = true;
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch { /* best-effort */ }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch { /* best-effort */ }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch { /* best-effort */ }
  }

  /**
   * Get from cache or compute and store.
   * @param key Cache key
   * @param fn Async factory function
   * @param ttlSeconds Cache TTL in seconds
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
