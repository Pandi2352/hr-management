import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerConfigOptions {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
}

/**
 * Sets up OpenAPI / Swagger documentation for the application.
 */
export function setupSwagger(
  app: INestApplication,
  options: SwaggerConfigOptions = {},
): void {
  const title = options.title || 'PeopleOS API';
  const description =
    options.description ||
    'Enterprise HR & Workforce Management Platform REST API — Auth, Employees, Payroll, and Approvals';
  const version = options.version || '1.0';
  const path = options.path || 'api/docs';

  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Session tokens, login, logout, and identity lifecycle')
    .addTag('Users', 'User account management, status, and credentials')
    .addTag('Organization', 'Departments, designations, and corporate reporting tree')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      displayRequestDuration: true,
      docExpansion: 'none',
    },
    customSiteTitle: 'PeopleOS API Documentation',
  });
}
