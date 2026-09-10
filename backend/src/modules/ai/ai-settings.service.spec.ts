import { AiSettingsService } from './ai-settings.service';
import { openSecret } from '../../common/crypto/secret-box';

const SECRET = 'a-test-credentials-secret-at-least-32-chars';
const ORG = 'org-1';

/** An in-memory stand-in for the Mongoose model, matching the calls used. */
function fakeModel() {
  const rows: Record<string, any> = {};
  const key = (org: string, provider: string) => `${org}::${provider}`;

  return {
    rows,
    findOne: (filter: any) => ({
      lean: () => ({
        catch: () => Promise.resolve(rows[key(filter.organizationId, filter.providerId)] ?? null),
        then: (resolve: any) => resolve(rows[key(filter.organizationId, filter.providerId)] ?? null),
      }),
    }),
    updateOne: async (filter: any, update: any) => {
      const k = key(filter.organizationId, filter.providerId);
      rows[k] = { ...(rows[k] || update.$setOnInsert || {}), ...update.$set };
      return { acknowledged: true };
    },
    deleteOne: async (filter: any) => {
      delete rows[key(filter.organizationId, filter.providerId)];
      return { deletedCount: 1 };
    },
  } as any;
}

describe('AiSettingsService', () => {
  const original = process.env.CREDENTIALS_SECRET;
  let model: ReturnType<typeof fakeModel>;
  let service: AiSettingsService;

  beforeEach(() => {
    process.env.CREDENTIALS_SECRET = SECRET;
    model = fakeModel();
    service = new AiSettingsService(model);
  });

  afterAll(() => {
    if (original === undefined) delete process.env.CREDENTIALS_SECRET;
    else process.env.CREDENTIALS_SECRET = original;
  });

  const envDefaults = { apiKey: 'env-key', model: 'env-model', host: 'https://env.example' };

  it('falls back to the environment when nothing is saved', async () => {
    const resolved = await service.resolve(ORG, 'ollama', envDefaults);

    expect(resolved.apiKey).toBe('env-key');
    expect(resolved.model).toBe('env-model');
    expect(resolved.fromDatabase).toBe(false);
  });

  it('stores the key encrypted, never in plaintext', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-secret-key-1234' }, 'user-1');

    const row = Object.values(model.rows)[0] as any;
    expect(row.apiKeyCipher).not.toContain('ui-secret-key-1234');
    expect(openSecret(row.apiKeyCipher)).toBe('ui-secret-key-1234');
  });

  it('stores a mask that reveals only the last four characters', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-secret-key-1234' }, 'user-1');

    const row = Object.values(model.rows)[0] as any;
    expect(row.apiKeyMasked).toBe('••••1234');
  });

  it('prefers a saved key over the environment', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-key' }, 'user-1');

    const resolved = await service.resolve(ORG, 'ollama', envDefaults);
    expect(resolved.apiKey).toBe('ui-key');
    expect(resolved.fromDatabase).toBe(true);
  });

  it('leaves the stored key alone when the key is omitted', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-key' }, 'user-1');
    // Changing only the model must not require re-typing the credential.
    await service.save(ORG, 'ollama', { model: 'gpt-oss:20b' }, 'user-1');

    const resolved = await service.resolve(ORG, 'ollama', envDefaults);
    expect(resolved.apiKey).toBe('ui-key');
    expect(resolved.model).toBe('gpt-oss:20b');
  });

  it('clears the key on an empty string and falls back again', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-key' }, 'user-1');
    await service.save(ORG, 'ollama', { apiKey: '' }, 'user-1');

    const resolved = await service.resolve(ORG, 'ollama', envDefaults);
    expect(resolved.apiKey).toBe('env-key');
  });

  it('falls back per field rather than all or nothing', async () => {
    await service.save(ORG, 'ollama', { model: 'gpt-oss:20b' }, 'user-1');

    const resolved = await service.resolve(ORG, 'ollama', envDefaults);
    expect(resolved.model).toBe('gpt-oss:20b');
    expect(resolved.host).toBe('https://env.example');
    expect(resolved.apiKey).toBe('env-key');
  });

  it('honours an explicit disable', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-key', enabled: false }, 'user-1');

    expect((await service.resolve(ORG, 'ollama', envDefaults)).enabled).toBe(false);
  });

  it('trims a trailing slash from the host so paths do not double up', async () => {
    await service.save(ORG, 'ollama', { host: 'https://ollama.com/' }, 'user-1');

    expect((await service.resolve(ORG, 'ollama', envDefaults)).host).toBe('https://ollama.com');
  });

  it('keeps organizations apart', async () => {
    await service.save('org-a', 'ollama', { apiKey: 'key-a' }, 'user-1');
    await service.save('org-b', 'ollama', { apiKey: 'key-b' }, 'user-2');

    expect((await service.resolve('org-a', 'ollama', envDefaults)).apiKey).toBe('key-a');
    expect((await service.resolve('org-b', 'ollama', envDefaults)).apiKey).toBe('key-b');
  });

  it('falls back to the environment when a stored key cannot be decrypted', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-key' }, 'user-1');
    // Simulates the encryption secret having been rotated.
    process.env.CREDENTIALS_SECRET = 'a-different-secret-also-32-characters-long';

    const resolved = await service.resolve(ORG, 'ollama', envDefaults);
    expect(resolved.apiKey).toBe('env-key');
  });

  it('refuses to save a key when the server cannot encrypt', async () => {
    delete process.env.CREDENTIALS_SECRET;
    const jwt = process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_ACCESS_SECRET;

    await expect(service.save(ORG, 'ollama', { apiKey: 'ui-key' }, 'user-1')).rejects.toThrow(
      /CREDENTIALS_SECRET/i,
    );

    if (jwt !== undefined) process.env.JWT_ACCESS_SECRET = jwt;
  });

  it('clear() removes the row entirely', async () => {
    await service.save(ORG, 'ollama', { apiKey: 'ui-key', model: 'm' }, 'user-1');
    await service.clear(ORG, 'ollama');

    const resolved = await service.resolve(ORG, 'ollama', envDefaults);
    expect(resolved.fromDatabase).toBe(false);
    expect(resolved.apiKey).toBe('env-key');
  });
});
