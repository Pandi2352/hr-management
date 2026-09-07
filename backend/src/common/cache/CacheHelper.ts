import { Logger } from '@nestjs/common';
import { CacheStatus } from './enum/CacheStatus';
import { CacheTypes } from './enum/CacheTypes';
import { ICacheConfig } from './interfaces/ICacheConfig';
import { ICacheHelper } from './interfaces/ICacheHelper';

/**
 * Null Object for a disabled cache.
 *
 * Every method succeeds and stores nothing, so `CACHE_STATUS=DISABLED` needs no
 * `if (cacheEnabled)` branch at any call site — the code path is identical,
 * every read is simply a miss. That makes "cache off" a supported
 * configuration rather than an untested one.
 */
class DisabledCache implements ICacheHelper {
  async set(): Promise<boolean> {
    return true;
  }
  async get(): Promise<null> {
    return null;
  }
  async getAll(): Promise<null> {
    return null;
  }
  async del(): Promise<boolean> {
    return true;
  }
  async delAll(): Promise<boolean> {
    return true;
  }
  isAvailable(): boolean {
    return false;
  }
  async disconnect(): Promise<void> {
    return;
  }
}

/**
 * Router and singleton owner for the cache backend.
 *
 * One entry point — `CacheHelper.getInstance()` — resolves to Redis, an
 * in-memory Map, or a disabled no-op based on configuration. Callers receive an
 * `ICacheHelper` and never learn which one they got.
 *
 * ```ts
 * const cache = await CacheHelper.getInstance();
 * const hit = await cache.get('auth-user:org-1', userId);
 * ```
 *
 * Backends are loaded with a dynamic `import()` so the Redis driver is never
 * pulled into the process when `CACHE_TYPE=MAP` or the cache is disabled.
 */
export class CacheHelper {
  private static instance: ICacheHelper | null = null;

  /**
   * Resolves the concurrent-first-call race. `getInstance()` is async, so two
   * callers arriving before the first `await` settles would otherwise each
   * construct a backend and the second would silently replace the first —
   * leaking a live Redis connection.
   */
  private static pending: Promise<ICacheHelper> | null = null;

  private static readonly logger = new Logger(CacheHelper.name);

  /**
   * @param config Optional explicit configuration. Omit it to build one from
   *   the environment. Ignored once an instance exists — this is a singleton,
   *   so the first call decides. Use `reset()` to change backends.
   */
  public static async getInstance(config: ICacheConfig | null = null): Promise<ICacheHelper> {
    if (this.instance) return this.instance;
    if (this.pending) return this.pending;

    this.pending = this.create(config)
      .then((instance) => {
        this.instance = instance;
        return instance;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  private static async create(config: ICacheConfig | null): Promise<ICacheHelper> {
    // Checked before any config work: DISABLED must never need a valid config,
    // so the cache can always be switched off to isolate a problem.
    const status = (process.env.CACHE_STATUS || CacheStatus.DISABLED).toUpperCase();
    if (status === CacheStatus.DISABLED) {
      this.logger.log('CACHE_STATUS=DISABLED — cache bypassed, all reads go to the database');
      return new DisabledCache();
    }

    const resolved = config ?? this.getDefaultConfig();
    if (!resolved) {
      throw new Error(
        'Cache is ENABLED but no configuration was resolved. Set CACHE_TYPE to REDIS or MAP, ' +
          'or pass an ICacheConfig to CacheHelper.getInstance().',
      );
    }

    switch (resolved.cacheType) {
      case CacheTypes.REDIS: {
        const { RedisCacheHelper } = await import('./cache/RedisCacheHelper');
        this.logger.log(`Cache backend: REDIS (${this.redact(resolved.redis?.url)})`);
        return new RedisCacheHelper(resolved);
      }
      case CacheTypes.MAP: {
        const { MapCacheHelper } = await import('./cache/MapCacheHelper');
        this.logger.log('Cache backend: MAP (in-memory, process-local — not for multi-instance)');
        return new MapCacheHelper(resolved.maxEntriesPerNamespace);
      }
      default:
        throw new Error(
          `Invalid CACHE_TYPE "${resolved.cacheType}". Expected ${CacheTypes.REDIS} or ${CacheTypes.MAP}.`,
        );
    }
  }

  /** Builds configuration from the environment. */
  private static getDefaultConfig(): ICacheConfig | null {
    const type = (process.env.CACHE_TYPE || '').toUpperCase();

    if (type === CacheTypes.REDIS) {
      const url =
        process.env.REDIS_CONNECTION_STRING ||
        `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;

      return {
        cacheStatus: CacheStatus.ENABLED,
        cacheType: CacheTypes.REDIS,
        redis: {
          url,
          socket: {
            // Opt-in, never defaulted on: local and docker-compose Redis do not
            // terminate TLS, so a hardcoded `true` fails every dev connection.
            tls: process.env.REDIS_TLS === 'true' || url.startsWith('rediss://'),
            host: process.env.REDIS_HOST || undefined,
          },
          // Versioned, so bumping it orphans every entry at once — the release
          // valve when a cached value's shape changes.
          keyPrefix: process.env.CACHE_KEY_PREFIX || 'peopleos:v1:',
        },
      };
    }

    if (type === CacheTypes.MAP) {
      return {
        cacheStatus: CacheStatus.ENABLED,
        cacheType: CacheTypes.MAP,
        maxEntriesPerNamespace: Number(process.env.CACHE_MAX_ENTRIES) || undefined,
      };
    }

    return null;
  }

  /** Keeps a password in a `redis://user:pass@host` URL out of the logs. */
  private static redact(url?: string): string {
    if (!url) return 'no url';
    return url.replace(/\/\/[^@]*@/, '//***@');
  }

  /**
   * Disconnects and clears the singleton.
   *
   * Called on application shutdown, and by tests that need a different backend
   * than the one already resolved.
   */
  public static async reset(): Promise<void> {
    const current = this.instance ?? (this.pending ? await this.pending : null);
    this.instance = null;
    this.pending = null;
    await current?.disconnect();
  }
}
