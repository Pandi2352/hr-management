import { CacheStatus } from '../enum/CacheStatus';
import { CacheTypes } from '../enum/CacheTypes';

/** node-redis connection options, narrowed to what this helper needs. */
export interface IRedisConfig {
  /** `redis://host:port` or `rediss://…` for TLS. */
  url: string;

  socket?: {
    /**
     * TLS is opt-in. Defaulting it to `true` breaks every local and
     * docker-compose Redis, which do not terminate TLS — set it from the
     * `rediss://` URL scheme or `REDIS_TLS=true`.
     */
    tls?: boolean;
    host?: string;
    /** Bounded backoff. Returning an Error stops retrying. */
    reconnectStrategy?: (retries: number) => number | Error;
  };

  /** Applied to every key, so one Redis can be shared between services. */
  keyPrefix?: string;
}

export interface ICacheConfig {
  cacheStatus: CacheStatus;
  cacheType: CacheTypes;

  /** Required when `cacheType` is REDIS; ignored otherwise. */
  redis?: IRedisConfig;

  /**
   * MAP only. Caps entries per namespace so a long-lived process cannot grow
   * without bound; the oldest entry is evicted at the limit.
   */
  maxEntriesPerNamespace?: number;
}
