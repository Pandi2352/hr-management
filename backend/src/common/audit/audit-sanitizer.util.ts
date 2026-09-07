/**
 * Audit payload sanitization (checklist §5, §7).
 *
 * Two guarantees:
 *  1. Secrets are DROPPED entirely — never stored, not even masked.
 *  2. Sensitive-but-useful identifiers are MASKED so a reviewer can still tell
 *     "the bank account changed" without the value leaking into the log.
 */

/** Dropped outright — a value here must never appear in an audit record. */
const SECRET_KEYS = [
  'password',
  'passwordhash',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'initialpassword',
  'temporarypassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'refreshtokenhash',
  'tokenhash',
  'otp',
  'otphash',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'sessiontoken',
];

/** Retained but masked — presence/change is auditable, the value is not. */
const MASKED_KEYS = [
  'accountnumber',
  'bankaccountnumber',
  'ifsc',
  'routingnumber',
  'swift',
  'iban',
  'ssn',
  'nationalid',
  'aadhaar',
  'pan',
  'taxid',
  'passportnumber',
  'drivinglicense',
  'salary',
  'basesalary',
  'ctc',
  'grosssalary',
];

const MAX_DEPTH = 6;
/** Guards against a runaway payload bloating the audit collection. */
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 2000;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSecret(key: string): boolean {
  const k = normalizeKey(key);
  return SECRET_KEYS.some((secret) => k === secret || k.includes(secret));
}

function isMasked(key: string): boolean {
  const k = normalizeKey(key);
  return MASKED_KEYS.some((masked) => k === masked || k.includes(masked));
}

/** `••••••••1234` — keeps the last 4 characters for reconciliation. */
function maskValue(value: unknown): string {
  const str = String(value ?? '');
  if (str.length <= 4) return '••••';
  return `••••••••${str.slice(-4)}`;
}

/**
 * Recursively strips secrets and masks sensitive fields.
 * Mongoose documents are converted via toObject/toJSON before traversal.
 */
export function sanitizeAuditValue(input: unknown, depth = 0): any {
  if (input === null || input === undefined) return input;
  if (depth > MAX_DEPTH) return '[max depth reached]';

  if (input instanceof Date) return input.toISOString();

  const primitive = typeof input;
  if (primitive === 'string') {
    const str = input as string;
    return str.length > MAX_STRING_LENGTH ? `${str.slice(0, MAX_STRING_LENGTH)}…[truncated]` : str;
  }
  if (primitive === 'number' || primitive === 'boolean') return input;
  if (primitive === 'function' || primitive === 'symbol') return undefined;

  if (Array.isArray(input)) {
    const items = input.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeAuditValue(item, depth + 1));
    if (input.length > MAX_ARRAY_ITEMS) {
      items.push(`…and ${input.length - MAX_ARRAY_ITEMS} more`);
    }
    return items;
  }

  if (primitive === 'object') {
    // Unwrap Mongoose documents so we traverse plain data, not internals.
    const source: any =
      typeof (input as any).toObject === 'function'
        ? (input as any).toObject()
        : typeof (input as any).toJSON === 'function'
          ? (input as any).toJSON()
          : input;

    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(source)) {
      if (key === '__v' || key === 'passwordHash') continue;
      if (isSecret(key)) continue; // dropped, never recorded
      if (isMasked(key)) {
        out[key] = value === null || value === undefined ? value : maskValue(value);
        continue;
      }
      const sanitized = sanitizeAuditValue(value, depth + 1);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }

  return undefined;
}

/**
 * Reduces a before/after pair to only the fields that actually changed
 * (checklist §5: "capture only changed fields, don't store entire objects").
 * Returns null when nothing changed.
 */
export function diffAuditValues(
  before: unknown,
  after: unknown,
): { oldValue: Record<string, any>; newValue: Record<string, any> } | null {
  const cleanBefore = sanitizeAuditValue(before);
  const cleanAfter = sanitizeAuditValue(after);

  const isPlainObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v);

  // Creates and deletes have only one side — record it whole.
  if (!isPlainObject(cleanBefore) || !isPlainObject(cleanAfter)) {
    return {
      oldValue: isPlainObject(cleanBefore) ? cleanBefore : cleanBefore ?? null,
      newValue: isPlainObject(cleanAfter) ? cleanAfter : cleanAfter ?? null,
    };
  }

  const ignored = new Set(['updatedAt', 'createdAt', '_id', '__v']);
  const oldValue: Record<string, any> = {};
  const newValue: Record<string, any> = {};

  const keys = new Set([...Object.keys(cleanBefore), ...Object.keys(cleanAfter)]);
  for (const key of keys) {
    if (ignored.has(key)) continue;
    const a = cleanBefore[key];
    const b = cleanAfter[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      oldValue[key] = a ?? null;
      newValue[key] = b ?? null;
    }
  }

  if (Object.keys(newValue).length === 0 && Object.keys(oldValue).length === 0) {
    return null;
  }

  return { oldValue, newValue };
}
