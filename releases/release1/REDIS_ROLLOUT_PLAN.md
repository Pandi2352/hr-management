# PeopleOS — Redis Rollout Plan (Release 1)

Where the cache goes, what it stores, and what clears it.

> **Status: PLAN ONLY. No feature code calls the cache.**
> The helper (`backend/src/common/cache/`) is built and tested — see
> [CACHE_HELPER_GUIDE.md](./CACHE_HELPER_GUIDE.md). This document is the design
> for wiring it in, agreed before any call site is touched.

---

## 1. Method

Every candidate below was found by reading the code, not by guessing at what a
typical app caches. Each names the exact query it removes and the exact
mutations that must clear it.

The bar for caching something here is:

1. it is read far more often than written;
2. it is measurably expensive, or on a per-request path;
3. **every** mutation that can invalidate it is identifiable and finite.

Anything failing (3) is not cached. A cache you cannot invalidate is a bug with
a delay on it.

---

## 2. Summary

| # | Workload | Query removed | TTL | Risk |
|---|---|---|---|---|
| 5.1 | Auth snapshot | 1 `findOne` **per authenticated request** | 60s | Medium — stale permissions |
| 5.2 | Department tree | Full department scan per scoped query | 10 min | Low |
| 5.3 | Security policy | 1 `findOne` per login | 15 min | Low |
| 5.4 | Public careers | 3 public endpoints | 5 min | Low |
| 5.5 | Login throttle | `countDocuments` on the auth path | 15 min | **Must fail closed** |
| 5.6 | Employee stats | Multi-stage aggregation | 2 min | Low |

Phase 1 is 5.1 + 5.2. Phase 2 is 5.3–5.6. Ship each separately.

---

## 3. Two findings that shape the design

**3.1 The super admin has no `organizationId`.** The seeded
`admin@peopleos.internal` carries `roles: ["SUPER_ADMIN","HR_ADMIN"]` and **no
organization**. A namespace builder that demands an org id would throw on the
hottest path in the app for the most privileged account.

Already handled: `CacheNamespace` falls back to a reserved `SYSTEM` scope,
distinct from any real organization. This is the same problem `AuditService`
solved with `resolveOrganizationId()`.

**3.2 Role edits fan out.** Editing a *role's* permissions
(`users.service.ts:551`) changes effective access for every user holding it, but
the mutation touches only the `roles` collection. A per-user invalidation would
miss all of them. These paths need `invalidate.allAuthUsers(orgId)`, not
`invalidate.authUser(...)`. Same for `deleteRole` and the boot-time
`migrateLegacyPermissions()`.

Missing this is the single most likely way this rollout ships a security bug.

---

## 4. Prerequisite

`CACHE_STATUS=ENABLED` and `CACHE_TYPE=REDIS` in any environment running more
than one API instance. **`CACHE_TYPE=MAP` is not safe for multi-instance
deployment** — the Map backend is process-local, so an invalidation on one node
never reaches the others and a revoked user stays active everywhere else.

---

## 5. The workloads

### 5.1 Auth snapshot — the biggest win, and the only risky one

**Now:** `auth/strategies/jwt.strategy.ts` → `validate()` runs
`userModel.findOne({ _id: payload.sub, isDeleted: false })` on **every
authenticated request**. Every list, detail, dashboard poll and export pays it.

**Plan:** namespace `CacheNamespace.authUser(orgId)`, key `userId`,
TTL `CACHE_TTL.AUTH_USER` (60s).

Cache an **explicit allow-list**, never a document spread — a spread starts
carrying `passwordHash` the moment a `.select()` changes:

```ts
{ userId, email, firstName, lastName, roles, permissions,
  departmentScope, organizationId, status }
```

Two details that are easy to get wrong:

- **Store `status` and check it after the read.** Otherwise a suspended user
  passes the guard from cache until the entry expires.
- **Only cache `status === ACTIVE`.** Caching an inactive user re-serves a
  rejection, and a reactivation would not take effect until expiry.

**Staleness:** bounded twice — every path in §6 clears the key immediately, and
the TTL is the backstop for an invalidation that was missed. `CACHE_AUTH_TTL=0`
disables this cache alone, leaving the rest working; that is the setting if zero
staleness on permissions is required.

> **Open decision.** 60s is the proposed window. It only matters if an
> invalidation in §6 is missed. If that is unacceptable, set `CACHE_AUTH_TTL=0`
> and Phase 1 becomes 5.2 alone — still worthwhile on its own.

### 5.2 Department tree — the best risk/reward on the list

**Now:** `employees/employee-scope.service.ts:48` → `expandWithDescendants()`
loads **every department in the organization** (`.find({ organizationId,
isDeleted: false })`) and BFS-walks it. Called from `resolveDepartmentScope()`,
which `employees.service.ts:72` and `:94` hit on list, detail, stats and export.

**Plan:** namespace `CacheNamespace.departmentTree(orgId)`, key `tree`,
TTL 10 min.

Cache the **parent→children adjacency map, not the expanded result**. One entry
then serves every user's expansion; caching expansions would mean one entry per
user per department set.

Low risk: department structure changes rarely, all mutations are in one service,
and being briefly stale shows a manager a department list one edit behind — not
a privilege escalation.

### 5.3 Security policy

**Now:** `auth.service.ts:73` → `getPolicy()` runs `policyModel.findOne()` on
every login, every password change, and the public `/auth/password-policy`
endpoint.

**Plan:** namespace `CacheNamespace.securityPolicy(orgId)`, key `policy`,
TTL 15 min. Clear on `users.service.ts:596` `updateSecurityPolicy()`.

### 5.4 Public careers endpoints

**Now:** `recruitment.controller.ts:32,38,48` — `public/company`, `public/jobs`,
`public/jobs/:id`. Unauthenticated, publicly linkable, most likely to spike, and
the cheapest to cache because the data is already public.

**Plan:** namespace `CacheNamespace.careers(orgId)`, keys `company`, `jobs`, and
the job id. TTL 5 min.

**Cache the unfiltered job list and filter in memory.** The list is filtered by
department, location and free-text search; a key per filter combination is
unbounded and collapses the hit rate.

### 5.5 Login throttle — must fail closed

**Now:** `auth.service.ts:450` counts recent `loginattempts` rows per IP with
`countDocuments` on **every login attempt** — a collection scan on the auth path.

**Plan:** counter under `CacheNamespace.throttle()`, 15-minute window.

Three constraints:

- **Mongo stays the durable record.** `LoginAttempt` rows are still written for
  the login-history UI and forensics. Redis replaces only the *count query*.
- **Fail closed.** If the counter is unavailable the code falls back to the
  existing `countDocuments`. It must never treat "cache down" as "under the
  limit" — that silently disables the throttle.
- **Hash the email into the key.** A throttle key is the one place a plaintext
  address would otherwise sit outside the database.

> The helper's `get`/`set` are not a good fit for an atomic counter (read-modify-
> write races under concurrent attempts). This workload needs an `increment()`
> on `ICacheHelper` backed by Redis `INCR` + `EXPIRE` in one server-side step.
> **That is an additive change to the helper and should be its own commit,
> before 5.5.**

### 5.6 Employee stats

**Now:** `employees.service.ts` → `getStats()`, a multi-stage aggregation behind
the dashboard.

**Plan:** namespace `CacheNamespace.employeeStats(orgId)`, key = a hash of the
caller's department scope (two managers must not share an entry), TTL 2 min.

### 5.7 Deliberately not cached

| Not cached | Why |
|---|---|
| Sessions / refresh tokens | Rotation and revocation are security-critical; Mongo is the durable truth. An eviction would silently un-revoke a token. |
| `lockedUntil` / account lock state | Losing it loses a security control. |
| Audit logs | A compliance record. Serving a stale one is worse than serving a slow one. |
| Employee documents | HR records. Metadata only, if ever. |
| `GET /users` roster | Written nearly as often as read; the invalidation surface is not worth the gain. |

---

## 6. Invalidation matrix

The part that gets skipped and causes the bugs. **Every row is a test case.**

### Auth snapshot — single user

| Mutation | File | Call |
|---|---|---|
| Suspend / activate | `users.service.ts:326` `updateUserStatus` | `invalidate.authUser(user.organizationId, userId)` |
| Unlock | `users.service.ts:352` `unlockUser` | same |
| Assign roles / department scope | `users.service.ts:370` `assignRoles` | same |
| Dispatch password reset | `users.service.ts:441` `sendPasswordReset` | same |
| Terminate sessions | `users.service.ts:459` `terminateSessions` | same |
| Update profile (name) | `users.service.ts:697` `updateProfile` | same |
| Upload / remove avatar | `users.service.ts:613`, `:661` | same |
| Auto-lock on failed logins | `auth.service.ts` ~`:535` lock branch | same |
| Reset password via OTP | `auth.service.ts:188` | same |
| Reset password via token | `auth.service.ts:331` | same |
| Change password | `auth.service.ts:385` | same |
| Logout all | `auth.service.ts:800` `logoutAll` | same |

### Auth snapshot — organization-wide (§3.2)

| Mutation | File | Call |
|---|---|---|
| Edit a role's permissions | `users.service.ts:551` `updateRole` | `invalidate.allAuthUsers(orgId)` |
| Delete a role | `users.service.ts:563` `deleteRole` | same |
| Boot permission migration | `users.service.ts:176` `migrateLegacyPermissions` | same |

### Everything else

| Mutation | File | Call |
|---|---|---|
| Department create / update / delete | `organization.service.ts` | `invalidate.departmentTree(orgId)` + `invalidate.employeeStats(orgId)` |
| Department parent change | `organization.service.ts` `updateParent` | `invalidate.departmentTree(orgId)` |
| Department status change | `organization.service.ts` | `invalidate.departmentTree(orgId)` |
| Security policy update | `users.service.ts:596` | `invalidate.securityPolicy(orgId)` |
| Job create / update / publish / close | `recruitment.service.ts` | `invalidate.careers(orgId)` |
| Company profile update | `organization.service.ts` `updateProfile` | `invalidate.careers(orgId)` |
| Employee create / update / status / delete | `employees.service.ts` | `invalidate.employeeStats(orgId)` |

**Invalidate after the write commits, never before.** Clearing first leaves a
window where a concurrent read repopulates the cache from the pre-write state.

---

## 7. Sequencing

Each step is a separate commit that can be reverted without taking the rest.

| Step | Change | Gate |
|---|---|---|
| 0 | `increment()` on `ICacheHelper` + both backends (needed by 5.5) | Unit tests incl. the fail-closed path |
| 1 | §5.2 department tree + its invalidations | Department-scope e2e still green; new test: a sub-department added mid-session is visible on the next request |
| 2 | §5.1 auth snapshot + **all 15** invalidations in §6 | New e2e: suspend a user → their next request is 401 **immediately**, not after 60s |
| 3 | §5.3 policy, §5.4 careers | TC-MVP-01 lockout passes with cache on and off |
| 4 | §5.5 throttle | Test: with Redis stopped mid-run, lockout still triggers |
| 5 | §5.6 employee stats | Existing suites green |

**Step 1 before step 2 deliberately** — the department tree is the low-risk win.
If something about the cache is wrong operationally, it surfaces there rather
than on the auth path.

---

## 8. Test plan

Beyond the 26 helper tests already passing:

1. **One e2e per row of §6.** Shape: read (populates cache) → mutate → read again
   → assert the new value. These catch the real bugs.
2. **The revocation test that matters:** log in, confirm access, suspend the
   user through the API, assert the very next request is 401 with no wait.
3. **Fan-out test (§3.2):** two users hold a role; edit the role's permissions;
   assert *both* lose the removed permission immediately.
4. **Tenant isolation:** populate org A and org B, `delAll` org A, assert org B
   intact.
5. **Secret safety:** after a request cycle, read the raw Redis value for the
   auth snapshot and assert no `passwordHash`, no `$2b$`, no token field.
6. **Degraded run:** the whole e2e suite with Redis stopped mid-run — every test
   must still pass, only slower.
7. **Existing suites keep running with `CACHE_STATUS=DISABLED`** (already set in
   `test/setup-env.ts`), so acceptance tests continue proving behaviour against
   the source of truth.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Stale permissions after revocation | All 15 invalidations in §6; short TTL as backstop; `CACHE_AUTH_TTL=0` as the escape hatch |
| Role-edit fan-out missed (§3.2) | `allAuthUsers` on the three role paths; test #3 |
| Cross-tenant leakage | Org id is structural in the namespace, not in the value; test #4 |
| MAP backend used in multi-instance | Documented; `CACHE_TYPE=REDIS` required in §4 |
| Throttle silently disabled by an outage | Fail closed to the Mongo count; test #6 |
| Secrets in Redis | Explicit allow-list, never a document spread; test #5 |
| Invalidation before commit | Stated in §6; covered by the read-mutate-read shape |
| Cached shape changes on deploy | Bump `CACHE_KEY_PREFIX` (`peopleos:v1:` → `v2:`); old entries orphan and expire |

---

## 10. What is needed before starting

1. **A decision on §5.1** — is 60s of auth staleness acceptable, or should
   `CACHE_AUTH_TTL=0` ship as the default and Phase 1 be 5.2 alone?
2. **Confirmation that production will run `CACHE_TYPE=REDIS`** (§4).
3. **Approval to add `increment()` to `ICacheHelper`** (step 0) — it is additive
   and breaks nothing, but it changes the interface all three backends implement.
