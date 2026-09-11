/**
 * The one behaviour that took the whole API down: a Redis that is configured
 * but unreachable must not make callers wait forever.
 */

const connectMock = jest.fn();
const clientMock = {
  connect: connectMock,
  on: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  quit: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: () => clientMock,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RedisCacheHelper } = require('./RedisCacheHelper');

describe('RedisCacheHelper, with Redis unreachable', () => {
  const config = { redis: { url: 'redis://localhost:6379' } };

  beforeEach(() => {
    jest.clearAllMocks();
    clientMock.on.mockReturnValue(clientMock);
  });

  it('gives up on a connect that never settles, rather than hanging the caller', async () => {
    /*
     * This is exactly what node-redis does with a reconnectStrategy that
     * retries indefinitely: the promise from connect() is still pending, and
     * used to be awaited by every cache call in the process.
     */
    connectMock.mockReturnValue(new Promise(() => {}));

    const helper = new RedisCacheHelper(config);

    const started = Date.now();
    const result = await helper.get('some-namespace', 'some-key');
    const waited = Date.now() - started;

    expect(result).toBeNull();
    // Generous upper bound; the point is that it settles at all.
    expect(waited).toBeLessThan(5000);
  }, 10000);

  it('reports a write as failed rather than waiting on a dead connection', async () => {
    connectMock.mockReturnValue(new Promise(() => {}));

    const helper = new RedisCacheHelper(config);

    await expect(helper.set('some-namespace', 'some-key', { a: 1 }, 60)).resolves.toBe(false);
    // Nothing was sent, because the client was never ready.
    expect(clientMock.set).not.toHaveBeenCalled();
  }, 10000);

  it('still serves normally once the connection succeeds', async () => {
    connectMock.mockResolvedValue(undefined);
    clientMock.get.mockResolvedValue(JSON.stringify({ a: 1 }));

    const helper = new RedisCacheHelper(config);

    await expect(helper.get('some-namespace', 'some-key')).resolves.toEqual({ a: 1 });
  });

  it('does not start a second connect while one is in flight', async () => {
    connectMock.mockReturnValue(new Promise(() => {}));

    const helper = new RedisCacheHelper(config);

    await Promise.all([
      helper.get('ns', 'a'),
      helper.get('ns', 'b'),
      helper.get('ns', 'c'),
    ]);

    // One from the constructor's eager attempt; the reads share it rather than
    // opening a connection each.
    expect(connectMock.mock.calls.length).toBeLessThanOrEqual(2);
  }, 10000);
});
