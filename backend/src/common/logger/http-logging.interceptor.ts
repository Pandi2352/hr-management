import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggerHelper } from './LoggerHelper';
import { LogLevel } from './enum/LogLevel';

/** Never logged as a query parameter, whatever the route. */
const SENSITIVE_QUERY_KEYS = ['token', 'password', 'otp', 'secret', 'key'];

/**
 * One line per request: method, path, status, duration.
 *
 * This is the log that answers "was the system slow, or was it erroring?"
 * without needing an APM. Because `request_id` comes from the same
 * AsyncLocalStorage the audit trail uses, a slow request found here can be
 * traced straight to the audit rows it produced.
 *
 * Levels are chosen by outcome so an error is never buried at info:
 * 5xx → error, 4xx → warn, everything else → info.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly log = LoggerHelper.Instance.child('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest();
    const startedAt = Date.now();

    const method = req.method;
    // `route.path` keeps ids out of the message, so lines group by endpoint
    // instead of producing one distinct message per record.
    const route = req.route?.path || req.originalUrl?.split('?')[0] || req.url;

    return next.handle().pipe(
      tap({
        next: () => this.record(method, route, http.getResponse()?.statusCode ?? 200, startedAt, req),
        error: (err) =>
          this.record(method, route, err?.status ?? err?.statusCode ?? 500, startedAt, req, err),
      }),
    );
  }

  private record(
    method: string,
    route: string,
    status: number,
    startedAt: number,
    req: any,
    err?: unknown,
  ) {
    const durationMs = Date.now() - startedAt;
    const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;

    const data: Record<string, unknown> = {
      method,
      route,
      status,
      durationMs,
      ip: req.ip,
      userId: req.user?.userId,
    };

    const query = safeQuery(req.query);
    if (query) data.query = query;

    // The message stays constant per endpoint so it aggregates; the varying
    // parts live in fields, which is what makes them searchable.
    const message = `${method} ${route} ${status} ${durationMs}ms`;

    if (level === LogLevel.ERROR) {
      this.log.error(null, message, err instanceof Error ? err : data);
      if (err instanceof Error) this.log.error(null, `${message} context`, data);
      return;
    }

    this.log[level === LogLevel.WARN ? 'warn' : 'info'](null, message, data);
  }
}

/** Drops credential-bearing query params; a reset link must not land in a log. */
function safeQuery(query: unknown): Record<string, unknown> | null {
  if (!query || typeof query !== 'object') return null;

  const entries = Object.entries(query as Record<string, unknown>).filter(
    ([key]) => !SENSITIVE_QUERY_KEYS.some((s) => key.toLowerCase().includes(s)),
  );

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}
