import { randomUUID } from 'crypto';

/**
 * Generate a cryptographically secure v4 UUID string.
 */
export function generateUuid(): string {
  return randomUUID();
}

/**
 * Validate whether a string is a valid v4 UUID.
 */
export function isValidUuid(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
