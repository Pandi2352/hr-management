import { ConfigService } from '@nestjs/config';
import { OllamaProvider } from './ollama.provider';
import { ollamaConfig } from '../config/ollama.config';

/** A ConfigService backed by a plain object, honouring defaults like the real one. */
function configWith(env: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: string) => (key in env ? env[key] : fallback),
  } as unknown as ConfigService;
}

const CLOUD = { OLLAMA_API_KEY: 'test-key', OLLAMA_HOST: 'https://ollama.com' };

/** Captures fetch calls and replays queued responses. */
function mockFetch(responses: Array<Partial<Response> & { jsonBody?: unknown }>) {
  const calls: { url: string; init: RequestInit }[] = [];
  let i = 0;
  const fn = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      json: async () => next.jsonBody,
      text: async () => (typeof next.jsonBody === 'string' ? next.jsonBody : JSON.stringify(next.jsonBody ?? '')),
    } as unknown as Response;
  });
  (global as any).fetch = fn;
  return { calls };
}

describe('ollamaConfig', () => {
  it('treats ollama.com as cloud and requires a key', () => {
    expect(ollamaConfig(configWith({ OLLAMA_HOST: 'https://ollama.com' })).enabled).toBe(false);
    expect(ollamaConfig(configWith(CLOUD)).enabled).toBe(true);
    expect(ollamaConfig(configWith(CLOUD)).isCloud).toBe(true);
  });

  it('treats localhost as self-hosted and needs no key', () => {
    const cfg = ollamaConfig(configWith({ OLLAMA_HOST: 'http://localhost:11434' }));
    expect(cfg.isCloud).toBe(false);
    expect(cfg.enabled).toBe(true);
  });

  it('treats any other host as needing a key', () => {
    // A private deployment behind a domain should be asked for credentials
    // rather than silently going out unauthenticated.
    const cfg = ollamaConfig(configWith({ OLLAMA_HOST: 'https://ollama.internal.acme.com' }));
    expect(cfg.isCloud).toBe(true);
    expect(cfg.enabled).toBe(false);
  });

  it('honours an explicit disable even with a key present', () => {
    expect(ollamaConfig(configWith({ ...CLOUD, OLLAMA_ENABLED: 'false' })).enabled).toBe(false);
  });

  it('defaults to the documented cloud model', () => {
    expect(ollamaConfig(configWith(CLOUD)).model).toBe('gpt-oss:120b');
  });

  it('never exposes the key through hasApiKey alone', () => {
    const cfg = ollamaConfig(configWith(CLOUD));
    expect(cfg.hasApiKey).toBe(true);
    expect(cfg.apiKey).toBe('test-key');
  });
});

describe('OllamaProvider', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    (global as any).fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('reports itself unconfigured when the cloud key is missing', () => {
    const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'https://ollama.com' }));
    expect(provider.isConfigured()).toBe(false);
    expect(provider.configurationHint()).toMatch(/API key/i);
  });

  it('has one stable name, and describes the host in its hint', () => {
    // The name no longer encodes cloud vs self-hosted: the host can be changed
    // per organization from the settings page, so a name fixed at construction
    // would be wrong for everyone but the first.
    expect(new OllamaProvider(configWith(CLOUD)).displayName).toBe('Ollama');
    expect(new OllamaProvider(configWith({ OLLAMA_HOST: 'http://localhost:11434' })).displayName).toBe(
      'Ollama',
    );
    expect(
      new OllamaProvider(configWith({ OLLAMA_HOST: 'http://localhost:11434' })).configurationHint(),
    ).toMatch(/ollama serve/i);
  });

  it('sends the bearer token and turns streaming off', async () => {
    const { calls } = mockFetch([{ jsonBody: { message: { content: 'Hello there.' } } }]);
    const provider = new OllamaProvider(configWith(CLOUD));

    const answer = await provider.chat('You are helpful.', 'Hi');

    expect(answer).toBe('Hello there.');
    expect(calls[0].url).toBe('https://ollama.com/api/chat');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.stream).toBe(false);
    expect(body.model).toBe('gpt-oss:120b');
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('sends no Authorization header to a local server', async () => {
    const { calls } = mockFetch([{ jsonBody: { message: { content: 'Local reply.' } } }]);
    const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'http://localhost:11434' }));

    await provider.chat('sys', 'user');

    expect((calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('strips a model reasoning block out of a chat reply', async () => {
    mockFetch([{ jsonBody: { message: { content: '<think>hmm</think>The answer is 42.' } } }]);
    const provider = new OllamaProvider(configWith(CLOUD));

    expect(await provider.chat('sys', 'user')).toBe('The answer is 42.');
  });





  it('explains a rejected API key rather than leaking the status alone', async () => {
    mockFetch([{ ok: false, status: 401, jsonBody: 'unauthorized' }]);
    const provider = new OllamaProvider(configWith(CLOUD));

    await expect(provider.chat('sys', 'user')).rejects.toThrow(
      /rejected the API key \(401\).*key you saved/is,
    );
  });

  it('explains a missing model', async () => {
    mockFetch([{ ok: false, status: 404, jsonBody: 'model not found' }]);
    const provider = new OllamaProvider(configWith(CLOUD));

    await expect(provider.chat('sys', 'user')).rejects.toThrow(/does not have model "gpt-oss:120b"/i);
  });

  it('explains rate limiting', async () => {
    mockFetch([{ ok: false, status: 429, jsonBody: 'slow down' }]);
    const provider = new OllamaProvider(configWith(CLOUD));

    await expect(provider.chat('sys', 'user')).rejects.toThrow(/rate limiting/i);
  });

  it('surfaces an error carried inside a 200 response', async () => {
    // Ollama answers 200 with an `error` field when a model is not pulled.
    mockFetch([{ jsonBody: { error: 'model "llama9" not found, try pulling it first' } }]);
    const provider = new OllamaProvider(configWith(CLOUD));

    await expect(provider.chat('sys', 'user')).rejects.toThrow(/not found, try pulling/i);
  });

  it('rejects an empty reply instead of returning an empty string', async () => {
    mockFetch([{ jsonBody: { message: { content: '   ' } } }]);
    const provider = new OllamaProvider(configWith(CLOUD));

    await expect(provider.chat('sys', 'user')).rejects.toThrow(/empty reply/i);
  });

  it('refuses to call out at all when unconfigured', async () => {
    const fetchSpy = jest.fn();
    (global as any).fetch = fetchSpy;
    const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'https://ollama.com' }));

    await expect(provider.chat('sys', 'user')).rejects.toThrow(/not configured/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('settings overrides', () => {
    it('uses a key supplied per call rather than the environment', async () => {
      const { calls } = mockFetch([{ jsonBody: { message: { content: 'ok' } } }]);
      // No environment key at all: the provider is only usable via the override.
      const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'https://ollama.com' }));

      expect(provider.isConfigured()).toBe(false);
      expect(provider.isConfigured({ apiKey: 'from-ui' })).toBe(true);

      await provider.chat('sys', 'user', { apiKey: 'from-ui' });
      expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer from-ui');
    });

    it('uses a model supplied per call', async () => {
      const { calls } = mockFetch([{ jsonBody: { message: { content: 'ok' } } }]);
      const provider = new OllamaProvider(configWith(CLOUD));

      await provider.chat('sys', 'user', { apiKey: 'k', model: 'nemotron-3-super' });

      expect(JSON.parse(calls[0].init.body as string).model).toBe('nemotron-3-super');
      expect(provider.modelLabel({ model: 'nemotron-3-super' })).toBe('nemotron-3-super');
    });

    it('switches to the self-hosted probe when the host is overridden', async () => {
      const { calls } = mockFetch([{ jsonBody: { models: [{ name: 'gpt-oss:120b' }] } }]);
      const provider = new OllamaProvider(configWith(CLOUD));

      await provider.test({ host: 'http://localhost:11434' });

      expect(calls[0].url).toBe('http://localhost:11434/api/tags');
    });

    it('honours an explicit disable even with a valid key', () => {
      const provider = new OllamaProvider(configWith(CLOUD));
      expect(provider.isConfigured({ apiKey: 'k', enabled: false })).toBe(false);
    });

    it('does not leak one call\'s key into the next', async () => {
      const { calls } = mockFetch([
        { jsonBody: { message: { content: 'a' } } },
        { jsonBody: { message: { content: 'b' } } },
      ]);
      const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'https://ollama.com' }));

      await provider.chat('sys', 'one', { apiKey: 'tenant-a' });
      await provider.chat('sys', 'two', { apiKey: 'tenant-b' });

      expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tenant-a');
      expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer tenant-b');
    });
  });

  describe('test()', () => {
    it('never throws when the host is unreachable', async () => {
      (global as any).fetch = jest.fn(async () => {
        throw new Error('fetch failed');
      });
      const provider = new OllamaProvider(configWith(CLOUD));

      const result = await provider.test();
      expect(result.ok).toBe(false);
      expect(result.detail).toMatch(/cannot reach/i);
    });

    it('probes the cloud with a capped generation, not the model list', async () => {
      // /api/tags on ollama.com answers without checking the token, so testing
      // an invalid key there reported success. The cloud must be probed with a
      // call that actually spends the credential.
      const { calls } = mockFetch([{ jsonBody: { message: { content: 'p' } } }]);
      const provider = new OllamaProvider(configWith(CLOUD));

      const result = await provider.test();

      expect(calls[0].url).toBe('https://ollama.com/api/chat');
      const body = JSON.parse(calls[0].init.body as string);
      expect(body.options.num_predict).toBe(1);
      expect(body.stream).toBe(false);
      expect(result.ok).toBe(true);
      expect(result.detail).toMatch(/key accepted/i);
    });

    it('reports a rejected key from the cloud probe', async () => {
      mockFetch([{ ok: false, status: 401, jsonBody: 'unauthorized' }]);
      const provider = new OllamaProvider(configWith(CLOUD));

      const result = await provider.test();
      expect(result.ok).toBe(false);
      expect(result.detail).toMatch(/rejected the API key/i);
    });

    it('reports an error carried inside a 200 cloud probe', async () => {
      mockFetch([{ jsonBody: { error: 'model not found' } }]);
      const provider = new OllamaProvider(configWith(CLOUD));

      const result = await provider.test();
      expect(result.ok).toBe(false);
      expect(result.detail).toMatch(/model not found/i);
    });

    it('probes a local server with the model list', async () => {
      const { calls } = mockFetch([{ jsonBody: { models: [{ name: 'gpt-oss:120b' }] } }]);
      const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'http://localhost:11434' }));

      const result = await provider.test();

      expect(calls[0].url).toBe('http://localhost:11434/api/tags');
      expect(result.ok).toBe(true);
    });

    it('fails on an empty model list from a local server', async () => {
      mockFetch([{ jsonBody: { models: [] } }]);
      const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'http://localhost:11434' }));

      const result = await provider.test();
      expect(result.ok).toBe(false);
      expect(result.detail).toMatch(/ollama pull/i);
    });

    it('notes when the configured model is not in the local list', async () => {
      mockFetch([{ jsonBody: { models: [{ name: 'llama3:8b' }] } }]);
      const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'http://localhost:11434' }));

      const result = await provider.test();
      expect(result.ok).toBe(true);
      expect(result.detail).toMatch(/is not among them/i);
    });

    it('says what to do when unconfigured, without calling out', async () => {
      const fetchSpy = jest.fn();
      (global as any).fetch = fetchSpy;
      const provider = new OllamaProvider(configWith({ OLLAMA_HOST: 'https://ollama.com' }));

      const result = await provider.test();
      expect(result.ok).toBe(false);
      expect(result.detail).toMatch(/API key/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
