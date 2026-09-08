import { CookieEntity } from './CookieEntity';
import { ErrorEntity } from './ErrorEntity';
import { HttpStatus } from './enums/HttpStatus';
import { ResultEntity } from './ResultEntity';

/** Records what an Express-style response received. */
function expressRes() {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, any>,
    cookies: [] as any[],
    body: undefined as any,
    redirectedTo: undefined as string | undefined,
    ended: false,
  };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    setHeader(name: string, value: any) {
      state.headers[name] = value;
      return res;
    },
    cookie(name: string, value: any, options?: any) {
      state.cookies.push({ name, value, options });
      return res;
    },
    redirect(url: string) {
      state.redirectedTo = url;
      return res;
    },
    send(body?: any) {
      state.body = body;
      return res;
    },
    end(body?: any) {
      state.ended = true;
      state.body = body;
      return res;
    },
  };
  return { res, state };
}

/** Fastify-style: code()/header()/setCookie(). */
function fastifyRes() {
  const state = { statusCode: 0, headers: {} as Record<string, any>, cookies: [] as any[], body: undefined as any };
  const res = {
    code(c: number) {
      state.statusCode = c;
      return res;
    },
    header(n: string, v: any) {
      state.headers[n] = v;
      return res;
    },
    setCookie(n: string, v: any, o?: any) {
      state.cookies.push({ name: n, value: v, options: o });
      return res;
    },
    send(b?: any) {
      state.body = b;
      return res;
    },
  };
  return { res, state };
}

describe('ResultEntity — JSON', () => {
  it('sends an enveloped body with the requested status', () => {
    const { res, state } = expressRes();
    ResultEntity.ok({ id: 'e1' }, undefined, { total: 1 }).sendResponse(res);

    expect(state.statusCode).toBe(HttpStatus.OK);
    // The project's canonical envelope — not a second competing shape.
    expect(state.body).toMatchObject({
      success: true,
      statusCode: 200,
      status: 'OK',
      data: { id: 'e1' },
    });
    expect(state.body.meta).toMatchObject({ total: 1 });
    expect(state.body.meta.timestamp).toEqual(expect.any(String));
  });

  it('always carries data and meta, so clients need no shape check', () => {
    const { res, state } = expressRes();
    ResultEntity.ok().sendResponse(res);

    expect(state.body).toHaveProperty('data', null);
    expect(state.body).toHaveProperty('meta');
    expect(state.body).toHaveProperty('message');
  });

  it('created() uses 201', () => {
    const { res, state } = expressRes();
    ResultEntity.created({ id: 'e1' }).sendResponse(res);
    expect(state.statusCode).toBe(HttpStatus.CREATED);
  });

  it('omits transport-only fields from the body', () => {
    const { res, state } = expressRes();
    const r = ResultEntity.ok({ ok: true });
    r.setHeader('X-Custom', 'v');
    r.sendResponse(res);

    expect(state.body).not.toHaveProperty('content_type');
    expect(state.body).not.toHaveProperty('current_context');
    expect(state.body).not.toHaveProperty('headers');
    expect(state.body).not.toHaveProperty('cookies');
  });

  it('does not mutate itself while sending, so it can be sent twice', () => {
    const first = expressRes();
    const second = expressRes();
    const r = ResultEntity.ok({ n: 1 });

    r.sendResponse(first.res);
    r.sendResponse(second.res);

    expect(first.state.body).toEqual(second.state.body);
    expect(r.content_type).toBe('json');
  });

  it('sends data alone in direct mode', () => {
    const { res, state } = expressRes();
    new ResultEntity().setDataDirect({ data: { raw: true } }).sendResponse(res);
    expect(state.body).toEqual({ raw: true });
  });
});

describe('ResultEntity — headers, cookies, caching', () => {
  it('sets no-store headers by default and Expires as a string', () => {
    const { res, state } = expressRes();
    ResultEntity.ok().sendResponse(res);

    expect(state.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
    // Node throws on a numeric header value; the original passed 0.
    expect(state.headers['Expires']).toBe('0');
    expect(typeof state.headers['Expires']).toBe('string');
  });

  it('omits cache headers when asked', () => {
    const { res, state } = expressRes();
    ResultEntity.ok().sendResponse(res, false);
    expect(state.headers['Cache-Control']).toBeUndefined();
  });

  it('lets caller headers override the defaults', () => {
    const { res, state } = expressRes();
    const r = ResultEntity.ok();
    r.setHeader('Cache-Control', 'public, max-age=60');
    r.sendResponse(res);

    expect(state.headers['Cache-Control']).toBe('public, max-age=60');
  });

  it('writes cookies through the Express API', () => {
    const { res, state } = expressRes();
    const r = ResultEntity.ok();
    r.addCookie(CookieEntity.secureToken('refreshToken', 'abc', { path: '/api/v1/auth' }));
    r.sendResponse(res);

    expect(state.cookies).toHaveLength(1);
    expect(state.cookies[0].name).toBe('refreshToken');
    expect(state.cookies[0].options).toMatchObject({ httpOnly: true, sameSite: 'lax' });
  });

  it('clear() produces an immediately-expiring cookie', () => {
    const c = CookieEntity.clear('refreshToken', { path: '/api/v1/auth' });
    expect(c.options.maxAge).toBe(0);
    expect(c.options.path).toBe('/api/v1/auth');
  });

  it('echoes the correlation id when present', () => {
    const { res, state } = expressRes();
    const r = new ResultEntity({ current_context: { x_request_id: 'REQ-1' } });
    r.setData({ data: {} });
    r.sendResponse(res);

    expect(state.headers['x-request-id']).toBe('REQ-1');
  });
});

describe('ResultEntity — other content types', () => {
  it('sends HTML with the right content type', () => {
    const { res, state } = expressRes();
    new ResultEntity().setHTML({ html: '<p>hi</p>' }).sendResponse(res);

    expect(state.headers['Content-Type']).toBe('text/html; charset=UTF-8');
    expect(state.body).toBe('<p>hi</p>');
  });

  it('redirects with a location and status', () => {
    const { res, state } = expressRes();
    new ResultEntity().setRedirect({ url: 'https://example.test/next' }).sendResponse(res);

    expect(state.statusCode).toBe(HttpStatus.FOUND);
    expect(state.redirectedTo).toBe('https://example.test/next');
  });

  it('sends a CSV as a named attachment', () => {
    const { res, state } = expressRes();
    new ResultEntity().setCSV({ csv: 'a,b\n1,2', filename: 'export.csv' }).sendResponse(res);

    expect(state.headers['Content-Type']).toBe('text/csv; charset=UTF-8');
    expect(state.headers['Content-Disposition']).toContain('export.csv');
  });

  it('url-encodes a filename so it cannot break the header', () => {
    const { res, state } = expressRes();
    new ResultEntity()
      .setFile({ file: Buffer.from('x'), filename: 'a"b\nc.pdf', mime_type: 'application/pdf' })
      .sendResponse(res);

    const disposition = state.headers['Content-Disposition'];
    expect(disposition).not.toContain('"b');
    expect(disposition).not.toContain('\n');
  });

  it('pipes a stream instead of buffering it', () => {
    const { res, state } = expressRes();
    const piped: any[] = [];
    const stream = { pipe: (dest: any) => piped.push(dest) };

    new ResultEntity().setFile({ file: stream, filename: 'doc.pdf' }).sendResponse(res);

    expect(piped).toHaveLength(1);
    expect(state.statusCode).toBe(HttpStatus.OK);
  });
});

describe('ResultEntity — errors', () => {
  it('keeps a typed error’s public shape', () => {
    const { res, state } = expressRes();
    ResultEntity.fromError(ErrorEntity.notFound('Employee not found')).sendResponse(res);

    expect(state.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(state.body.error).toEqual({
      error: 'not_found',
      error_description: 'Employee not found',
    });
    expect(state.body.success).toBe(false);
  });

  it('never leaks internal detail from a typed error', () => {
    const { res, state } = expressRes();
    const err = ErrorEntity.badRequest('Invalid payload', {
      internal_error: new Error('E11000 duplicate key employees.workEmail_1'),
      meta_data: { field: 'workEmail' },
    });

    ResultEntity.fromError(err).sendResponse(res);

    const serialized = JSON.stringify(state.body);
    expect(serialized).not.toContain('E11000');
    expect(serialized).not.toContain('workEmail_1');
    expect(state.body.error.error_description).toBe('Invalid payload');
  });

  it('replaces an untyped error with a generic 500 body', () => {
    const { res, state } = expressRes();
    const mongooseish = Object.assign(new Error('Cast to ObjectId failed at path "_id"'), {
      name: 'CastError',
    });

    ResultEntity.fromError(mongooseish).sendResponse(res);

    expect(state.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.stringify(state.body)).not.toContain('ObjectId');
    expect(state.body.error.error).toBe('internal_error');
  });

  it('does not destroy internal detail when projecting', () => {
    const err = ErrorEntity.internal(new Error('boom'), { meta_data: { a: 1 } });
    err.toPublicJSON();

    // The original stays intact for the logger, unlike a `delete`-based version.
    expect(err.internal_error).toBeInstanceOf(Error);
    expect(err.meta_data).toEqual({ a: 1 });
  });

  it('survives instanceof after compilation', () => {
    expect(ErrorEntity.notFound()).toBeInstanceOf(ErrorEntity);
    expect(ErrorEntity.notFound()).toBeInstanceOf(Error);
  });

  it('escapes interpolated values in the HTML error page', () => {
    const { res, state } = expressRes();
    new ResultEntity()
      .setErrorHTML({ error_description: '<script>alert(1)</script>' })
      .sendResponse(res);

    expect(state.body).not.toContain('<script>');
    expect(state.body).toContain('&lt;script&gt;');
  });
});

describe('ResultEntity — server adapter', () => {
  it('works against a Fastify-style response', () => {
    const { res, state } = fastifyRes();
    const r = ResultEntity.ok({ id: 1 });
    r.addCookie(new CookieEntity('a', 'b', { path: '/' }));
    r.sendResponse(res);

    expect(state.statusCode).toBe(200);
    expect(state.headers['Cache-Control']).toBeDefined();
    expect(state.cookies[0].name).toBe('a');
    expect(state.body).toMatchObject({ success: true, data: { id: 1 } });
  });

  it('ends without a body for 204', () => {
    const { res, state } = expressRes();
    ResultEntity.noContent().sendResponse(res);

    expect(state.statusCode).toBe(HttpStatus.NO_CONTENT);
    expect(state.body).toBeUndefined();
  });
});
