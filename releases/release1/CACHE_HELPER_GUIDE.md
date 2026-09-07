# PeopleOS — Cache Helper Guide

How to use the cache, where to use it, and what Redis is doing underneath.

> **Status:** the helper is **implemented and tested**. No feature code calls it
> yet — §6 lists the intended call sites and is the next piece of work.

---

## 1. What this is

One interface, three interchangeable backends, chosen by environment variable.
Application code never learns which one it got.

| Backend | Use case | Requires |
|---|---|---|
| **REDIS** | Production, and any deployment with more than one API instance | A Redis server |
| **MAP** | Development, tests, single-instance | Nothing — in-process memory |
| **DISABLED** | Bypass the cache to isolate a bug | Nothing — no-op |

`DISABLED` is a **Null Object**, not a special case: every method succeeds and
stores nothing, so there is no `if (cacheEnabled)` branch anywhere. The code
path is identical; every read is simply a miss. That is what makes "cache off" a
supported configuration rather than an untested one.

---

## 2. Files

```
backend/src/common/cache/
  CacheHelper.ts                 the router + singleton — your entry point
  cache.module.ts                lifecycle only (disconnect on shutdown)
  cache.namespaces.ts            namespace builders + TTL constants
  index.ts                       public surface — import from here
  enum/CacheStatus.ts            ENABLED | DISABLED
  enum/CacheTypes.ts             REDIS | MAP
  interfaces/ICacheHelper.ts     the contract every backend implements
  interfaces/ICacheConfig.ts     configuration shape
  cache/RedisCacheHelper.ts      Redis backend (the only file importing the driver)
  cache/MapCacheHelper.ts        in-memory backend
  CacheHelper.spec.ts            25 tests
```

---

## 3. Configuration

```bash
CACHE_STATUS=ENABLED                              # ENABLED | DISABLED (default DISABLED)
CACHE_TYPE=REDIS                                  # REDIS | MAP
REDIS_CONNECTION_STRING=redis://localhost:6379    # or rediss:// for TLS
REDIS_TLS=false                                   # or use a rediss:// URL
CACHE_KEY_PREFIX=peopleos:v1:                     # optional
CACHE_MAX_ENTRIES=5000                            # MAP only, per namespace
```

Two deliberate choices:

- **`CACHE_STATUS` defaults to `DISABLED`.** Caching never switches itself on
  because a variable was forgotten. You opt in.
- **TLS is opt-in.** Your original sketch had `tls: true` hardcoded; that breaks
  every local and docker-compose Redis, none of which terminate TLS. It is now
  driven by `REDIS_TLS=true` or a `rediss://` URL.

Recommended per environment:

| Environment | Setting |
|---|---|
| Local dev, no Docker | `CACHE_STATUS=ENABLED`, `CACHE_TYPE=MAP` |
| Local dev with compose | `CACHE_STATUS=ENABLED`, `CACHE_TYPE=REDIS` |
| Automated tests | `CACHE_STATUS=DISABLED` (already set in `test/setup-env.ts`) |
| Production | `CACHE_STATUS=ENABLED`, `CACHE_TYPE=REDIS` |

---

## 4. How to use it

### 4.1 Getting the instance

```ts
import { CacheHelper, CacheNamespace, CACHE_TTL } from '../../common/cache';

const cache = await CacheHelper.getInstance();
```

It is a lazy singleton: the backend is built on first use, and every later call
returns the same instance. Concurrent first calls are safe — they share one
construction rather than each building a backend and leaking all but the last.

### 4.2 The read-through pattern

This is the shape nearly every call site wants:

```ts
async getDepartmentTree(orgId: string) {
  const cache = await CacheHelper.getInstance();
  const ns = CacheNamespace.departmentTree(orgId);

  const hit = await cache.get<TreeShape>(ns, 'tree');
  if (hit) return hit;

  const tree = await this.buildTreeFromDb(orgId);          // source of truth
  await cache.set(ns, 'tree', tree, CACHE_TTL.DEPARTMENT_TREE);
  return tree;
}
```

On a cache miss, a Redis outage, or `CACHE_STATUS=DISABLED`, `get()` returns
`null` and the database path runs. The method is correct in all three cases.

### 4.3 Invalidating

```ts
// One entry — a single user's cached permissions.
await cache.del(CacheNamespace.authUser(orgId), userId);

// A whole namespace — every careers payload for one organization.
await cache.delAll(CacheNamespace.careers(orgId));
```

### 4.4 The full interface

| Method | Returns | Notes |
|---|---|---|
| `set(ns, key, value, ttlSeconds?)` | `true` stored, `false` backend down | Always pass a TTL |
| `get<T>(ns, key)` | value or `null` | `null` = miss, expiry **or** backend down |
| `getAll<T>(ns)` | `Record<key, T>` or `null` | Every live entry in the namespace |
| `del(ns, key)` | `boolean` | |
| `delAll(ns)` | `boolean` | Primary invalidation tool |
| `isAvailable()` | `boolean` | `false` for DISABLED and a disconnected Redis |
| `disconnect()` | — | Called for you on shutdown |

---

## 5. Rules

**1. Never `await` a cache call you cannot afford to lose.** A cache is an
accelerator, never a source of truth. No method throws — failures return
`null`/`false` — so the database path must always exist behind it.

**2. Always pass a TTL.** Without one an entry lives until something deletes it.
The TTL is the backstop for an invalidation you forgot to write.

**3. Never cache secrets.** Password hashes, tokens, OTPs, reset tokens. Cache an
explicit field allow-list, never a document spread:

```ts
// Wrong — a later .select() change silently leaks passwordHash.
await cache.set(ns, user._id, { ...user.toObject() });

// Right — the shape is stated, so it cannot drift.
await cache.set(ns, user._id, {
  userId: user._id, email: user.email, roles: user.roles,
  permissions: user.permissions, status: user.status,
}, CACHE_TTL.AUTH_USER);
```

This mirrors the rule already enforced on the audit trail, where secrets are
dropped rather than masked.

**4. Build namespaces with `CacheNamespace`, never by hand.** The organization id
is part of the namespace, so a namespace that crosses tenants cannot be built —
every builder demands an org id and throws without one. Hand-written strings
also drift (`auth-user:org1` vs `authUser:org-1`), and then clearing one misses
the other.

**5. Values are JSON.** Cache DTOs and plain objects, not Mongoose documents.
`Date` comes back as an ISO string. The Map backend serialises too, so a caller
cannot depend on getting a live object reference and then break on Redis.

**6. Never import `redis` outside `common/cache/`.** An ESLint
`no-restricted-imports` rule enforces this — verified by writing a violating
file and confirming it errors. It is what keeps the driver swappable.

---

## 6. Where to use it

Priority order, measured against the current code. **None are wired yet.**

### Phase 1 — the two that actually hurt

**6.1 Per-request user lookup.** `auth/strategies/jwt.strategy.ts` `validate()`
runs `userModel.findOne()` on **every authenticated request** — the hottest
query in the app.

- Namespace `CacheNamespace.authUser(orgId)`, key `userId`, TTL 60s.
- **Caveat:** caching auth state means a suspended user could retain access for
  up to the TTL. Acceptable *only* because every mutation below clears the key
  immediately; the TTL is the backstop, not the mechanism.
- Invalidate on: role assignment, permission change, suspend, activate, unlock,
  auto-lock, password reset, password change, logout-all, session termination,
  user delete, and the boot-time permission migration.

**6.2 Department tree.** `employees/employee-scope.service.ts:48`
`expandWithDescendants()` loads **every department in the organization** and
BFS-walks it, on every scoped query — list, detail, stats and export all pay it
(`employees.service.ts:72` and `:94`).

- Namespace `CacheNamespace.departmentTree(orgId)`, key `tree`, TTL 10 min.
- Cache the adjacency map, not the expanded result — one entry then serves every
  user instead of one per user per department set.
- Invalidate on: department create, update, parent change, status change, delete.

### Phase 2

**6.3 Security policy** — `auth.service.ts:74` reads it on every login. TTL 15
min; clear on policy update.

**6.4 Public careers endpoints** — `recruitment.controller.ts:32,38,48`. Public,
unauthenticated, most likely to spike. TTL 5 min; clear on job
create/update/publish/close and company profile update. Cache the **unfiltered**
job list and filter in memory — a key per filter combination is unbounded and
collapses the hit rate.

**6.5 Employee stats** — `employees.service.ts` `getStats()` aggregation behind
the dashboard. TTL 2 min; clear on employee create/update/status/delete.

### Deliberately not cached

| Not cached | Why |
|---|---|
| Sessions / refresh tokens | Rotation and revocation are security-critical; Mongo is the durable truth. An eviction would silently un-revoke a token. |
| `lockedUntil` / lock state | Losing it loses a security control. |
| Audit logs | A compliance record. Serving a stale one is worse than serving a slow one. |
| Employee document contents | Metadata only, if ever. |

---

## 7. Invalidation matrix

The part that gets skipped and causes the bugs. Each row is a test case.

| Mutation | File | Clears |
|---|---|---|
| Assign roles / change permissions | `users.service.ts` | `del(authUser(org), userId)` |
| Suspend / activate / unlock | `users.service.ts` | `del(authUser(org), userId)` |
| Auto-lock on failed logins | `auth.service.ts` | `del(authUser(org), userId)` |
| Password reset / change | `auth.service.ts` | `del(authUser(org), userId)` |
| Logout-all / terminate sessions | `auth.service.ts` | `del(authUser(org), userId)` |
| Delete user | `users.service.ts` | `del(authUser(org), userId)` |
| Permission migration on boot | `users.service.ts` | `delAll(authUser(org))` |
| Department create/update/delete | `organization.service.ts` | `delAll(departmentTree(org))` + `delAll(employeeStats(org))` |
| Department parent change | `organization.service.ts` | `delAll(departmentTree(org))` |
| Security policy update | `users.service.ts` | `delAll(securityPolicy(org))` |
| Job publish/unpublish/update | `recruitment.service.ts` | `delAll(careers(org))` |
| Company profile update | `organization.service.ts` | `del(careers(org), 'company')` |
| Employee create/update/status/delete | `employees.service.ts` | `delAll(employeeStats(org))` |

---

## 8. What Redis is doing underneath

**Storage.** Entries are flat keys, `<prefix><namespace>:<key>`, holding JSON.

**Why not a Redis hash per namespace?** A hash makes `getAll`/`delAll` a single
command, but Redis cannot expire individual hash fields before 7.4 — every entry
in a namespace would share one TTL. Per-entry expiry matters more here: the auth
snapshot (60s) and the department tree (10 min) live in different namespaces but
the same reasoning applies within one. So: flat keys, and `getAll`/`delAll` walk
with **SCAN**.

**SCAN, never KEYS.** `KEYS` blocks the Redis event loop for a full keyspace
walk and stalls every other client on a shared instance. `SCAN` is a cursor walk
in batches of 200.

**Connection.** Lazy — established on first use, so a missing Redis never blocks
boot. Reconnection is automatic with bounded backoff capped at 3s, retrying
indefinitely so a Redis that comes back is picked up without restarting the API.
A `connecting` promise guard stops a burst of first requests opening several
connections.

**Failure handling.** The client's `error` event is handled — an unhandled one
would be an unhandled exception and take the process down. Outages log **once**,
not once per request, and recovery logs too. `del`/`delAll` failures log at
`error` rather than `debug`: a missed invalidation leaves a stale entry serving
wrong data, which is worse than a missed read.

**Shutdown.** `CacheModule` implements `onApplicationShutdown` and calls
`CacheHelper.reset()`, which `quit()`s the client so in-flight commands drain.
Requires `app.enableShutdownHooks()`, already added in `main.ts`.

**Key prefix.** `peopleos:v1:` by default. Bumping the version orphans every
entry at once — the release valve when a cached value's shape changes.

### Map backend

Same interface, `Map<namespace, Map<key, entry>>`. Expiry is lazy on read plus a
60s sweep, so an untouched key is still reclaimed. The sweep timer is `unref()`d
— without that the process would not exit on SIGTERM and tests would hang.
Entries are capped per namespace (default 5000, oldest evicted) so a long-lived
process cannot grow without bound.

**It is process-local.** Two API instances behind a load balancer each hold their
own copy, so an invalidation on one never reaches the other — a revoked user's
permissions would go stale on every node but the one that handled the write. Use
REDIS for anything multi-instance.

---

## 9. Verification performed

- **25 unit tests** — routing, singleton behaviour under concurrent first calls,
  namespace isolation, TTL expiry, `getAll`/`delAll` scoping, oldest-first
  eviction, copy-not-reference semantics, secret safety.
- **Redis backend against a live server** — set/get, `getAll`, tenant isolation,
  `del` leaving siblings, `delAll` scoped to one organization, TTL expiry, clean
  disconnect with no keys left behind.
- **All three configurations boot the real API** (`ENABLED/REDIS`,
  `ENABLED/MAP`, `DISABLED`) — each returns HTTP 200 with zero errors.
- **Existing suites still green:** 35 unit, 22 e2e.
- **Import guard** — a file importing `redis` from `modules/auth` was written,
  confirmed to fail lint, and removed.

---

## 10. Quick reference

```ts
import { CacheHelper, CacheNamespace, CACHE_TTL } from '../../common/cache';

const cache = await CacheHelper.getInstance();
const ns    = CacheNamespace.authUser(orgId);

await cache.set(ns, userId, snapshot, CACHE_TTL.AUTH_USER);
const hit = await cache.get<Snapshot>(ns, userId);
await cache.del(ns, userId);
await cache.delAll(ns);
```
