import { LoggerService, LogLevel as NestLogLevel } from '@nestjs/common';
import { LoggerHelper } from './LoggerHelper';

/**
 * Routes NestJS's own output through LoggerHelper.
 *
 * Without this the framework writes its startup, routing and exception lines
 * straight to stdout in its own format, so a production deployment ends up with
 * two log formats interleaved and only half of it structured or redacted.
 *
 * Wire it in `main.ts`:
 * ```ts
 * const app = await NestFactory.create(AppModule, { bufferLogs: true });
 * app.useLogger(new NestLoggerAdapter());
 * ```
 * `bufferLogs` holds framework messages until the adapter is installed, so
 * nothing emitted during bootstrap escapes in the default format.
 */
export class NestLoggerAdapter implements LoggerService {
  private get helper() {
    return LoggerHelper.Instance;
  }

  /**
   * Nest passes the emitting class as a trailing string argument, so the last
   * string is unpacked as `context` and anything else is kept as data.
   */
  private split(params: unknown[]): { context?: string; data: unknown } {
    if (params.length === 0) return { data: null };

    const last = params[params.length - 1];
    if (typeof last === 'string') {
      const rest = params.slice(0, -1);
      return { context: last, data: rest.length === 0 ? null : rest.length === 1 ? rest[0] : rest };
    }
    return { data: params.length === 1 ? params[0] : params };
  }

  private emit(
    level: 'info' | 'warn' | 'error' | 'debug' | 'verbose',
    message: unknown,
    params: unknown[],
  ) {
    const { context, data } = this.split(params);
    const text = typeof message === 'string' ? message : safeText(message);
    const target = context ? this.helper.child(context) : this.helper;
    target[level](null, text, data);
  }

  log(message: unknown, ...params: unknown[]) {
    this.emit('info', message, params);
  }

  error(message: unknown, ...params: unknown[]) {
    this.emit('error', message, params);
  }

  warn(message: unknown, ...params: unknown[]) {
    this.emit('warn', message, params);
  }

  debug(message: unknown, ...params: unknown[]) {
    this.emit('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]) {
    this.emit('verbose', message, params);
  }

  /** Honours whatever LOG_LEVEL already selected rather than Nest's own list. */
  setLogLevels?(_levels: NestLogLevel[]) {
    // Intentionally ignored: LOG_LEVEL is the single source of truth.
  }
}

function safeText(value: unknown): string {
  if (value instanceof Error) return value.message;
  try {
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  } catch {
    return String(value);
  }
}
