import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Reversible encryption for credentials the server must be able to use again.
 *
 * Deliberately not hashing. Passwords are hashed because nobody ever needs the
 * original back; a provider API key has to be replayed on every outbound call,
 * so it has to be recoverable. That makes it a secret at rest rather than a
 * verifier, and the requirements are different: it must be unreadable in a
 * database dump, and tampering with the stored bytes must fail loudly rather
 * than silently decrypt to something else.
 *
 * AES-256-GCM covers both. The authentication tag is what turns a modified
 * ciphertext into an error instead of garbage.
 *
 * The stored format is `v1.<iv>.<tag>.<ciphertext>`, all base64url. The version
 * prefix is there so the algorithm can change later without guessing at what
 * old rows contain.
 */

const VERSION = 'v1';
const IV_BYTES = 12; // GCM's standard nonce length.

/**
 * Derives the 32-byte key from whatever secret the deployment has.
 *
 * `CREDENTIALS_SECRET` is preferred. It falls back to the JWT access secret so
 * an existing deployment keeps working without a new variable, which is a
 * compromise: rotating the JWT secret would then make stored keys unreadable.
 * That failure is loud (decryption throws, the provider reports itself
 * unconfigured) rather than silent, and the fix is to re-enter the key.
 */
function deriveKey(): Buffer {
  const secret =
    process.env.CREDENTIALS_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    '';

  if (secret.length < 16) {
    throw new Error(
      'Cannot encrypt credentials: set CREDENTIALS_SECRET (32+ characters) in the environment.',
    );
  }

  // SHA-256 to get exactly 32 bytes from a secret of any length. The input is
  // already high-entropy configuration, not a user password, so a slow KDF
  // would buy nothing here.
  return createHash('sha256').update(secret).digest();
}

/** True when the deployment can encrypt at all. Checked before offering the feature. */
export function canEncryptSecrets(): boolean {
  try {
    deriveKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypts a plaintext secret for storage. */
export function sealSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

/**
 * Decrypts a stored secret.
 *
 * Throws on a wrong key or tampered bytes, which is the point of the auth tag.
 * Callers that would rather degrade than fail should use `openSecretOrNull`.
 */
export function openSecret(sealed: string): string {
  const parts = (sealed || '').split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Stored credential is not in a recognised format.');
  }

  const [, ivPart, tagPart, dataPart] = parts;
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Decrypts, or returns null when the secret cannot be read.
 *
 * A key that will not decrypt should leave the provider looking unconfigured —
 * which the operator can fix by pasting the key again — rather than taking the
 * settings page down with a 500.
 */
export function openSecretOrNull(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  try {
    return openSecret(sealed);
  } catch {
    return null;
  }
}

/**
 * The only representation of a key that may leave the server.
 *
 * Enough for an operator to recognise which key is stored, useless to anyone
 * who intercepts it. Short secrets are masked entirely rather than half-shown.
 */
export function maskSecret(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.length <= 8) return '••••';
  return `••••${plaintext.slice(-4)}`;
}
