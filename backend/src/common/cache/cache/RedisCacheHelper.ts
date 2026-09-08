import { createClient, RedisClientType } from 'redis';
import { ICacheConfig } from '../interfaces/ICacheConfig';
import { ICacheHelper } from '../interfaces/ICacheHelper';
import { LoggerHelper } from '../../../common/logger';

/**
 * Redis backend — production, and the only one that works across more than one
 * process.
 *
 * This is the only file in the codebase permitted to import the Redis driver;
 * an ESLint `no-restricted-imports` rule enforces it. That is what keeps the
 * client swappable and the cache removable.
 *
 * ### Why flat `namespace:key` rather than a Redis hash
 *
 * A hash makes `getAll`/`delAll` a single O(1)-to-find command, but Redis
 * cannot expire individual hash fields before 7.4, so every entry in a
 * namespace would share one TTL. Per-entry expiry matters more here — the auth
 * snapshot and the department tree need very different lifetimes — so entries
 * are flat keys and `getAll`/`delAll` use SCAN.
 *
 * SCAN, never KEYS: `KEYS` blocks the Redis event loop for a full keyspace
 * walk and stalls every other client on a shared instance.
 */
export class RedisCacheHelper implements ICacheHelper {
  private readonly logger = LoggerHelper.Instance.child(RedisCacheHelper.name);
  private readonly client: RedisClientType;
  private readonly keyPrefix: string;

  /** Guards against a thundering herd of parallel connects on first use. */
  private connecting: Promise<void> | null = null;
  private ready = false;

  /** Latched so an outage logs once, not once per request. */
  private warned = false;

  constructor(config: ICacheConfig) {
    if (!config.redis?.url) {
      throw new Error('RedisCacheHelper requires redis.url in the cache configuration.');
    }

    this.keyPrefix = config.redis.keyPrefix ?? '';

    const socketBase = {
      ...(config.redis.socket?.host ? { host: config.redis.socket.host } : {}),
      connectTimeout: 3000,
      reconnectStrategy:
        config.redis.socket?.reconnectStrategy ??
        // Bounded backoff, capped at 3s, retrying indefinitely so a Redis that
        // comes back is picked up without restarting the API.
        ((retries: number) => Math.min(retries * 200, 3000)),
    };

    // node-redis types `socket` as a union whose TLS arm requires the literal
    // `tls: true`, so the two shapes are built separately rather than spreading
    // an optional boolean — which would widen to `boolean` and not match.
    this.client = createClient({
      url: config.redis.url,
      socket: config.redis.socket?.tls ? { ...socketBase, tls: true } : socketBase,
    }) as RedisClientType;

    // An unhandled 'error' on the client is an unhandled exception that would
    // take the process down. A cache failure must never do that.
    this.client.on('error', (err: Error) => {
      this.ready = false;
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(null, 'Cache unavailable, serving uncached reads', err);
      }
    });

    this.client.on('ready', () => {
      this.ready = true;
      if (this.warned) {
        this.warned = false;
        this.logger.info(null, 'Cache available again');
      }
    });

    // Lazy: connection is established on first use, so a missing Redis never
    // blocks application boot.
    void this.ensureConnected();
  }

  isAvailable(): boolean {
    return this.ready;
  }

  private async ensureConnected(): Promise<void> {
    if (this.ready) return;
    if (this.connecting) return this.connecting;

    this.connecting = this.client
      .connect()
      .then(() => {
        this.ready = true;
      })
      .catch((err: Error) => {
        // Swallowed deliberately: reconnectStrategy keeps trying in the
        // background while every call falls through to the database.
        if (!this.warned) {
          this.warned = true;
          this.logger.warn(null, 'Redis unreachable, serving uncached reads', err);
        }
      })
      .finally(() => {
        this.connecting = null;
      });

    return this.connecting;
  }

  private buildKey(namespace: string, key: string): string {
    return `${this.keyPrefix}${namespace}:${key}`;
  }

  private pattern(namespace: string): string {
    return `${this.keyPrefix}${namespace}:*`;
  }

  async set(namespace: string, key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    await this.ensureConnected();
    if (!this.ready) return false;

    try {
      const payload = JSON.stringify(value);
      const redisKey = this.buildKey(namespace, key);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(redisKey, payload, { EX: ttlSeconds });
      } else {
        await this.client.set(redisKey, payload);
      }
      return true;
    } catch (err) {
      this.logger.debug(null, 'Cache set failed', { namespace, key, reason: (err as Error).message });
      return false;
    }
  }

  async get<T = any>(namespace: string, key: string): Promise<T | null> {
    await this.ensureConnected();
    if (!this.ready) return null;

    try {
      // node-redis v6 widens replies for RESP3; these commands return strings.
      const raw = (await this.client.get(this.buildKey(namespace, key))) as string | null;
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (err) {
      // A malformed entry must not poison the caller: drop it and report a miss.
      if (err instanceof SyntaxError) {
        this.logger.warn(null, 'Discarding unparseable cache entry', { namespace, key });
        void this.del(namespace, key);
        return null;
      }
      this.logger.debug(null, 'Cache get failed', { namespace, key, reason: (err as Error).message });
      return null;
    }
  }

  async getAll<T = any>(namespace: string): Promise<Record<string, T> | null> {
    await this.ensureConnected();
    if (!this.ready) return null;

    try {
      const keys = await this.scanKeys(this.pattern(namespace));
      if (keys.length === 0) return null;

      const values = (await this.client.mGet(keys)) as (string | null)[];
      const prefixLength = `${this.keyPrefix}${namespace}:`.length;
      const out: Record<string, T> = {};

      keys.forEach((fullKey, i) => {
        const raw = values[i];
        if (raw === null || raw === undefined) return; // expired between SCAN and MGET
        try {
          out[fullKey.slice(prefixLength)] = JSON.parse(raw) as T;
        } catch {
          // One bad entry must not fail the whole namespace read.
        }
      });

      return Object.keys(out).length > 0 ? out : null;
    } catch (err) {
      this.logger.debug(null, 'Cache getAll failed', { namespace, reason: (err as Error).message });
      return null;
    }
  }

  async del(namespace: string, key: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.ready) return false;

    try {
      await this.client.unlink(this.buildKey(namespace, key));
      return true;
    } catch (err) {
      // Logged at error, not debug: a missed delete leaves a stale entry
      // serving wrong data, which is worse than a missed read.
      // Logged with fields so a spike in failed invalidations is countable.
      this.logger.error(null, 'Cache invalidation failed; entry may serve stale data', {
        namespace,
        key,
        reason: (err as Error).message,
      });
      return false;
    }
  }

  async delAll(namespace: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.ready) return false;

    try {
      const keys = await this.scanKeys(this.pattern(namespace));
      if (keys.length > 0) await this.client.unlink(keys);
      return true;
    } catch (err) {
      this.logger.error(null, 'Namespace invalidation failed; entries may serve stale data', {
        namespace,
        reason: (err as Error).message,
      });
      return false;
    }
  }

  /** Cursor walk in batches; never blocks the Redis event loop. */
  private async scanKeys(pattern: string): Promise<string[]> {
    const found: string[] = [];
    let cursor = '0';

    do {
      const reply = await this.client.scan(cursor, { MATCH: pattern, COUNT: 200 });
      cursor = String(reply.cursor);
      found.push(...reply.keys);
    } while (cursor !== '0');

    return found;
  }

  async disconnect(): Promise<void> {
    this.ready = false;
    try {
      // Drains in-flight commands, unlike destroy().
      if (this.client.isOpen) await this.client.quit();
    } catch {
      this.client.destroy();
    }
  }
}
