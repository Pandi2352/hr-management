export interface CookieOptions {
  /** Blocks JavaScript access — required for anything session-bearing. */
  httpOnly?: boolean;
  /** HTTPS only. Should be true wherever the app is not served over plain HTTP. */
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  path?: string;
  domain?: string;
  /** Lifetime in milliseconds. */
  maxAge?: number;
  expires?: Date;
  signed?: boolean;
}

export class CookieEntity {
  name = '';
  value: any;
  options: CookieOptions = {};

  constructor(name = '', value?: any, options: CookieOptions = {}) {
    this.name = name;
    this.value = value;
    this.options = options;
  }

  /**
   * A cookie carrying a session or token.
   *
   * Defaults to `httpOnly`, `sameSite: 'lax'`, and `secure` outside development
   * — the combination the refresh-token cookie already relies on. Spelling them
   * out at each call site is how one of them eventually gets left off.
   */
  static secureToken(
    name: string,
    value: string,
    options: CookieOptions = {},
  ): CookieEntity {
    return new CookieEntity(name, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      ...options,
    });
  }

  /** Expires a cookie. The options must match those it was set with, or the browser keeps it. */
  static clear(name: string, options: CookieOptions = {}): CookieEntity {
    return new CookieEntity(name, '', { path: '/', ...options, maxAge: 0, expires: new Date(0) });
  }
}
