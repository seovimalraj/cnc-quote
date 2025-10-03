/**
 * Step 18: Worker Configuration
 * Centralized environment variable validation and configuration
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Redis
  redisUrl: z.string().url(),

  // Worker settings
  workerConcurrency: z.coerce.number().int().min(1).default(4),
  workerMaxAttempts: z.coerce.number().int().min(1).default(5),
  jobTtlSeconds: z.coerce.number().int().min(3600).default(604800), // 7 days

  // Service URLs
  apiBaseUrl: z.string().url(),
  cadServiceUrl: z.string().url(),

  // Observability
  otelEndpoint: z.string().url().optional(),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Health check
  healthPort: z.coerce.number().int().min(1024).max(65535).default(3001),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    redisUrl: process.env.REDIS_URL,
    workerConcurrency: process.env.WORKER_CONCURRENCY_DEFAULT,
    workerMaxAttempts: process.env.WORKER_MAX_ATTEMPTS_DEFAULT,
    jobTtlSeconds: process.env.JOB_TTL_SECONDS,
    apiBaseUrl: process.env.API_BASE_URL,
    cadServiceUrl: process.env.CAD_SERVICE_URL,
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    nodeEnv: process.env.NODE_ENV,
    healthPort: process.env.HEALTH_PORT,
  };

  try {
    return configSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();
