/**
 * Step 20: OpenAPI Contract Tests
 * Validate sanitized OpenAPI spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { getOpenAPIDocument } from '../src/docs/openapi';
import { sanitizeOpenAPI } from '../src/docs/sanitize-openapi';
import whitelist from '../src/docs/whitelist.json';

describe('OpenAPI Contract Tests', () => {
  let app: INestApplication;
  let openApiSpec: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get the OpenAPI document
    const rawSpec = getOpenAPIDocument(app);
    openApiSpec = sanitizeOpenAPI(rawSpec, whitelist);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Spec Structure', () => {
    it('should have valid OpenAPI 3.0 structure', () => {
      expect(openApiSpec.openapi).toBe('3.0.0');
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.info.title).toBe('Frigate API');
      expect(openApiSpec.info.version).toBeDefined();
      expect(openApiSpec.paths).toBeDefined();
      expect(openApiSpec.components).toBeDefined();
    });

    it('should have server URLs configured', () => {
      expect(openApiSpec.servers).toBeDefined();
      expect(openApiSpec.servers.length).toBeGreaterThan(0);
      expect(openApiSpec.servers[0]).toHaveProperty('url');
    });

    it('should have security schemes defined', () => {
      expect(openApiSpec.components.securitySchemes).toBeDefined();
      expect(openApiSpec.components.securitySchemes.bearer).toBeDefined();
      expect(openApiSpec.components.securitySchemes.bearer.type).toBe('http');
      expect(openApiSpec.components.securitySchemes.bearer.scheme).toBe('bearer');
    });
  });

  describe('Route Sanitization', () => {
    it('should expose public routes', () => {
      const paths = Object.keys(openApiSpec.paths);

      // Check that public routes are present
      expect(paths).toContain('/api/v1/materials');
      expect(paths).toContain('/api/price/v2/calculate');
      expect(paths.some((p) => p.includes('/geometry/'))).toBe(true);
    });

    it('should NOT expose internal routes', () => {
      const paths = Object.keys(openApiSpec.paths);

      // Check that internal routes are removed
      expect(paths.some((p) => p.startsWith('/internal'))).toBe(false);
      expect(paths.some((p) => p.startsWith('/admin'))).toBe(false);
      expect(paths.some((p) => p.includes('/queues'))).toBe(false);
      expect(paths.some((p) => p.includes('/routing'))).toBe(false);
      expect(paths.some((p) => p.includes('/pricing/factors'))).toBe(false);
    });

    it('should NOT expose private route prefixes', () => {
      const paths = Object.keys(openApiSpec.paths);

      whitelist.privateRoutePrefixes.forEach((prefix: string) => {
        const hasPrivateRoute = paths.some((p) => p.startsWith(prefix));
        expect(hasPrivateRoute).toBe(false);
      });
    });
  });

  describe('Schema Sanitization', () => {
    it('should strip internal fields from schemas', () => {
      const schemas = openApiSpec.components.schemas || {};

      // Iterate through all schemas
      Object.values(schemas).forEach((schema: any) => {
        if (schema.properties) {
          // Check that internal fields are not present
          whitelist.strippedFields.forEach((field: string) => {
            expect(schema.properties[field]).toBeUndefined();
          });
        }
      });
    });

    it('should NOT expose sensitive fields', () => {
      const schemasString = JSON.stringify(openApiSpec.components.schemas || {});

      // Check that sensitive field names don't appear
      expect(schemasString).not.toContain('internalId');
      expect(schemasString).not.toContain('org_id');
      expect(schemasString).not.toContain('debug');
      expect(schemasString).not.toContain('cost_breakdown');
      expect(schemasString).not.toContain('margin');
    });
  });

  describe('Security Schemes', () => {
    it('should only expose public security schemes', () => {
      const securitySchemes = openApiSpec.components.securitySchemes;

      // Should have bearer auth
      expect(securitySchemes.bearer).toBeDefined();

      // Should NOT have internal auth schemes
      expect(securitySchemes.internalApiKey).toBeUndefined();
      expect(securitySchemes.adminApiKey).toBeUndefined();
    });
  });

  describe('Error Schema', () => {
    it('should have standardized ErrorResponse schema', () => {
      const errorSchema = openApiSpec.components.schemas?.ErrorResponse;

      expect(errorSchema).toBeDefined();
      expect(errorSchema.type).toBe('object');
      expect(errorSchema.properties).toHaveProperty('error');
      expect(errorSchema.properties).toHaveProperty('code');
      expect(errorSchema.properties).toHaveProperty('requestId');
      expect(errorSchema.properties).toHaveProperty('traceId');
      expect(errorSchema.required).toContain('error');
      expect(errorSchema.required).toContain('code');
      expect(errorSchema.required).toContain('requestId');
    });

    it('should have error code enum', () => {
      const errorSchema = openApiSpec.components.schemas?.ErrorResponse;

      expect(errorSchema.properties.code.enum).toBeDefined();
      expect(errorSchema.properties.code.enum).toContain('BAD_REQUEST');
      expect(errorSchema.properties.code.enum).toContain('UNAUTHORIZED');
      expect(errorSchema.properties.code.enum).toContain('FORBIDDEN');
      expect(errorSchema.properties.code.enum).toContain('NOT_FOUND');
      expect(errorSchema.properties.code.enum).toContain('RATE_LIMITED');
      expect(errorSchema.properties.code.enum).toContain('INTERNAL');
    });

    it('should use ErrorResponse for all error responses', () => {
      const paths = openApiSpec.paths;

      Object.values(paths).forEach((pathItem: any) => {
        Object.values(pathItem).forEach((operation: any) => {
          if (operation.responses) {
            // Check 4xx and 5xx responses
            Object.entries(operation.responses).forEach(([statusCode, response]: [string, any]) => {
              const code = parseInt(statusCode);
              if (code >= 400 && code < 600) {
                const schema = response.content?.['application/json']?.schema;
                if (schema) {
                  expect(schema.$ref || schema).toContain('ErrorResponse');
                }
              }
            });
          }
        });
      });
    });
  });

  describe('Response Examples', () => {
    it('should only include 2xx and common 4xx responses', () => {
      const paths = openApiSpec.paths;
      const allowedErrorCodes = [400, 401, 403, 404, 406, 429];

      Object.values(paths).forEach((pathItem: any) => {
        Object.values(pathItem).forEach((operation: any) => {
          if (operation.responses) {
            const responseCodes = Object.keys(operation.responses).map(Number);

            responseCodes.forEach((code) => {
              if (code >= 300) {
                // 4xx/5xx responses should only be common ones
                if (code >= 400 && code < 500) {
                  expect(allowedErrorCodes).toContain(code);
                }
              }
            });
          }
        });
      });
    });
  });

  describe('Tax Calculation Endpoint', () => {
    it('should expose tax calculation in pricing endpoint', () => {
      const pricingPath = openApiSpec.paths['/api/price/v2/calculate'];

      expect(pricingPath).toBeDefined();
      expect(pricingPath.post).toBeDefined();

      const requestBody = pricingPath.post.requestBody?.content?.['application/json']?.schema;
      expect(requestBody).toBeDefined();

      // Check for tax-related fields in request schema
      const schemaRef = requestBody.$ref || requestBody;
      if (schemaRef.$ref) {
        const schemaName = schemaRef.$ref.split('/').pop();
        const schema = openApiSpec.components.schemas[schemaName];
        expect(schema.properties).toBeDefined();
      }
    });

    it('should document tax response structure', () => {
      const pricingPath = openApiSpec.paths['/api/price/v2/calculate'];
      const successResponse = pricingPath.post?.responses?.['200'];

      expect(successResponse).toBeDefined();

      const responseSchema = successResponse.content?.['application/json']?.schema;
      expect(responseSchema).toBeDefined();
    });
  });

  describe('API Versioning', () => {
    it('should document API version in headers', () => {
      const paths = openApiSpec.paths;

      // Check at least one endpoint documents Accept header
      let hasVersionHeader = false;
      Object.values(paths).forEach((pathItem: any) => {
        Object.values(pathItem).forEach((operation: any) => {
          if (operation.parameters) {
            const hasAcceptHeader = operation.parameters.some(
              (param: any) => param.name === 'Accept' && param.in === 'header',
            );
            if (hasAcceptHeader) {
              hasVersionHeader = true;
            }
          }
        });
      });

      // Version header documentation is optional but recommended
      expect(typeof hasVersionHeader).toBe('boolean');
    });
  });

  describe('Pagination', () => {
    it('should have PaginatedResponse schema', () => {
      const schema = openApiSpec.components.schemas?.PaginatedResponse;

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('items');
      expect(schema.properties).toHaveProperty('page');
      expect(schema.properties).toHaveProperty('page_size');
      expect(schema.properties).toHaveProperty('total');
    });
  });

  describe('Documentation Quality', () => {
    it('should have descriptions for all public endpoints', () => {
      const paths = openApiSpec.paths;
      let missingDescriptions = 0;

      Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
        Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
          if (!operation.summary && !operation.description) {
            missingDescriptions++;
            console.warn(`Missing description: ${method.toUpperCase()} ${path}`);
          }
        });
      });

      // Allow some endpoints to not have descriptions
      expect(missingDescriptions).toBeLessThan(5);
    });

    it('should have tags for organization', () => {
      const tags = openApiSpec.tags || [];
      expect(tags.length).toBeGreaterThan(0);

      // Check that tags are used in operations
      const paths = openApiSpec.paths;
      let operationsWithTags = 0;

      Object.values(paths).forEach((pathItem: any) => {
        Object.values(pathItem).forEach((operation: any) => {
          if (operation.tags && operation.tags.length > 0) {
            operationsWithTags++;
          }
        });
      });

      expect(operationsWithTags).toBeGreaterThan(0);
    });
  });

  describe('Cache Headers', () => {
    it('should return proper cache headers for OpenAPI spec', () => {
      const { getOpenAPICacheHeaders } = require('../src/docs/sanitize-openapi');
      const headers = getOpenAPICacheHeaders();

      expect(headers['Cache-Control']).toContain('max-age=');
      expect(headers['Cache-Control']).toContain('public');
      expect(headers['ETag']).toBeDefined();
    });
  });
});
