import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { HttpLoggingInterceptor } from './common/logger';

/**
 * Applies the global HTTP stack — prefix, cookie parsing, validation,
 * exception filter and response envelope.
 *
 * Lives outside `bootstrap()` so the e2e suite exercises the exact same
 * pipeline as production; a test that skips the ValidationPipe or the
 * exception filter proves nothing about real request handling.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new AllExceptionsFilter());
  // HTTP logging runs first so it still records a request the response
  // transform later rejects.
  app.useGlobalInterceptors(new HttpLoggingInterceptor(), new ResponseTransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );

  return app;
}
