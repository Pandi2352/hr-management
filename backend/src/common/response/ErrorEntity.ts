import { HttpStatus } from './enums/HttpStatus';

export interface ErrorCodeShape {
  error?: string;
  error_code?: string;
  error_description?: string;
}

export interface ErrorEntityInit {
  http_code?: number;
  error?: string;
  error_code?: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
  meta_data?: any;
  /** Diagnostic detail. Logged, never serialised to a client. */
  internal_error?: any;
  /** A catalogue entry supplying error / error_code / error_description together. */
  error_code_obj?: ErrorCodeShape;
}

/**
 * A typed, client-safe error.
 *
 * The split that matters: `error`, `error_code` and `error_description` are
 * written for the caller; `internal_error` and `meta_data` are for us. Only the
 * first three ever reach a response body — leaking a driver message, a schema
 * path or a stack trace is CWE-209, and those are exactly the fields an ORM
 * error carries.
 *
 * `toPublicJSON()` is the only way to serialise one, and it is a *projection*,
 * not a mutation. The original throw-site object keeps `internal_error` so the
 * logger can still record it after the response has been built.
 */
export class ErrorEntity extends Error {
  error?: string;
  error_code?: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
  meta_data?: any;
  internal_error: any;
  http_code: number;

  constructor({
    http_code = HttpStatus.INTERNAL_SERVER_ERROR,
    error = undefined,
    error_code = undefined,
    error_description = undefined,
    error_uri = undefined,
    state = undefined,
    meta_data = undefined,
    internal_error = undefined,
    error_code_obj = undefined,
  }: ErrorEntityInit = {}) {
    super(error ?? error_code_obj?.error ?? error_description ?? 'error');

    // Without this, `instanceof ErrorEntity` is false when the class is
    // compiled to ES5 — extending a built-in resets the prototype chain.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ErrorEntity';

    if (error_code_obj) {
      this.error = error_code_obj.error;
      this.error_code = error_code_obj.error_code;
      this.error_description = error_code_obj.error_description;
    }

    // Explicit arguments win over the catalogue entry.
    if (error) this.error = error;
    if (error_code) this.error_code = error_code;
    if (error_description) this.error_description = error_description;
    if (error_uri) this.error_uri = error_uri;

    this.state = state;
    this.internal_error = internal_error;
    this.meta_data = meta_data;
    this.http_code = http_code;

    if (Error.captureStackTrace) Error.captureStackTrace(this, ErrorEntity);
  }

  /**
   * The client-safe projection.
   *
   * Built as a fresh object rather than by deleting fields off `this`: the
   * original is often logged after the response is assembled, and a `delete`
   * would have already destroyed the diagnostic detail.
   */
  toPublicJSON(): Record<string, any> {
    const out: Record<string, any> = {};
    if (this.error) out.error = this.error;
    if (this.error_code) out.error_code = this.error_code;
    if (this.error_description) out.error_description = this.error_description;
    if (this.error_uri) out.error_uri = this.error_uri;
    if (this.state) out.state = this.state;
    return out;
  }

  /** JSON string of the client-safe projection. */
  toWebSafe(): string {
    return JSON.stringify(this.toPublicJSON());
  }

  /** Everything, including internals — for logs only. */
  toLogJSON(): Record<string, any> {
    return {
      ...this.toPublicJSON(),
      http_code: this.http_code,
      meta_data: this.meta_data,
      internal_error:
        this.internal_error instanceof Error
          ? {
              name: this.internal_error.name,
              message: this.internal_error.message,
              stack: this.internal_error.stack,
            }
          : this.internal_error,
      stack: this.stack,
    };
  }

  // --- Factories for the statuses this API actually returns -----------------

  static badRequest(description: string, init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.BAD_REQUEST,
      error: 'bad_request',
      error_description: description,
      ...init,
    });
  }

  static unauthorized(description = 'Authentication is required.', init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.UNAUTHORIZED,
      error: 'unauthorized',
      error_description: description,
      ...init,
    });
  }

  static forbidden(description = 'You do not have permission to perform this action.', init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.FORBIDDEN,
      error: 'forbidden',
      error_description: description,
      ...init,
    });
  }

  static notFound(description = 'The requested resource was not found.', init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.NOT_FOUND,
      error: 'not_found',
      error_description: description,
      ...init,
    });
  }

  static conflict(description: string, init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.CONFLICT,
      error: 'conflict',
      error_description: description,
      ...init,
    });
  }

  static locked(description = 'This account is temporarily locked.', init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.LOCKED,
      error: 'account_locked',
      error_description: description,
      ...init,
    });
  }

  static tooManyRequests(description = 'Too many requests. Please try again later.', init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.TOO_MANY_REQUESTS,
      error: 'too_many_requests',
      error_description: description,
      ...init,
    });
  }

  /** The catch-all. `internal_error` carries the cause for the logs only. */
  static internal(internal_error?: any, init: ErrorEntityInit = {}) {
    return new ErrorEntity({
      http_code: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'internal_error',
      error_description: 'An unexpected error occurred. Please try again later.',
      internal_error,
      ...init,
    });
  }
}
