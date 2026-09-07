import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  /** Populated by JwtStrategy-authenticated requests. */
  actorUserId?: string;
  actorEmail?: string;
  organizationId?: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  get(): RequestContext | undefined {
    return storage.getStore();
  },
  /** Lets guards/strategies enrich the context once the actor is known. */
  patch(patch: Partial<RequestContext>): void {
    const store = storage.getStore();
    if (store) Object.assign(store, patch);
  },
  run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn);
  },
};

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'Tablet';
  if (/mobile|android|iphone/.test(ua)) return 'Mobile';
  if (/curl|postman|axios|node-fetch|python-requests/.test(ua)) return 'API Client';
  if (ua) return 'Desktop';
  return 'Unknown';
}

/**
 * Opens an async-local scope per request so any service down the call stack can
 * attach correlation data to an audit record without changing its signature.
 * Also echoes the id back as `X-Request-Id` for client-side correlation.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    const requestId =
      (typeof incoming === 'string' && incoming.trim()) || `REQ-${randomUUID()}`;

    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ||
      req.socket?.remoteAddress ||
      'unknown';

    const userAgent = (req.headers['user-agent'] as string) || '';

    res.setHeader('X-Request-Id', requestId);

    requestContext.run(
      {
        requestId,
        ipAddress,
        userAgent: userAgent || 'unknown',
        deviceType: detectDeviceType(userAgent),
      },
      () => next(),
    );
  }
}
