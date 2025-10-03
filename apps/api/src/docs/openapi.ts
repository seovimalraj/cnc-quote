/**
 * Step 20: OpenAPI Configuration
 * Configure and expose public API documentation
 */

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { sanitizeOpenAPI, getOpenAPICacheHeaders } from './sanitize-openapi';

/**
 * Setup OpenAPI documentation for the application
 */
export function setupOpenAPI(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Frigate API')
    .setDescription(
      'Public REST API for CNC Quote platform. Provides instant pricing for CNC machining, sheet metal fabrication, and injection molding.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
        in: 'header',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for service-to-service authentication',
      },
      'apiKey',
    )
    .addServer('/api', 'API Gateway')
    .addTag('Health', 'Service health and status checks')
    .addTag('Quotes', 'Instant pricing and quote management')
    .addTag('Materials', 'Available materials catalog')
    .addTag('Processes', 'Manufacturing processes')
    .addTag('Geometry', 'CAD file analysis and features')
    .addTag('Uploads', 'File upload operations')
    .build();

  // Generate full OpenAPI document
  const document = SwaggerModule.createDocument(app, config);

  // Sanitize for public consumption
  const sanitizedDocument = sanitizeOpenAPI(document);

  // Setup Swagger UI at /docs
  SwaggerModule.setup('docs', app, sanitizedDocument, {
    customSiteTitle: 'Frigate API Documentation',
    customfavIcon: 'https://frigate.ai/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { font-size: 36px }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
    },
  });

  // Expose sanitized OpenAPI JSON at /openapi.json
  app.getHttpAdapter().get('/openapi.json', (req: any, res: any) => {
    const headers = getOpenAPICacheHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.json(sanitizedDocument);
  });
}

/**
 * Get OpenAPI document programmatically (for testing/SDK generation)
 */
export function getOpenAPIDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Frigate API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  return sanitizeOpenAPI(document);
}
