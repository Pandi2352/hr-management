import { CacheHelper } from './CacheHelper';
import { CacheNamespace } from './cache.namespaces';

/**
 * One-line invalidation for call sites.
 *
 * Every mutation that can make a cached value wrong calls exactly one of these.
 * Keeping them here rather than inline means the full set of invalidations is
 * greppable in one file — which is what makes a cache maintainable once a dozen
 * writers exist.
 *
 * None of these throw. A cache failure must never turn a successful write into
 * a failed request; `CacheHelper` already logs a failed delete at `error`
 * because a missed invalidation leaves stale data behind.
 */
export const invalidate = {
  /** One user's auth snapshot. Call on every path that revokes or changes access. */
  async authUser(orgId: string | undefined | null, userId: string): Promise<void> {
    await run((c) => c.del(CacheNamespace.authUser(orgId), userId));
  },

  /**
   * Every auth snapshot in an organization. For changes that alter many users
   * at once — editing a role's permissions, the boot-time migration.
   */
  async allAuthUsers(orgId: string | undefined | null): Promise<void> {
    await run((c) => c.delAll(CacheNamespace.authUser(orgId)));
  },

  async departmentTree(orgId: string | undefined | null): Promise<void> {
    await run((c) => c.delAll(CacheNamespace.departmentTree(orgId)));
  },

  async securityPolicy(orgId: string | undefined | null): Promise<void> {
    await run((c) => c.delAll(CacheNamespace.securityPolicy(orgId)));
  },

  async careers(orgId: string | undefined | null): Promise<void> {
    await run((c) => c.delAll(CacheNamespace.careers(orgId)));
  },

  async employeeStats(orgId: string | undefined | null): Promise<void> {
    await run((c) => c.delAll(CacheNamespace.employeeStats(orgId)));
  },
};

async function run(fn: (cache: Awaited<ReturnType<typeof CacheHelper.getInstance>>) => Promise<unknown>) {
  try {
    const cache = await CacheHelper.getInstance();
    await fn(cache);
  } catch {
    // Swallowed by design: CacheHelper logs its own failures, and a mutation
    // must not fail because the cache could not be cleaned up.
  }
}
