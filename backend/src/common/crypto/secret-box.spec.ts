import {
  canEncryptSecrets,
  maskSecret,
  openSecret,
  openSecretOrNull,
  sealSecret,
} from './secret-box';

const SECRET = 'a-test-credentials-secret-at-least-32-chars';

describe('secret-box', () => {
  const original = process.env.CREDENTIALS_SECRET;

  beforeEach(() => {
    process.env.CREDENTIALS_SECRET = SECRET;
  });

  afterAll(() => {
    if (original === undefined) delete process.env.CREDENTIALS_SECRET;
    else process.env.CREDENTIALS_SECRET = original;
  });

  it('round-trips a value', () => {
    const sealed = sealSecret('sk-live-abcdef123456');
    expect(openSecret(sealed)).toBe('sk-live-abcdef123456');
  });

  it('never stores the plaintext in the sealed form', () => {
    const sealed = sealSecret('sk-live-abcdef123456');
    expect(sealed).not.toContain('sk-live');
    expect(sealed).not.toContain('abcdef123456');
  });

  it('produces different ciphertext each time for the same input', () => {
    // A fresh nonce per call. Identical ciphertexts would reveal that two
    // organizations had pasted the same key.
    expect(sealSecret('same-key')).not.toBe(sealSecret('same-key'));
  });

  it('carries a version prefix so the algorithm can change later', () => {
    expect(sealSecret('x').startsWith('v1.')).toBe(true);
  });

  it('refuses a tampered ciphertext instead of returning garbage', () => {
    const sealed = sealSecret('sk-live-abcdef123456');
    const parts = sealed.split('.');
    // Flip a character in the ciphertext segment.
    parts[3] = parts[3].slice(0, -1) + (parts[3].slice(-1) === 'A' ? 'B' : 'A');
    expect(() => openSecret(parts.join('.'))).toThrow();
  });

  it('refuses a tampered authentication tag', () => {
    const sealed = sealSecret('sk-live-abcdef123456');
    const parts = sealed.split('.');
    // Swap in the tag from a different sealed value: same length, valid
    // base64url, wrong for this ciphertext.
    parts[2] = sealSecret('something-else').split('.')[2];
    expect(() => openSecret(parts.join('.'))).toThrow();
  });

  it('refuses a value sealed under a different secret', () => {
    const sealed = sealSecret('sk-live-abcdef123456');
    process.env.CREDENTIALS_SECRET = 'a-completely-different-secret-32-chars-min';
    expect(() => openSecret(sealed)).toThrow();
  });

  it('refuses an unrecognised format', () => {
    expect(() => openSecret('not-sealed-at-all')).toThrow(/recognised format/i);
  });

  it('handles unicode and long values', () => {
    const value = 'ключ-🔑-' + 'x'.repeat(400);
    expect(openSecret(sealSecret(value))).toBe(value);
  });

  describe('openSecretOrNull', () => {
    it('returns null rather than throwing on an unreadable value', () => {
      expect(openSecretOrNull('garbage')).toBeNull();
      expect(openSecretOrNull('')).toBeNull();
      expect(openSecretOrNull(null)).toBeNull();
    });

    it('still decrypts a good value', () => {
      expect(openSecretOrNull(sealSecret('ok'))).toBe('ok');
    });
  });

  describe('canEncryptSecrets', () => {
    it('is false when no usable secret is configured', () => {
      delete process.env.CREDENTIALS_SECRET;
      const jwt = process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_ACCESS_SECRET;

      expect(canEncryptSecrets()).toBe(false);

      if (jwt !== undefined) process.env.JWT_ACCESS_SECRET = jwt;
    });

    it('is false for a secret that is too short to be worth using', () => {
      process.env.CREDENTIALS_SECRET = 'short';
      const jwt = process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_ACCESS_SECRET;

      expect(canEncryptSecrets()).toBe(false);

      if (jwt !== undefined) process.env.JWT_ACCESS_SECRET = jwt;
    });

    it('is true with a proper secret', () => {
      expect(canEncryptSecrets()).toBe(true);
    });
  });

  describe('maskSecret', () => {
    it('shows only the last four characters', () => {
      expect(maskSecret('sk-live-abcdef123456')).toBe('••••3456');
    });

    it('hides a short secret entirely', () => {
      // Showing four of six characters would give away most of it.
      expect(maskSecret('abc123')).toBe('••••');
    });

    it('returns empty for no secret', () => {
      expect(maskSecret('')).toBe('');
    });
  });
});
