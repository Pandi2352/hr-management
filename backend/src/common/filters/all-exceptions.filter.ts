import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, STATUS_CODES } from '../constants';
import { ApiErrorResponse } from '../dto/api-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

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
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    const statusText = this.mapStatusToText(statusCode);

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
