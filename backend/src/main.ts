import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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
  await app.listen(port);

  logger.log(`🚀 PeopleOS API running on: http://localhost:${port}/api/v1`);
  logger.log(`📖 Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
