/**
 * Step 20: OpenAPI Sanitization
 * Removes internal routes, schemas, and sensitive fields from OpenAPI spec
 */

import { OpenAPIObject, PathItemObject, OperationObject, SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import whitelist from './whitelist.json';

export interface SanitizationOptions {
  removePrivateRoutes?: boolean;
  stripInternalFields?: boolean;
  redactSecuritySchemes?: boolean;
  cleanExamples?: boolean;
  enforceErrorSchema?: boolean;
}

const DEFAULT_OPTIONS: SanitizationOptions = {
  removePrivateRoutes: true,
  stripInternalFields: true,
  redactSecuritySchemes: true,
  cleanExamples: true,
  enforceErrorSchema: true,
};

/**
 * Sanitize OpenAPI spec for public consumption
 */
export function sanitizeOpenAPI(
  spec: OpenAPIObject,
  options: SanitizationOptions = DEFAULT_OPTIONS,
): OpenAPIObject {
  const sanitized: OpenAPIObject = JSON.parse(JSON.stringify(spec));

  // 1. Remove private routes
  if (options.removePrivateRoutes) {
    sanitized.paths = filterPrivatePaths(sanitized.paths || {});
  }

  // 2. Strip internal fields from schemas
  if (options.stripInternalFields) {
    sanitized.components = stripInternalSchemas(sanitized.components);
  }

  // 3. Remove private security schemes
  if (options.redactSecuritySchemes) {
    sanitized.components = redactSecuritySchemes(sanitized.components);
  }

  // 4. Clean response examples (keep 2xx only)
  if (options.cleanExamples) {
    sanitized.paths = cleanResponseExamples(sanitized.paths || {});
  }

  // 5. Enforce standard error schema
  if (options.enforceErrorSchema) {
    sanitized.paths = enforceErrorSchema(sanitized.paths || {});
    sanitized.components = addStandardErrorSchema(sanitized.components);
  }

  // 6. Rewrite server URLs
  sanitized.servers = [
    {
      url: process.env.PUBLIC_API_BASE_URL || 'https://quote.frigate.ai',
      description: 'Production API',
    },
    {
      url: 'https://staging.quote.frigate.ai',
      description: 'Staging API',
    },
  ];

  // 7. Add metadata
  sanitized.info = {
    ...sanitized.info,
    contact: {
      name: 'Frigate API Support',
      email: 'api-support@frigate.ai',
      url: 'https://docs.frigate.ai',
    },
    license: {
      name: 'Proprietary',
      url: 'https://frigate.ai/terms',
    },
    'x-logo': {
      url: 'https://frigate.ai/logo.png',
      altText: 'Frigate Logo',
    },
  };

  return sanitized;
}

/**
 * Filter out private paths based on whitelist
 */
function filterPrivatePaths(paths: Record<string, PathItemObject>): Record<string, PathItemObject> {
  const filtered: Record<string, PathItemObject> = {};

  for (const [path, item] of Object.entries(paths)) {
    // Check if path matches any private prefix
    const isPrivate = whitelist.privateRoutePrefixes.some((prefix) =>
      path.startsWith(prefix),
    );

    if (isPrivate) {
      continue;
    }

    // Check if path is explicitly in public whitelist
    const isWhitelisted = whitelist.publicRoutes.some((route) => {
      const routePattern = route.replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(path);
    });

    if (isWhitelisted) {
      filtered[path] = item;
    }
  }

  return filtered;
}

/**
 * Strip internal fields from component schemas
 */
function stripInternalSchemas(components: any): any {
  if (!components || !components.schemas) {
    return components;
  }

  const schemas = { ...components.schemas };

  for (const [schemaName, schema] of Object.entries(schemas)) {
    if (typeof schema === 'object' && schema !== null) {
      schemas[schemaName] = stripFieldsFromSchema(schema as SchemaObject);
    }
  }

  return {
    ...components,
    schemas,
  };
}

/**
 * Recursively strip internal fields from schema
 */
function stripFieldsFromSchema(schema: SchemaObject): SchemaObject {
  const cleaned: SchemaObject = { ...schema };

  if (cleaned.properties) {
    const properties = { ...cleaned.properties };

    // Remove internal fields
    for (const field of whitelist.strippedFields) {
      delete properties[field];
    }

    // Recursively clean nested objects
    for (const [key, prop] of Object.entries(properties)) {
      if (typeof prop === 'object' && prop !== null) {
        properties[key] = stripFieldsFromSchema(prop as SchemaObject);
      }
    }

    cleaned.properties = properties;

    // Update required array
    if (cleaned.required) {
      cleaned.required = cleaned.required.filter(
        (field) => !whitelist.strippedFields.includes(field),
      );
    }
  }

  // Clean items (for arrays)
  if (cleaned.items && typeof cleaned.items === 'object') {
    cleaned.items = stripFieldsFromSchema(cleaned.items as SchemaObject);
  }

  // Clean allOf, oneOf, anyOf
  if (cleaned.allOf) {
    cleaned.allOf = cleaned.allOf.map((s) =>
      typeof s === 'object' ? stripFieldsFromSchema(s as SchemaObject) : s,
    );
  }
  if (cleaned.oneOf) {
    cleaned.oneOf = cleaned.oneOf.map((s) =>
      typeof s === 'object' ? stripFieldsFromSchema(s as SchemaObject) : s,
    );
  }
  if (cleaned.anyOf) {
    cleaned.anyOf = cleaned.anyOf.map((s) =>
      typeof s === 'object' ? stripFieldsFromSchema(s as SchemaObject) : s,
    );
  }

  return cleaned;
}

/**
 * Remove private security schemes
 */
function redactSecuritySchemes(components: any): any {
  if (!components || !components.securitySchemes) {
    return components;
  }

  const securitySchemes: any = {};

  for (const [name, scheme] of Object.entries(components.securitySchemes)) {
    if (whitelist.securitySchemes.public.includes(name)) {
      securitySchemes[name] = scheme;
    }
  }

  return {
    ...components,
    securitySchemes,
  };
}

/**
 * Clean response examples - keep 2xx only
 */
function cleanResponseExamples(paths: Record<string, PathItemObject>): Record<string, PathItemObject> {
  const cleaned: Record<string, PathItemObject> = {};

  for (const [path, item] of Object.entries(paths)) {
    const cleanedItem: PathItemObject = { ...item };

    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      const operation = cleanedItem[method] as OperationObject | undefined;
      if (operation && operation.responses) {
        const responses: any = {};

        for (const [status, response] of Object.entries(operation.responses)) {
          // Keep 2xx responses and 400, 401, 403, 404, 429 (common client errors)
          if (
            status.startsWith('2') ||
            ['400', '401', '403', '404', '429'].includes(status)
          ) {
            responses[status] = response;
          }
        }

        (cleanedItem[method] as OperationObject).responses = responses;
      }
    }

    cleaned[path] = cleanedItem;
  }

  return cleaned;
}

/**
 * Enforce standard error schema on 4xx/5xx responses
 */
function enforceErrorSchema(paths: Record<string, PathItemObject>): Record<string, PathItemObject> {
  const enforced: Record<string, PathItemObject> = {};

  for (const [path, item] of Object.entries(paths)) {
    const enforcedItem: PathItemObject = { ...item };

    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      const operation = enforcedItem[method] as OperationObject | undefined;
      if (operation && operation.responses) {
        for (const [status, response] of Object.entries(operation.responses)) {
          if (status.startsWith('4') || status.startsWith('5')) {
            // Replace with standard error schema reference
            (operation.responses as any)[status] = {
              description: response.description || 'Error response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            };
          }
        }
      }
    }

    enforced[path] = enforcedItem;
  }

  return enforced;
}

/**
 * Add standard error schema to components
 */
function addStandardErrorSchema(components: any): any {
  const schemas = {
    ...(components?.schemas || {}),
    ErrorResponse: {
      type: 'object',
      required: ['error', 'code', 'requestId'],
      properties: {
        error: {
          type: 'string',
          description: 'Human-readable error message',
          example: 'Invalid request parameters',
        },
        code: {
          type: 'string',
          enum: [
            'BAD_REQUEST',
            'UNAUTHORIZED',
            'FORBIDDEN',
            'NOT_FOUND',
            'CONFLICT',
            'RATE_LIMITED',
            'INTERNAL',
          ],
          description: 'Machine-readable error code',
          example: 'BAD_REQUEST',
        },
        requestId: {
          type: 'string',
          description: 'Unique request identifier for support',
          example: 'req_abc123xyz',
        },
        traceId: {
          type: 'string',
          description: 'Distributed trace ID',
          example: '3a2f1e9c8b7d6e5f4a3b2c1d0e9f8a7b',
        },
        details: {
          type: 'object',
          additionalProperties: true,
          description: 'Additional error context',
          example: {
            field: 'quantity',
            constraint: 'min',
            value: -5,
          },
        },
      },
    },
    PaginatedResponse: {
      type: 'object',
      required: ['items', 'page', 'page_size', 'total'],
      properties: {
        items: {
          type: 'array',
          items: {},
          description: 'Array of result items',
        },
        page: {
          type: 'integer',
          minimum: 1,
          description: 'Current page number',
          example: 1,
        },
        page_size: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Number of items per page',
          example: 20,
        },
        total: {
          type: 'integer',
          minimum: 0,
          description: 'Total number of items',
          example: 150,
        },
      },
    },
  };

  return {
    ...components,
    schemas,
  };
}

/**
 * Generate cache headers for OpenAPI JSON
 */
export function getOpenAPICacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=300', // 5 minutes
    'ETag': `"${Date.now()}"`,
    'Content-Type': 'application/json',
  };
}
