import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { STATUS_CODES } from '../constants';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((res) => {
        // If already formatted with standard envelope, pass through
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
          return res;
        }

        const statusEntry = Object.values(STATUS_CODES).find((item) => item.code === statusCode);
        const statusText = statusEntry ? statusEntry.status : 'SUCCESS';
        const defaultMsg = statusEntry ? statusEntry.defaultMessage : 'Request processed successfully';

        return {
          success: true,
          statusCode,
          status: statusText,
          message: (res && res.message) || defaultMsg,
          data: res && res.data !== undefined ? res.data : res,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
            version: 'v1',
            ...(res && res.meta ? res.meta : {}),
          },
        };
      }),
    );
  }
}
