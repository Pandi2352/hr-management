import { CacheHelper } from './CacheHelper';
import { CacheNamespace } from './cache.namespaces';
import { CacheTypes } from './enum/CacheTypes';
import { MapCacheHelper } from './cache/MapCacheHelper';
import { ICacheHelper } from './interfaces/ICacheHelper';

const ORIGINAL_ENV = { ...process.env };

afterEach(async () => {
  await CacheHelper.reset();
  process.env = { ...ORIGINAL_ENV };
});

describe('CacheHelper — routing', () => {
  it('returns the disabled no-op when CACHE_STATUS=DISABLED', async () => {
    process.env.CACHE_STATUS = 'DISABLED';
    process.env.CACHE_TYPE = 'REDIS'; // must be ignored

    const cache = await CacheHelper.getInstance();

    expect(cache.isAvailable()).toBe(false);
    expect(await cache.set('ns', 'k', { a: 1 })).toBe(true);
    expect(await cache.get('ns', 'k')).toBeNull();
  });

  it('defaults to DISABLED when CACHE_STATUS is unset, so nothing turns on by accident', async () => {
    delete process.env.CACHE_STATUS;
    expect((await CacheHelper.getInstance()).isAvailable()).toBe(false);
  });

  it('routes to the Map backend on CACHE_TYPE=MAP', async () => {
    process.env.CACHE_STATUS = 'ENABLED';
    process.env.CACHE_TYPE = 'MAP';

    const cache = await CacheHelper.getInstance();

    expect(cache).toBeInstanceOf(MapCacheHelper);
    expect(cache.isAvailable()).toBe(true);
  });

  it('accepts lower-case env values', async () => {
    process.env.CACHE_STATUS = 'enabled';
    process.env.CACHE_TYPE = 'map';
    expect(await CacheHelper.getInstance()).toBeInstanceOf(MapCacheHelper);
  });

  it('throws when enabled with no resolvable configuration', async () => {
    process.env.CACHE_STATUS = 'ENABLED';
    delete process.env.CACHE_TYPE;

    await expect(CacheHelper.getInstance()).rejects.toThrow(/CACHE_TYPE/);
  });

  it('rejects an unknown cache type', async () => {
    process.env.CACHE_STATUS = 'ENABLED';
    await expect(
      CacheHelper.getInstance({ cacheStatus: 'ENABLED', cacheType: 'MEMCACHED' } as never),
    ).rejects.toThrow(/Invalid CACHE_TYPE/);
  });

  it('returns the same instance on repeated calls', async () => {
    process.env.CACHE_STATUS = 'ENABLED';
    process.env.CACHE_TYPE = 'MAP';

    expect(await CacheHelper.getInstance()).toBe(await CacheHelper.getInstance());
  });

  it('constructs only one backend under concurrent first calls', async () => {
    process.env.CACHE_STATUS = 'ENABLED';
    process.env.CACHE_TYPE = 'MAP';

    // Without the pending-promise guard each of these builds its own backend
    // and all but the last leak.
    const all = await Promise.all(Array.from({ length: 8 }, () => CacheHelper.getInstance()));

    expect(new Set(all).size).toBe(1);
  });

  it('honours an explicit config over the environment', async () => {
    process.env.CACHE_STATUS = 'ENABLED';
    process.env.CACHE_TYPE = 'REDIS';

    const cache = await CacheHelper.getInstance({
      cacheStatus: 'ENABLED' as never,
      cacheType: CacheTypes.MAP,
    });

    expect(cache).toBeInstanceOf(MapCacheHelper);
  });
});

describe('CacheNamespace', () => {
  it('scopes every namespace by organization', () => {
    expect(CacheNamespace.authUser('org-1')).toBe('auth-user:org-1');
    expect(CacheNamespace.authUser('org-1')).not.toBe(CacheNamespace.authUser('org-2'));
  });

  it('neutralises the delimiter so distinct ids cannot collapse together', () => {
    expect(CacheNamespace.authUser('a:b')).toBe('auth-user:a_b');
  });

  it('falls back to a reserved scope for platform records with no organization', () => {
    // The seeded super admin genuinely carries no organizationId, so the
    // builder must stay total rather than throwing on the hottest path.
    expect(CacheNamespace.authUser(undefined)).toBe('auth-user:SYSTEM');
    expect(CacheNamespace.authUser(null)).toBe('auth-user:SYSTEM');
    expect(CacheNamespace.authUser('')).toBe('auth-user:SYSTEM');
  });

  it('keeps the reserved scope distinct from a real organization', () => {
    expect(CacheNamespace.authUser(undefined)).not.toBe(CacheNamespace.authUser('org-1'));
  });
});

/**
 * Behaviour every backend must share. Run against MapCacheHelper here; the same
 * expectations hold for Redis, which is covered by the e2e suite when one is
 * available.
 */
describe('ICacheHelper contract (MapCacheHelper)', () => {
  let cache: ICacheHelper;

  beforeEach(() => {
    cache = new MapCacheHelper();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('round-trips a value', async () => {
    await cache.set('ns', 'k', { name: 'Engineering', count: 3 });
    expect(await cache.get('ns', 'k')).toEqual({ name: 'Engineering', count: 3 });
  });

  it('misses on an unknown key or namespace', async () => {
    expect(await cache.get('ns', 'nope')).toBeNull();
    expect(await cache.get('other', 'k')).toBeNull();
  });

  it('keeps namespaces isolated', async () => {
    await cache.set(CacheNamespace.authUser('org-1'), 'u1', 'A');
    await cache.set(CacheNamespace.authUser('org-2'), 'u1', 'B');

    expect(await cache.get(CacheNamespace.authUser('org-1'), 'u1')).toBe('A');
    expect(await cache.get(CacheNamespace.authUser('org-2'), 'u1')).toBe('B');
  });

  it('expires an entry once its TTL passes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await cache.set('ns', 'k', 'v', 60);

    expect(await cache.get('ns', 'k')).toBe('v');
    jest.setSystemTime(new Date('2026-01-01T00:01:01Z'));
    expect(await cache.get('ns', 'k')).toBeNull();

    jest.useRealTimers();
  });

  it('keeps an entry with no TTL', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await cache.set('ns', 'k', 'v');

    jest.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    expect(await cache.get('ns', 'k')).toBe('v');

    jest.useRealTimers();
  });

  it('getAll returns every live entry, keyed by key', async () => {
    await cache.set('ns', 'a', 1);
    await cache.set('ns', 'b', 2);

    expect(await cache.getAll('ns')).toEqual({ a: 1, b: 2 });
  });

  it('getAll returns null for an empty namespace', async () => {
    expect(await cache.getAll('ns')).toBeNull();
  });

  it('getAll omits expired entries', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await cache.set('ns', 'live', 1, 600);
    await cache.set('ns', 'dead', 2, 30);

    jest.setSystemTime(new Date('2026-01-01T00:01:00Z'));
    expect(await cache.getAll('ns')).toEqual({ live: 1 });

    jest.useRealTimers();
  });

  it('del removes one entry, leaving its siblings', async () => {
    await cache.set('ns', 'a', 1);
    await cache.set('ns', 'b', 2);

    await cache.del('ns', 'a');

    expect(await cache.get('ns', 'a')).toBeNull();
    expect(await cache.get('ns', 'b')).toBe(2);
  });

  it('delAll clears one namespace without touching another', async () => {
    await cache.set(CacheNamespace.careers('org-1'), 'company', 'A');
    await cache.set(CacheNamespace.careers('org-1'), 'jobs', []);
    await cache.set(CacheNamespace.careers('org-2'), 'company', 'B');

    await cache.delAll(CacheNamespace.careers('org-1'));

    expect(await cache.getAll(CacheNamespace.careers('org-1'))).toBeNull();
    expect(await cache.get(CacheNamespace.careers('org-2'), 'company')).toBe('B');
  });

  it('stores a copy, not a reference — so behaviour matches Redis', async () => {
    const value = { roles: ['HR_ADMIN'] };
    await cache.set('ns', 'k', value);

    value.roles.push('SUPER_ADMIN');

    // A caller must not be able to mutate cached state by holding the object.
    expect(await cache.get('ns', 'k')).toEqual({ roles: ['HR_ADMIN'] });
  });

  it('evicts oldest-first at the per-namespace cap', async () => {
    const capped = new MapCacheHelper(3);

    for (const k of ['a', 'b', 'c', 'd']) await capped.set('ns', k, k);

    expect(await capped.get('ns', 'a')).toBeNull();
    expect(await capped.getAll('ns')).toEqual({ b: 'b', c: 'c', d: 'd' });

    await capped.disconnect();
  });

  it('stores exactly the fields given, so an allow-list is the caller contract', async () => {
    await cache.set(CacheNamespace.authUser('org-1'), 'u1', {
      userId: 'u1',
      email: 'a@b.test',
      roles: ['HR_ADMIN'],
    });

    const raw = JSON.stringify(await cache.getAll(CacheNamespace.authUser('org-1')));
    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain('$2b$');
  });
});
