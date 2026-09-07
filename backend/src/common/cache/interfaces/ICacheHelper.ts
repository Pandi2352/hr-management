/**
 * The single contract every cache backend implements.
 *
 * Callers depend on this interface and nothing else — that is what lets Redis,
 * an in-memory Map, and a disabled no-op be swapped by configuration without a
 * line of application code changing.
 *
 * Keys are addressed as `(namespace, key)` rather than one flat string so a
 * whole group can be read or invalidated together. Use the namespace for the
 * *kind* of thing plus its tenant — `auth-user:<orgId>` — so `delAll()` can
 * clear one organization without touching another.
 *
 * ## Rules every implementation honours
 *
 * - **Never throws.** A cache is an accelerator, not a source of truth. A
 *   backend failure returns `null`/`false`; the caller falls through to the
 *   database and the request still succeeds.
 * - **JSON round-trip.** Values are serialised, so cache DTOs and plain
 *   objects — not Mongoose documents. `Date` comes back as an ISO string.
 * - **Never store secrets.** Password hashes, tokens, OTPs and reset tokens
 *   must not be written here. Cache an explicit field allow-list rather than
 *   spreading a document, so a later `.select()` change cannot leak one in.
 */
export interface ICacheHelper {
  /**
   * Stores a value. `ttlSeconds` omitted means the entry lives until it is
   * deleted or evicted — prefer passing one.
   *
   * @returns `true` when stored, `false` when the backend was unavailable.
   */
  set(namespace: string, key: string, value: any, ttlSeconds?: number): Promise<boolean>;

  /** @returns the value, or `null` on a miss, an expiry, or a backend failure. */
  get<T = any>(namespace: string, key: string): Promise<T | null>;

  /**
   * Every live entry in a namespace, keyed by its key.
   *
   * @returns `null` when the namespace is empty or the backend is unavailable.
   */
  getAll<T = any>(namespace: string): Promise<Record<string, T> | null>;

  del(namespace: string, key: string): Promise<boolean>;

  /** Clears an entire namespace. The primary invalidation tool. */
  delAll(namespace: string): Promise<boolean>;

  /** `true` when the backend is connected and serving. */
  isAvailable(): boolean;

  /** Releases resources. Called on application shutdown. */
  disconnect(): Promise<void>;
}
