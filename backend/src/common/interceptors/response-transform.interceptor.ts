import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';
import { ResultEntity } from '../response';

/**
 * Builds the response envelope, for every endpoint, in one place.
 *
 * Previously any handler returning an object with both `success` and `data`
 * was passed through untouched. That produced two live formats: `/employees`
 * answered `{success, data, meta}` while `/auth/login` answered the full
 * `{success, statusCode, status, message, data, meta}`. Clients had to cope
 * with both. Everything now goes through `ResultEntity`, so the shape is
 * identical on every route — additive for existing callers, since `data` and
 * `meta` keep their meaning and position.
 *
 * A handler may return either a plain value or a `ResultEntity`; the latter
 * carries its own status, message and meta.
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((res: any) => {
        const extraMeta = { path: request.url, version: 'v1' };

        // A handler that built its own entity has already chosen status,
        // message and meta — honour them rather than re-deriving.
        if (res instanceof ResultEntity) {
          if (response.status) response.status(res.code);
          return res.toResponseBody(extraMeta) as ApiResponse<T>;
        }

        const statusCode = response.statusCode || 200;
        const entity = new ResultEntity({ code: statusCode });

        // Unwrap the `{success, message, data, meta}` shape controllers return
        // today; anything else is the payload itself.
        const isEnveloped =
          res && typeof res === 'object' && !Array.isArray(res) && 'success' in res;

        entity.setData({
          code: statusCode,
          data: isEnveloped ? (res.data !== undefined ? res.data : null) : res,
          description: isEnveloped ? res.message : undefined,
          meta_data: isEnveloped ? res.meta : undefined,
        });

        return entity.toResponseBody(extraMeta) as ApiResponse<T>;
      }),
    );
  }
}
