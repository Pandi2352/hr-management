/**
 * Severity levels, ordered most to least severe.
 *
 * These are winston's `npm` levels minus `http` and `silly`, which nothing here
 * emits. `LOG_LEVEL` selects the threshold: everything at that level or more
 * severe is written, the rest is dropped before formatting.
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/** Numeric priorities handed to winston; lower is more severe. */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
  [LogLevel.VERBOSE]: 4,
};

export enum LogFormat {
  /** One JSON object per line — for log shippers and production. */
  JSON = 'JSON',
  /** Coloured, aligned, human-readable — for a terminal. */
  PRETTY = 'PRETTY',
}
