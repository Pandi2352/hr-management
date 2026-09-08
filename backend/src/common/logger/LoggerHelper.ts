import * as winston from 'winston';
import type { Logger } from 'winston';
import 'winston-daily-rotate-file';
import { requestContext } from '../audit/request-context';
import { sanitizeAuditValue } from '../audit/audit-sanitizer.util';
import { LogFormat, LOG_LEVEL_PRIORITY, LogLevel } from './enum/LogLevel';
import { ILoggerConfig } from './interfaces/ILoggerConfig';

/** Shape of every emitted record, so log consumers can rely on the fields. */
interface LogPayload {
  request_id: string;
  message: string;
  context?: string;
  data?: unknown;
  err?: { name: string; message: string; stack?: string };
}

/**
 * Application logger.
 *
 * Three things make this more than a `console.log` wrapper:
 *
 * 1. **Correlation is automatic.** `request_id` falls back to the id the
 *    RequestContext middleware already put in AsyncLocalStorage, which is the
 *    same `REQ-<uuid>` the audit trail records and the same value echoed to the
 *    client as `X-Request-Id`. One id ties a client report, a log line and an
 *    audit row together, and no call site has to thread it through.
 *
 * 2. **Secrets cannot reach a log file.** Payloads pass through the same
 *    sanitizer the audit trail uses, so "what counts as a secret" is defined
 *    once for the whole application. A password, token or OTP dropped from an
 *    audit record is dropped from a log line by the same rule.
 *
 * 3. **Errors are logged as errors.** Passing an `Error` records its name,
 *    message and stack as structured fields rather than `{}`, which is what
 *    `JSON.stringify(err)` produces and the reason stack traces go missing.
 *
 * Usage:
 * ```ts
 * LoggerHelper.Instance.info(null, 'Employee created', { employeeId });
 * LoggerHelper.Instance.error(null, 'Payroll run failed', err);
 * ```
 */
export class LoggerHelper {
  private static _instance: LoggerHelper;

  logger: Logger;

  private readonly config: ILoggerConfig;

  private constructor(config?: Partial<ILoggerConfig>) {
    this.config = { ...LoggerHelper.configFromEnv(), ...config };
    this.logger = this.prepareLogger();
  }

  /** Singleton accessor. */
  static get Instance(): LoggerHelper {
    return this._instance || (this._instance = new LoggerHelper());
  }

  /**
   * Rebuilds the singleton with explicit configuration.
   *
   * For composition roots and tests. Closes the existing transports first so a
   * reconfigure cannot leak open file handles.
   */
  static configure(config: Partial<ILoggerConfig>): LoggerHelper {
    this._instance?.close();
    this._instance = new LoggerHelper(config);
    return this._instance;
  }

  static configFromEnv(): ILoggerConfig {
    const environment = process.env.NODE_ENV || 'development';
    const isProd = environment === 'production';

    const rawLevel = (process.env.LOG_LEVEL || '').toLowerCase() as LogLevel;
    const level = Object.values(LogLevel).includes(rawLevel)
      ? rawLevel
      : isProd
        ? LogLevel.INFO
        : LogLevel.DEBUG;

    const rawFormat = (process.env.LOG_FORMAT || '').toUpperCase() as LogFormat;
    const format = Object.values(LogFormat).includes(rawFormat)
      ? rawFormat
      : // Machine-readable where something is collecting it, readable otherwise.
        isProd
        ? LogFormat.JSON
        : LogFormat.PRETTY;

    return {
      level,
      format,
      service: process.env.LOG_SERVICE_NAME || 'peopleos-api',
      environment,
      console: process.env.LOG_CONSOLE !== 'false',
      redact: process.env.LOG_REDACT !== 'false',
      file:
        process.env.LOG_TO_FILE === 'true'
          ? {
              directory: process.env.LOG_DIR || 'logs',
              maxSize: process.env.LOG_MAX_SIZE || '20m',
              maxFiles: process.env.LOG_MAX_FILES || '14d',
              zip: process.env.LOG_ZIP !== 'false',
            }
          : undefined,
    };
  }

  // --- Level methods -------------------------------------------------------

  info(requestId: string | null, message: string, data: unknown = null): void {
    this.write(LogLevel.INFO, requestId, message, data);
  }

  error(requestId: string | null, message: string, data: unknown = null): void {
    this.write(LogLevel.ERROR, requestId, message, data);
  }

  warn(requestId: string | null, message: string, data: unknown = null): void {
    this.write(LogLevel.WARN, requestId, message, data);
  }

  debug(requestId: string | null, message: string, data: unknown = null): void {
    this.write(LogLevel.DEBUG, requestId, message, data);
  }

  verbose(requestId: string | null, message: string, data: unknown = null): void {
    this.write(LogLevel.VERBOSE, requestId, message, data);
  }

  /**
   * A logger that stamps every line with a context label, so a module does not
   * repeat itself at each call site.
   *
   * ```ts
   * private readonly log = LoggerHelper.Instance.child('PayrollService');
   * this.log.info(null, 'Run started', { period });
   * ```
   */
  child(context: string) {
    const bind =
      (level: LogLevel) =>
      (requestId: string | null, message: string, data: unknown = null) =>
        // Arrow functions close over `this` lexically, so no alias is needed.
        this.write(level, requestId, message, data, context);

    return {
      info: bind(LogLevel.INFO),
      error: bind(LogLevel.ERROR),
      warn: bind(LogLevel.WARN),
      debug: bind(LogLevel.DEBUG),
      verbose: bind(LogLevel.VERBOSE),
    };
  }

  /** True when a level would actually be emitted — guard expensive payloads. */
  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /** Flushes and closes transports. Call on application shutdown. */
  close(): void {
    this.logger.close();
  }

  // --- Internals -----------------------------------------------------------

  private write(
    level: LogLevel,
    requestId: string | null,
    message: string,
    data: unknown,
    context?: string,
  ): void {
    // Skip payload preparation entirely below the threshold: sanitizing a large
    // object only to discard it is the expensive part of logging.
    if (!this.isLevelEnabled(level)) return;

    try {
      this.logger.log(level, this.prepareLogPayload(requestId, message, data, context));
    } catch (err) {
      // A logging failure must never break the code that logged — a full disk
      // or a broken transport would otherwise take down the request that
      // happened to emit a line. Fall back to stderr and carry on.
      try {
        console.error('[LoggerHelper] failed to write log entry:', (err as Error)?.message);
      } catch {
        // Nothing left to try; swallowing is the only correct move.
      }
    }
  }

  private prepareLogPayload(
    requestId: string | null,
    message: string,
    data: unknown,
    context?: string,
  ): LogPayload {
    const payload: LogPayload = {
      // Falls back to the ambient request id, so callers can pass null and
      // still get a correlated line.
      request_id: requestId || requestContext.get()?.requestId || 'SYSTEM',
      message,
    };

    if (context) payload.context = context;
    if (data === null || data === undefined) return payload;

    // An Error serialises to `{}` under JSON.stringify — its useful fields are
    // non-enumerable — so it is unpacked explicitly or the stack is lost.
    if (data instanceof Error) {
      payload.err = { name: data.name, message: data.message, stack: data.stack };
      return payload;
    }

    payload.data = this.config.redact ? sanitizeAuditValue(data) : data;
    return payload;
  }

  private prepareLogger(): Logger {
    const { level, format, service, environment, console: useConsole, file } = this.config;

    const transports: winston.transport[] = [];

    if (useConsole) {
      transports.push(
        new winston.transports.Console({
          format:
            format === LogFormat.PRETTY ? LoggerHelper.prettyFormat() : winston.format.json(),
          // stderr for error/warn, so container tooling separates them.
          stderrLevels: [LogLevel.ERROR, LogLevel.WARN],
        }),
      );
    }

    if (file) {
      const rotate = (winston.transports as any).DailyRotateFile;

      transports.push(
        new rotate({
          dirname: file.directory,
          filename: 'application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: file.maxSize,
          maxFiles: file.maxFiles,
          zippedArchive: file.zip,
          format: winston.format.json(),
        }),
      );

      // Errors also go to their own file — the first thing anyone wants during
      // an incident is the error stream without the noise around it.
      transports.push(
        new rotate({
          level: LogLevel.ERROR,
          dirname: file.directory,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: file.maxSize,
          maxFiles: file.maxFiles,
          zippedArchive: file.zip,
          format: winston.format.json(),
        }),
      );
    }

    // With no transport at all winston warns on every call; a silent console
    // keeps the logger inert without the noise (used by the test setup).
    if (transports.length === 0) {
      transports.push(new winston.transports.Console({ silent: true }));
    }

    return winston.createLogger({
      level,
      levels: LOG_LEVEL_PRIORITY,
      defaultMeta: { service, environment },
      format: winston.format.combine(
        winston.format.timestamp(),
        // Anything thrown while formatting is reported rather than swallowed.
        winston.format.errors({ stack: true }),
      ),
      transports,
      // Never let a logging failure take the process down.
      exitOnError: false,
    });
  }

  /** Terminal format: `HH:mm:ss LEVEL [context] (request_id) message  {data}`. */
  private static prettyFormat() {
    return winston.format.combine(
      winston.format.colorize({ level: true }),
      winston.format.printf((info: any) => {
        const time = new Date(info.timestamp ?? Date.now()).toISOString().slice(11, 19);
        const ctx = info.context ? ` [${info.context}]` : '';
        const rid = info.request_id && info.request_id !== 'SYSTEM' ? ` (${info.request_id})` : '';

        let line = `${time} ${info.level}${ctx}${rid} ${info.message ?? ''}`;

        if (info.err) {
          line += `\n  ${info.err.name}: ${info.err.message}`;
          if (info.err.stack) line += `\n${info.err.stack}`;
        }
        if (info.data !== undefined) {
          line += `  ${safeStringify(info.data)}`;
        }
        return line;
      }),
    );
  }
}

/**
 * A circular reference makes JSON.stringify throw. A logger must never throw at
 * its call site, so cycles degrade to a marker instead.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    });
  } catch {
    return '[unserializable]';
  }
}
