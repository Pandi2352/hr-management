import { LogFormat, LogLevel } from '../enum/LogLevel';

export interface IFileLogConfig {
  /** Directory for rotated log files. Created on first write. */
  directory: string;
  /** e.g. `20m` — a single file is rolled once it exceeds this. */
  maxSize: string;
  /** e.g. `14d` — files older than this are deleted. */
  maxFiles: string;
  /** gzip rotated files; saves a lot of disk on chatty services. */
  zip: boolean;
}

export interface ILoggerConfig {
  /** Threshold — this level and anything more severe is written. */
  level: LogLevel;
  format: LogFormat;
  /** Tags every line, so one aggregator can hold several services. */
  service: string;
  environment: string;
  /** Console output. Disable only when shipping exclusively to files. */
  console: boolean;
  /** File rotation; omitted means no file transport. */
  file?: IFileLogConfig;
  /**
   * Strip secrets from logged payloads. Leave on — it is the guarantee that a
   * password or token cannot reach a log file. See LoggerHelper for why.
   */
  redact: boolean;
}
