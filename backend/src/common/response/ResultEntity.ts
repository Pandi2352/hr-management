import { requestContext } from '../audit/request-context';
import { STATUS_CODES } from '../constants';
import { LoggerHelper } from '../logger';
import { CookieEntity } from './CookieEntity';
import { HttpStatus } from './enums/HttpStatus';
import { CONTENT_TYPE_BY_RESULT, ResultEntityTypes } from './enums/ResultEntityTypes';
import { ErrorEntity } from './ErrorEntity';

/**
 * The subset of a response object this class uses.
 *
 * Deliberately structural: Express and Fastify disagree on every method name
 * (`status`/`code`, `setHeader`/`header`, `cookie`/`setCookie`), and the
 * adapter below normalises them so a controller never has to care which server
 * is underneath.
 */
export interface HttpResponseLike {
  status?: (code: number) => any;
  code?: (code: number) => any;
  setHeader?: (name: string, value: any) => any;
  header?: (name: string, value: any) => any;
  cookie?: (name: string, value: any, options?: any) => any;
  setCookie?: (name: string, value: any, options?: any) => any;
  redirect?: (url: string) => any;
  send?: (body?: any) => any;
  json?: (body?: any) => any;
  end?: (body?: any) => any;
  pipe?: unknown;
}

interface ResultEntityInit {
  success?: boolean;
  code?: number;
  description?: string;
  data?: any;
  meta_data?: any;
  current_context?: any;
  body?: any;
  query?: any;
  params?: any;
}

interface PayloadInit {
  code?: number;
  description?: string;
  data?: any;
  meta_data?: any;
  headers?: Map<string, any> | Record<string, any>;
  cookies?: CookieEntity[];
}

/** Statuses the HTTP spec forbids a body on. */
const BODILESS_STATUSES = new Set<number>([
  HttpStatus.NO_CONTENT,
  HttpStatus.RESET_CONTENT,
  HttpStatus.NOT_MODIFIED,
]);

/** Escapes text before it is interpolated into an HTML error page. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A response under construction: status, body, content type, headers, cookies.
 *
 * Two properties hold it together:
 *
 * 1. **Server-agnostic.** `sendResponse()` goes through an adapter, so the same
 *    controller works on Express (this project) and Fastify.
 * 2. **Non-mutating.** The original deleted fields off `this` while writing —
 *    `content_type`, `current_context`, `filename` — which made an entity
 *    single-use and impossible to inspect in a test or an interceptor after
 *    sending. Serialisation now builds a separate payload and leaves the entity
 *    intact.
 */
export class ResultEntity {
  success = false;
  code: number = HttpStatus.OK;
  description?: string;
  data?: any;
  error?: any;
  meta_data?: any;
  content_type: string = ResultEntityTypes.json;
  cookies?: CookieEntity[];
  current_context?: any;
  filename?: string;
  headers?: Map<string, any>;

  constructor({
    success = false,
    code = HttpStatus.OK,
    description = undefined,
    data = undefined,
    meta_data = undefined,
    current_context = undefined,
    body = undefined,
    query = undefined,
    params = undefined,
  }: ResultEntityInit = {}) {
    this.success = success;
    this.code = code;
    this.description = description;
    this.data = data;
    this.meta_data = meta_data;

    this.current_context = current_context ?? {};
    if (!this.current_context.req) this.current_context.req = {};
    if (body) this.current_context.req.body = body;
    if (query) this.current_context.req.query = query;
    if (params) this.current_context.req.params = params;

    // Correlation comes from the ambient request context, so a handler does not
    // have to thread the id through to build a response.
    if (!this.current_context.x_request_id) {
      this.current_context.x_request_id = requestContext.get()?.requestId;
    }
  }

  // --- Factories -----------------------------------------------------------

  /** 200 — a successful read, update or action. */
  static ok(data?: any, message?: string, meta_data?: any): ResultEntity {
    const r = new ResultEntity();
    r.setData({ code: HttpStatus.OK, data, description: message, meta_data });
    return r;
  }

  /** 201 — a resource was created. Reserve it for creation; actions return 200. */
  static created(data?: any, message?: string): ResultEntity {
    const r = new ResultEntity();
    r.setData({ code: HttpStatus.CREATED, data, description: message });
    return r;
  }

  /** 202 — accepted for later processing. */
  static accepted(data?: any, message?: string): ResultEntity {
    const r = new ResultEntity();
    r.setData({ code: HttpStatus.ACCEPTED, data, description: message });
    return r;
  }

  /** 204 — success with deliberately no body. */
  static noContent(): ResultEntity {
    const r = new ResultEntity();
    r.setData({ code: HttpStatus.NO_CONTENT });
    return r;
  }

  /** Pagination or any other envelope metadata. */
  withMeta(meta_data: any): this {
    this.meta_data = meta_data;
    return this;
  }

  withMessage(message: string): this {
    this.description = message;
    return this;
  }

  withStatus(code: number): this {
    this.code = code;
    return this;
  }

  static fromError(error: ErrorEntity | Error): ResultEntity {
    const r = new ResultEntity();
    r.setError({ error: error as ErrorEntity });
    return r;
  }

  // --- Builders ------------------------------------------------------------

  private applyCommon(init: PayloadInit, contentType: string): void {
    this.success = true;
    this.code = init.code ?? HttpStatus.OK;
    this.data = init.data;
    this.description = init.description;
    this.meta_data = init.meta_data;
    this.content_type = contentType;
    if (init.headers) this.setHeaders(init.headers);
    if (init.cookies) this.cookies = init.cookies;
  }

  /** Standard enveloped JSON. */
  setData(init: PayloadInit = {}): this {
    this.applyCommon(init, ResultEntityTypes.json);
    return this;
  }

  /** Sends `data` alone, with no envelope — for third-party-shaped responses. */
  setDataDirect(init: PayloadInit = {}): this {
    this.applyCommon(init, ResultEntityTypes.json_direct);
    return this;
  }

  setRedirect(init: PayloadInit & { url?: string } = {}): this {
    this.applyCommon({ ...init, data: init.url }, ResultEntityTypes.redirect);
    this.code = init.code ?? HttpStatus.FOUND;
    return this;
  }

  setHTML(init: PayloadInit & { html?: string } = {}): this {
    this.applyCommon({ ...init, data: init.html }, ResultEntityTypes.html);
    return this;
  }

  setCSS(init: PayloadInit & { css?: string } = {}): this {
    this.applyCommon({ ...init, data: init.css }, ResultEntityTypes.css);
    return this;
  }

  setJS(init: PayloadInit & { js?: string } = {}): this {
    this.applyCommon({ ...init, data: init.js }, ResultEntityTypes.js);
    return this;
  }

  setXML(init: PayloadInit & { xml?: string } = {}): this {
    this.applyCommon({ ...init, data: init.xml }, ResultEntityTypes.xml);
    return this;
  }

  setAudio(init: PayloadInit & { audio?: any } = {}): this {
    this.applyCommon({ ...init, data: init.audio }, ResultEntityTypes.audio);
    return this;
  }

  setPEM(init: PayloadInit & { filename: string } = { filename: '' }): this {
    this.applyCommon(init, ResultEntityTypes.pem);
    this.filename = init.filename;
    return this;
  }

  setCSV(init: PayloadInit & { csv?: string; filename?: string } = {}): this {
    this.applyCommon({ ...init, data: init.csv ?? init.data }, ResultEntityTypes.csv);
    this.filename = init.filename;
    return this;
  }

  /**
   * A buffer or stream sent as an attachment (or inline).
   *
   * `filename` is written into `Content-Disposition` URL-encoded, so a name
   * containing a quote or a newline cannot break out of the header — header
   * injection is the classic bug in hand-rolled download endpoints.
   */
  setFile(
    init: PayloadInit & {
      file?: any;
      filename?: string;
      mime_type?: string;
      inline?: boolean;
    } = {},
  ): this {
    this.applyCommon({ ...init, data: init.file ?? init.data }, ResultEntityTypes.file);
    this.filename = init.filename;
    this.setHeader('Content-Type', init.mime_type || 'application/octet-stream');
    this.setHeader(
      'Content-Disposition',
      `${init.inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(
        init.filename || 'download',
      )}"`,
    );
    return this;
  }

  setRawData(init: PayloadInit & { raw_data?: any; content_type?: string } = {}): this {
    this.applyCommon({ ...init, data: init.raw_data ?? init.data }, init.content_type || ResultEntityTypes.text);
    return this;
  }

  /**
   * A minimal HTML error page.
   *
   * Every interpolated value is escaped. The original read an external template
   * and injected `error_description` and `message` raw — anything reflected
   * from a query string would have been stored XSS.
   */
  setErrorHTML(
    init: {
      code?: number;
      error?: string;
      error_description?: string;
      message?: string;
      cookies?: CookieEntity[];
    } = {},
  ): this {
    const code = init.code ?? HttpStatus.EXPECTATION_FAILED;
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Error ${escapeHtml(code)}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f8fafc;color:#0f172a}
.card{max-width:32rem;padding:2rem;border:1px solid #e2e8f0;border-radius:.375rem;background:#fff}
h1{margin:0 0 .5rem;font-size:1.125rem}p{margin:.25rem 0;color:#475569;font-size:.875rem}
code{font-size:.75rem;color:#64748b}</style></head>
<body><div class="card">
<h1>${escapeHtml(init.error || 'Request failed')}</h1>
<p>${escapeHtml(init.error_description || init.message || 'Something went wrong.')}</p>
<p><code>Status ${escapeHtml(code)}</code></p>
</div></body></html>`;

    this.applyCommon({ code, data: html, cookies: init.cookies }, ResultEntityTypes.html);
    return this;
  }

  /**
   * Attaches an error.
   *
   * A typed `ErrorEntity` keeps its clean `{error, error_code,
   * error_description}` shape. Anything else — a Mongoose `CastError`, a raw
   * `Error` — is logged with its stack and replaced by a generic body, because
   * driver messages and schema paths are internal detail (CWE-209).
   */
  setError({ error }: { error?: ErrorEntity | Error | any } = {}): this {
    this.success = false;
    this.content_type = ResultEntityTypes.json;
    if (!error) return this;

    if (error instanceof ErrorEntity) {
      this.code = error.http_code;
      this.meta_data = error.meta_data ?? this.meta_data;
      this.error = error.toPublicJSON();

      if (error.internal_error !== undefined) {
        LoggerHelper.Instance.child('ResultEntity').error(
          this.current_context?.x_request_id ?? null,
          'Handled error with internal detail',
          error.toLogJSON(),
        );
      }
      return this;
    }

    this.code = HttpStatus.INTERNAL_SERVER_ERROR;
    LoggerHelper.Instance.child('ResultEntity').error(
      this.current_context?.x_request_id ?? null,
      'Unhandled error',
      error instanceof Error ? error : { error },
    );
    this.error = ErrorEntity.internal().toPublicJSON();
    return this;
  }

  // --- Headers & cookies ---------------------------------------------------

  setHeader(name: string, value: any): this {
    if (!this.headers) this.headers = new Map<string, any>();
    this.headers.set(name, value);
    return this;
  }

  setHeaders(headers: Map<string, any> | Record<string, any>): this {
    if (!this.headers) this.headers = new Map<string, any>();
    if (headers instanceof Map) {
      headers.forEach((v, k) => this.headers!.set(k, v));
    } else {
      Object.entries(headers).forEach(([k, v]) => this.headers!.set(k, v));
    }
    return this;
  }

  setCookies(cookies: CookieEntity[]): this {
    this.cookies = cookies;
    return this;
  }

  addCookie(cookie: CookieEntity): this {
    (this.cookies ??= []).push(cookie);
    return this;
  }

  // --- Serialisation -------------------------------------------------------

  /**
   * The JSON body, as a fresh object.
   *
   * Emits the project's canonical envelope — `{success, statusCode, status,
   * message, data, meta}` — rather than a second competing shape. This class is
   * a *builder for the existing contract*: every controller and the whole
   * frontend already read `data` and `meta`, so adopting it changes nothing on
   * the wire.
   *
   * Transport-only fields (`content_type`, `current_context`, `filename`,
   * `headers`, `cookies`) are omitted rather than deleted off `this`, so the
   * entity survives being sent and can still be asserted on.
   */
  toResponseBody(extraMeta: Record<string, any> = {}): Record<string, any> {
    const entry = Object.values(STATUS_CODES).find((s: any) => s.code === this.code) as any;

    const body: Record<string, any> = {
      success: this.success,
      statusCode: this.code,
      status: entry?.status ?? (this.success ? 'SUCCESS' : 'ERROR'),
      message:
        this.description ??
        entry?.defaultMessage ??
        (this.success ? 'Request processed successfully' : 'Request failed'),
      data: this.data ?? null,
    };

    if (this.error !== undefined) {
      body.error = this.error;
      // Mirrored to the top level so error handling reads the same whether the
      // body came from here or from the exception filter.
      if (this.error?.error_code) body.errorCode = this.error.error_code;
      if (this.error?.error_description) body.message = this.error.error_description;
    }

    const meta = {
      timestamp: new Date().toISOString(),
      ...(this.current_context?.x_request_id
        ? { requestId: this.current_context.x_request_id }
        : {}),
      ...extraMeta,
      ...(this.meta_data ?? {}),
    };
    body.meta = meta;

    return body;
  }

  /** Retained for compatibility; `toResponseBody()` is the non-mutating form. */
  prepareResponse(): Record<string, any> {
    return this.toResponseBody();
  }

  /**
   * Writes the response.
   *
   * @param disable_response_cache sends no-store headers, the safe default for
   *   authenticated API responses.
   */
  sendResponse(res: HttpResponseLike, disable_response_cache = true): void {
    const w = adapt(res);

    if (this.current_context?.x_request_id) {
      w.header('x-request-id', this.current_context.x_request_id);
    }

    for (const cookie of [
      ...(this.cookies ?? []),
      ...(this.current_context?.out_cookies ?? []),
    ]) {
      w.cookie(cookie.name, cookie.value, cookie.options);
    }

    if (disable_response_cache) {
      w.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      w.header('Pragma', 'no-cache');
      // A string: a numeric 0 is not a valid header value in Node and throws.
      w.header('Expires', '0');
    }

    // Caller-supplied headers last, so they win over the defaults above.
    this.headers?.forEach((value, key) => w.header(key, value));

    // 204/205/304 must not carry a body. Sending one is a protocol violation
    // that some proxies reject and others silently truncate.
    if (BODILESS_STATUSES.has(this.code)) {
      w.send(this.code);
      return;
    }

    switch (this.content_type) {
      case ResultEntityTypes.redirect:
        w.redirect(this.code, String(this.data));
        return;

      case ResultEntityTypes.json_direct:
        w.send(this.code, this.data);
        return;

      case ResultEntityTypes.file: {
        // Content-Type and Content-Disposition were set by setFile().
        const payload = this.data;
        if (payload && typeof payload.pipe === 'function') {
          w.status(this.code);
          payload.pipe(res);
          return;
        }
        w.send(this.code, payload);
        return;
      }

      case ResultEntityTypes.pem:
        w.header('Content-Type', CONTENT_TYPE_BY_RESULT[ResultEntityTypes.pem]);
        w.header(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(this.filename || 'key')}.pem"`,
        );
        w.send(this.code, this.data);
        return;

      case ResultEntityTypes.csv:
        w.header('Content-Type', CONTENT_TYPE_BY_RESULT[ResultEntityTypes.csv]);
        if (this.filename) {
          w.header(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(this.filename)}"`,
          );
        }
        w.send(this.code, this.data);
        return;

      case ResultEntityTypes.json:
        w.send(this.code, this.toResponseBody());
        return;

      default: {
        const contentType = CONTENT_TYPE_BY_RESULT[this.content_type];
        if (contentType) w.header('Content-Type', contentType);
        else if (this.content_type && this.content_type !== ResultEntityTypes.json) {
          // setRawData() with an explicit MIME type.
          w.header('Content-Type', this.content_type);
        }
        w.send(this.code, this.data);
      }
    }
  }
}

/** Normalises Express and Fastify response objects behind one interface. */
function adapt(res: HttpResponseLike) {
  const status = (code: number) => {
    if (typeof res.status === 'function') return res.status(code);
    if (typeof res.code === 'function') return res.code(code);
    return res;
  };

  const header = (name: string, value: any) => {
    if (typeof res.setHeader === 'function') res.setHeader(name, value);
    else if (typeof res.header === 'function') res.header(name, value);
  };

  const cookie = (name: string, value: any, options?: any) => {
    if (typeof res.cookie === 'function') res.cookie(name, value, options);
    else if (typeof res.setCookie === 'function') res.setCookie(name, value, options);
  };

  const send = (code: number, body?: any) => {
    status(code);
    if (body === undefined) {
      if (typeof res.end === 'function') return res.end();
      if (typeof res.send === 'function') return res.send();
      return;
    }
    if (typeof res.send === 'function') return res.send(body);
    if (typeof res.json === 'function') return res.json(body);
    if (typeof res.end === 'function') return res.end(body);
  };

  const redirect = (code: number, url: string) => {
    // Express takes (status, url); Fastify sets the code then redirects.
    if (typeof res.redirect === 'function') {
      if (res.redirect.length >= 2) return (res.redirect as any)(code, url);
      status(code);
      return res.redirect(url);
    }
    header('Location', url);
    send(code);
  };

  return { status, header, cookie, send, redirect };
}
