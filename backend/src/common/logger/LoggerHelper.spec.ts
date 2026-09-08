import * as winston from 'winston';
import * as TransportNS from 'winston-transport';

// winston exposes Transport at runtime but not in its typings, and the default
// export shape depends on esModuleInterop — resolve it defensively.
const TransportBase: any = (TransportNS as any).default ?? TransportNS;

import { LoggerHelper } from './LoggerHelper';
import { LogFormat, LogLevel } from './enum/LogLevel';
import { requestContext } from '../audit/request-context';

/** Captures emitted records so assertions run against real winston output. */
class CaptureTransport extends TransportBase {
  records: any[] = [];
  log(info: any, next: () => void) {
    this.records.push(info);
    next();
  }
}

function makeLogger(level: LogLevel = LogLevel.VERBOSE, redact = true) {
  const capture = new CaptureTransport();
  const helper = LoggerHelper.configure({
    level,
    format: LogFormat.JSON,
    console: false,
    redact,
    file: undefined,
  });
  helper.logger.clear();
  helper.logger.add(capture as any);
  return { helper, capture };
}

afterEach(() => {
  LoggerHelper.configure({ console: false, file: undefined });
});

describe('LoggerHelper', () => {
  it('is a singleton', () => {
    expect(LoggerHelper.Instance).toBe(LoggerHelper.Instance);
  });

  it('emits one record per level with the expected shape', () => {
    const { helper, capture } = makeLogger();

    helper.info('REQ-1', 'created', { employeeId: 'e1' });
    helper.warn('REQ-1', 'slow');
    helper.error('REQ-1', 'failed');
    helper.debug('REQ-1', 'detail');
    helper.verbose('REQ-1', 'trace');

    expect(capture.records.map((r) => r.level)).toEqual([
      'info',
      'warn',
      'error',
      'debug',
      'verbose',
    ]);
    expect(capture.records[0]).toMatchObject({
      request_id: 'REQ-1',
      message: 'created',
      data: { employeeId: 'e1' },
    });
  });

  it('tags every record with service and environment', () => {
    const { helper, capture } = makeLogger();
    helper.info('REQ-1', 'hello');

    expect(capture.records[0].service).toBeDefined();
    expect(capture.records[0].environment).toBeDefined();
    expect(capture.records[0].timestamp).toBeDefined();
  });

  it('drops records below the configured level', () => {
    const { helper, capture } = makeLogger(LogLevel.WARN);

    helper.error('REQ-1', 'kept');
    helper.warn('REQ-1', 'kept');
    helper.info('REQ-1', 'dropped');
    helper.debug('REQ-1', 'dropped');

    expect(capture.records.map((r) => r.message)).toEqual(['kept', 'kept']);
  });

  it('reports which levels are enabled so callers can skip costly payloads', () => {
    const { helper } = makeLogger(LogLevel.INFO);

    expect(helper.isLevelEnabled(LogLevel.ERROR)).toBe(true);
    expect(helper.isLevelEnabled(LogLevel.INFO)).toBe(true);
    expect(helper.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
  });

  it('does not build a payload for a level that will be discarded', () => {
    const { helper, capture } = makeLogger(LogLevel.ERROR);
    const data = {
      get expensive() {
        throw new Error('payload was prepared for a discarded level');
      },
    };

    expect(() => helper.debug('REQ-1', 'skipped', data)).not.toThrow();
    expect(capture.records).toHaveLength(0);
  });
});

describe('LoggerHelper — correlation', () => {
  it('falls back to the ambient request id when none is passed', () => {
    const { helper, capture } = makeLogger();

    requestContext.run({ requestId: 'REQ-ambient' }, () => {
      helper.info(null, 'inside a request');
    });

    expect(capture.records[0].request_id).toBe('REQ-ambient');
  });

  it('prefers an explicitly passed id over the ambient one', () => {
    const { helper, capture } = makeLogger();

    requestContext.run({ requestId: 'REQ-ambient' }, () => {
      helper.info('REQ-explicit', 'override');
    });

    expect(capture.records[0].request_id).toBe('REQ-explicit');
  });

  it('marks work outside any request as SYSTEM rather than leaving it blank', () => {
    const { helper, capture } = makeLogger();
    helper.info(null, 'background job');

    expect(capture.records[0].request_id).toBe('SYSTEM');
  });
});

describe('LoggerHelper — errors', () => {
  it('records name, message and stack instead of an empty object', () => {
    const { helper, capture } = makeLogger();
    const err = new Error('database unreachable');

    helper.error('REQ-1', 'query failed', err);

    // JSON.stringify(err) is "{}" — the fields are non-enumerable, which is how
    // stack traces silently disappear from logs.
    expect(capture.records[0].err).toMatchObject({
      name: 'Error',
      message: 'database unreachable',
    });
    expect(capture.records[0].err.stack).toContain('database unreachable');
  });

  it('survives a circular payload rather than throwing at the call site', () => {
    const { helper, capture } = makeLogger();
    const cyclic: any = { name: 'node' };
    cyclic.self = cyclic;

    expect(() => helper.info('REQ-1', 'cyclic', cyclic)).not.toThrow();
    expect(capture.records).toHaveLength(1);
  });
});

describe('LoggerHelper — redaction', () => {
  it('strips secrets from logged payloads', () => {
    const { helper, capture } = makeLogger();

    helper.info('REQ-1', 'login attempt', {
      email: 'user@peopleos.test',
      password: 'Sup3rSecret!',
      refreshToken: 'eyJhbGciOi',
      passwordHash: '$2b$12$abcdefghij',
      otp: '123456',
    });

    const serialized = JSON.stringify(capture.records[0]);
    expect(serialized).not.toContain('Sup3rSecret');
    expect(serialized).not.toContain('eyJhbGciOi');
    expect(serialized).not.toContain('$2b$');
    expect(serialized).not.toContain('123456');
    // Non-secret fields survive, or the log would be useless.
    expect(capture.records[0].data.email).toBe('user@peopleos.test');
  });

  it('strips secrets nested inside a payload', () => {
    const { helper, capture } = makeLogger();

    helper.info('REQ-1', 'session', { user: { name: 'Anika', password: 'nested' } });

    expect(JSON.stringify(capture.records[0])).not.toContain('nested');
    expect(capture.records[0].data.user.name).toBe('Anika');
  });

  it('masks financial identifiers rather than dropping them', () => {
    const { helper, capture } = makeLogger();

    helper.info('REQ-1', 'payroll', { bankAccountNumber: '123456789012' });

    expect(capture.records[0].data.bankAccountNumber).toBe('••••••••9012');
  });

  it('can be disabled explicitly, and only then does a secret pass through', () => {
    const { helper, capture } = makeLogger(LogLevel.VERBOSE, false);

    helper.info('REQ-1', 'raw', { password: 'visible' });

    expect(capture.records[0].data.password).toBe('visible');
  });
});

describe('LoggerHelper — child loggers', () => {
  it('stamps a context onto every line', () => {
    const { helper, capture } = makeLogger();
    const log = helper.child('PayrollService');

    log.info('REQ-1', 'run started', { period: '2026-03' });
    log.error('REQ-1', 'run failed');

    expect(capture.records.map((r) => r.context)).toEqual([
      'PayrollService',
      'PayrollService',
    ]);
  });

  it('still resolves the ambient request id', () => {
    const { helper, capture } = makeLogger();
    const log = helper.child('Jobs');

    requestContext.run({ requestId: 'REQ-child' }, () => log.warn(null, 'retrying'));

    expect(capture.records[0].request_id).toBe('REQ-child');
  });
});

describe('LoggerHelper — configuration', () => {
  it('reads level and format from the environment', () => {
    const prev = { ...process.env };
    process.env.LOG_LEVEL = 'warn';
    process.env.LOG_FORMAT = 'JSON';

    const config = LoggerHelper.configFromEnv();
    expect(config.level).toBe(LogLevel.WARN);
    expect(config.format).toBe(LogFormat.JSON);

    process.env = prev;
  });

  it('falls back to safe defaults for an unrecognised level', () => {
    const prev = { ...process.env };
    process.env.LOG_LEVEL = 'chatty';
    process.env.NODE_ENV = 'production';

    const config = LoggerHelper.configFromEnv();
    // Production defaults: info, JSON — never verbose by accident.
    expect(config.level).toBe(LogLevel.INFO);
    expect(config.format).toBe(LogFormat.JSON);

    process.env = prev;
  });

  it('adds no file transport unless LOG_TO_FILE is set', () => {
    const prev = { ...process.env };
    delete process.env.LOG_TO_FILE;

    expect(LoggerHelper.configFromEnv().file).toBeUndefined();

    process.env = prev;
  });

  it('replaces the singleton on configure()', () => {
    const first = LoggerHelper.Instance;
    const second = LoggerHelper.configure({ level: LogLevel.ERROR, console: false });

    expect(second).not.toBe(first);
    expect(LoggerHelper.Instance).toBe(second);
  });

  it('never throws when a transport fails mid-write', () => {
    const { helper } = makeLogger();
    helper.logger.clear();
    helper.logger.add(
      new (class extends winston.transports.Console {
        log() {
          throw new Error('transport exploded');
        }
      })(),
    );

    expect(() => helper.info('REQ-1', 'still fine')).not.toThrow();
  });
});
