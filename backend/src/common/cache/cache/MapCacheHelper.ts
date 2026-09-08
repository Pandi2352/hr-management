import { ICacheHelper } from '../interfaces/ICacheHelper';
import { LoggerHelper } from '../../../common/logger';

interface Entry {
  value: string;
  /** Epoch ms, or `null` when the entry never expires. */
  expiresAt: number | null;
}

const DEFAULT_MAX_ENTRIES_PER_NAMESPACE = 5000;
const SWEEP_INTERVAL_MS = 60_000;

/**
 * In-memory backend for development, tests, and single-instance deployments.
 *
 * **Process-local.** Two API instances behind a load balancer each hold their
 * own copy, so an invalidation on one does not reach the other. That makes this
 * unsafe for multi-instance production — anything correctness-sensitive, such
 * as clearing a revoked user's permissions, would go stale on every node but
 * the one that handled the write. Use REDIS there.
 *
 * Values are JSON-serialised exactly as the Redis backend does, so a caller
 * cannot accidentally depend on getting a live object reference back here and
 * then break when switched to Redis.
 */
export class MapCacheHelper implements ICacheHelper {
  private readonly logger = LoggerHelper.Instance.child(MapCacheHelper.name);
  private readonly store = new Map<string, Map<string, Entry>>();
  private readonly maxEntriesPerNamespace: number;
  private readonly sweeper: NodeJS.Timeout;

  constructor(maxEntriesPerNamespace = DEFAULT_MAX_ENTRIES_PER_NAMESPACE) {
    this.maxEntriesPerNamespace = maxEntriesPerNamespace;

    // Expiry is lazy on read, so an untouched key would otherwise sit in memory
    // forever. This reclaims it.
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);

    // Never hold the process open on this timer alone — without unref() the
    // API would not exit on SIGTERM and tests would hang.
    this.sweeper.unref?.();
  }

  isAvailable(): boolean {
    return true;
  }

  private namespaceMap(namespace: string, create = false): Map<string, Entry> | undefined {
    let ns = this.store.get(namespace);
    if (!ns && create) {
      ns = new Map<string, Entry>();
      this.store.set(namespace, ns);
    }
    return ns;
  }

  private isExpired(entry: Entry): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  async set(namespace: string, key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const ns = this.namespaceMap(namespace, true)!;

    // Re-inserting moves the key to the end of Map iteration order, which is
    // what makes the eviction below oldest-first.
    ns.delete(key);
    ns.set(key, {
      value: JSON.stringify(value),
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });

    if (ns.size > this.maxEntriesPerNamespace) {
      const oldest = ns.keys().next().value as string | undefined;
      if (oldest !== undefined) ns.delete(oldest);
    }

    return true;
  }

  async get<T = any>(namespace: string, key: string): Promise<T | null> {
    const entry = this.namespaceMap(namespace)?.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.namespaceMap(namespace)!.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      this.logger.warn(null, 'Discarding unparseable cache entry', { namespace, key });
      this.namespaceMap(namespace)!.delete(key);
      return null;
    }
  }

  async getAll<T = any>(namespace: string): Promise<Record<string, T> | null> {
    const ns = this.namespaceMap(namespace);
    if (!ns || ns.size === 0) return null;

    const out: Record<string, T> = {};
    for (const [key, entry] of ns) {
      if (this.isExpired(entry)) {
        ns.delete(key);
        continue;
      }
      try {
        out[key] = JSON.parse(entry.value) as T;
      } catch {
        ns.delete(key);
      }
    }

    return Object.keys(out).length > 0 ? out : null;
  }

  async del(namespace: string, key: string): Promise<boolean> {
    this.namespaceMap(namespace)?.delete(key);
    return true;
  }

  async delAll(namespace: string): Promise<boolean> {
    this.store.delete(namespace);
    return true;
  }

  /** Drops expired entries and namespaces left empty by them. */
  private sweep(): void {
    for (const [namespace, ns] of this.store) {
      for (const [key, entry] of ns) {
        if (this.isExpired(entry)) ns.delete(key);
      }
      if (ns.size === 0) this.store.delete(namespace);
    }
  }

  async disconnect(): Promise<void> {
    clearInterval(this.sweeper);
    this.store.clear();
  }
}
