/**
 * Namespaces and TTLs, in one place.
 *
 * A namespace is what `delAll()` clears, so it defines the invalidation unit.
 * Building them here rather than inline at call sites is what keeps
 * invalidation tractable once a dozen callers exist — otherwise one writer says
 * `auth-user:org1` and another says `authUser:org-1`, and clearing one misses
 * the other.
 *
 * The organization id is part of the namespace, never just part of the value:
 * organization isolation is a hard rule in this codebase, and a namespace that
 * crosses tenants cannot be built when every builder demands the org id.
 */
export const CacheNamespace = {
  /** Auth snapshot read on every authenticated request. Key: userId. */
  authUser: (orgId?: string | null) => ns('auth-user', orgId),

  /** Department parent→children adjacency. Key: 'tree'. */
  departmentTree: (orgId?: string | null) => ns('dept-tree', orgId),

  /** Security policy behind login and password changes. Key: 'policy'. */
  securityPolicy: (orgId?: string | null) => ns('sec-policy', orgId),

  /** Public careers payloads. Key: 'company' | 'jobs' | a job id. */
  careers: (orgId?: string | null) => ns('careers', orgId),

  /** Dashboard aggregations. Key: a scope hash. */
  employeeStats: (orgId?: string | null) => ns('emp-stats', orgId),

  /** Login throttle counters. Not tenant-scoped — an attacker is not in a tenant. */
  throttle: () => 'throttle:global',

  /**
   * Live progress of background quiz generation. Key: the job id.
   *
   * Written every batch and polled every couple of seconds by whoever asked for
   * the quiz, which is the shape a cache is for. Mongo stays the source of
   * truth, so a flush costs one slower poll and never the job itself.
   */
  quizJob: (orgId?: string | null) => ns('quiz-job', orgId),
};

/**
 * Platform-level records genuinely have no organization: the seeded super admin
 * carries no `organizationId`. They share one reserved scope rather than being
 * rejected, so the namespace stays total and callers need no special case.
 */
export const SYSTEM_SCOPE = 'SYSTEM';

/**
 * Segments must not contain the delimiter, or two different logical namespaces
 * could collapse onto the same string.
 */
function ns(prefix: string, orgId: string | undefined | null): string {
  const scope = orgId ? String(orgId).replace(/:/g, '_') : SYSTEM_SCOPE;
  return `${prefix}:${scope}`;
}

/**
 * How long a cached auth snapshot may outlive a revocation that failed to
 * invalidate it. Every revocation path clears the key explicitly, so this is
 * the backstop, not the mechanism.
 *
 * `CACHE_AUTH_TTL=0` disables auth caching outright — the setting to use if
 * zero staleness on permissions is required. Every other cached value is
 * unaffected.
 */
function authUserTtl(): number {
  const raw = process.env.CACHE_AUTH_TTL;
  if (raw === undefined || raw === '') return 60;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 60;
}

/** TTLs in seconds, named so no call site passes an inline number. */
export const CACHE_TTL = {
  get AUTH_USER(): number {
    return authUserTtl();
  },
  DEPARTMENT_TREE: 600,
  SECURITY_POLICY: 900,
  CAREERS: 300,
  EMPLOYEE_STATS: 120,
  /** Long enough to outlive a slow 50-question job by a wide margin. */
  QUIZ_JOB: 3600,
} as const;
