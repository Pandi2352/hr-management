/**
 * Public surface of the cache module.
 *
 * Application code imports from here and nothing deeper. In particular it never
 * imports `redis` — an ESLint `no-restricted-imports` rule enforces that, which
 * is what keeps the driver swappable and the cache removable.
 */
export { CacheHelper } from './CacheHelper';
export { CacheModule } from './cache.module';
export { CacheStatus } from './enum/CacheStatus';
export { CacheTypes } from './enum/CacheTypes';
export type { ICacheHelper } from './interfaces/ICacheHelper';
export type { ICacheConfig, IRedisConfig } from './interfaces/ICacheConfig';
export { CacheNamespace, CACHE_TTL, SYSTEM_SCOPE } from './cache.namespaces';
export { invalidate } from './cache.invalidate';
