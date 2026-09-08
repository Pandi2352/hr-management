import { NestFactory } from '@nestjs/core';
import { LoggerHelper, NestLoggerAdapter } from './common/logger';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  // bufferLogs holds framework output until useLogger installs the adapter, so
  // nothing emitted during bootstrap escapes in Nest's default format.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(new NestLoggerAdapter());

  const logger = LoggerHelper.Instance.child('Bootstrap');

  // Prefix, cookie parsing, validation, filters and interceptors — shared with
  // the e2e suite so tests hit the identical request pipeline.
  configureApp(app);

  // CORS Configuration
  const corsOriginEnv = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*';
  const corsOrigin =
    corsOriginEnv === '*'
      ? true // Reflects request origin dynamically, allowing withCredentials: true
      : corsOriginEnv.includes(',')
      ? corsOriginEnv.split(',').map((s) => s.trim())
      : corsOriginEnv;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });

  // OpenAPI / Swagger Documentation Setup
  const { setupSwagger } = await import('./config/swagger.config');
  setupSwagger(app);

  const port = process.env.PORT || 3000;
  // Flush transports on SIGTERM instead of losing buffered lines.
  app.enableShutdownHooks();
  process.on('beforeExit', () => LoggerHelper.Instance.close());

  await app.listen(port);

  logger.info(null, `🚀 PeopleOS API running on: http://localhost:${port}/api/v1`);
  logger.info(null, `📖 Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
