import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, STATUS_CODES } from '../constants';
import { ApiErrorResponse } from '../dto/api-response.dto';
import { LoggerHelper } from '../logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let message: string = STATUS_CODES.INTERNAL_SERVER_ERROR.defaultMessage;
    let details: any = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        message = body.message || message;
        errorCode = body.errorCode || this.mapStatusToErrorCode(statusCode);
        details = body.errors || body.details || null;
      }
    }

    const statusText = this.mapStatusToText(statusCode);

    /*
     * Every failed request is logged here rather than in HttpLoggingInterceptor.
     * Guards run *before* interceptors in Nest's pipeline, so a 401 from
     * JwtAuthGuard or a 403 from PermissionsGuard never reaches an interceptor —
     * without this, exactly the rejections worth investigating would be the ones
     * missing from the logs.
     *
     * 5xx logs the stack; 4xx is expected traffic and logs at warn without one.
     */
    const httpLog = LoggerHelper.Instance.child('HTTP');
    const summary = `${request.method} ${request.originalUrl?.split('?')[0] ?? request.url} ${statusCode}`;

    if (statusCode >= 500) {
      httpLog.error(null, summary, exception instanceof Error ? exception : { statusCode });
    } else {
      httpLog.warn(null, summary, {
        statusCode,
        errorCode,
        userId: (request as any).user?.userId,
      });
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode,
      status: statusText,
      errorCode,
      message: Array.isArray(message) ? message.join(', ') : message,
      details,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(statusCode).json(errorPayload);
  }

  private mapStatusToText(code: number): string {
    const entry = Object.values(STATUS_CODES).find((item) => item.code === code);
    return entry ? entry.status : 'ERROR';
  }

  private mapStatusToErrorCode(code: number): string {
    const entry = Object.values(STATUS_CODES).find((item) => item.code === code);
    return (entry && 'errorCode' in entry && entry.errorCode) || ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
