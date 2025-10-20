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
  supabaseUrl: z.string().url(),
  supabaseServiceKey: z.string().min(1),

  // LLM
  modelGatewayUrl: z.string().url(),
  ollamaModel: z.string().min(1).default('llama3.1:8b'),
  ollamaTimeoutMs: z.coerce.number().int().min(1000).max(120000).default(45000),
  modelServiceKeyset: z.string().min(1),
  modelServiceActiveKeyId: z.string().min(1),
  modelServiceIssuer: z.string().min(1),
  modelServiceAudience: z.string().min(1),
  modelServiceTokenTtlSeconds: z.coerce.number().int().min(60).max(900).default(300),
  modelGatewayClientCertPath: z.string().optional(),
  modelGatewayClientKeyPath: z.string().optional(),
  modelGatewayCaPath: z.string().optional(),

  // Observability
  otelEndpoint: z.string().url().optional(),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  pushgatewayUrl: z.string().url().optional(),
  complianceRollupCron: z.string().default('0 2 * * *'),

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
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    modelGatewayUrl: process.env.MODEL_GATEWAY_URL ?? process.env.OLLAMA_HOST,
    ollamaModel: process.env.OLLAMA_MODEL,
    ollamaTimeoutMs: process.env.OLLAMA_TIMEOUT_MS,
    modelServiceKeyset: process.env.MODEL_SERVICE_KEYSET,
    modelServiceActiveKeyId: process.env.MODEL_SERVICE_ACTIVE_KEY_ID,
    modelServiceIssuer: process.env.MODEL_SERVICE_ISSUER ?? process.env.MODEL_GATEWAY_ISSUER,
    modelServiceAudience: process.env.MODEL_SERVICE_AUDIENCE ?? process.env.MODEL_GATEWAY_AUDIENCE,
    modelServiceTokenTtlSeconds: process.env.MODEL_SERVICE_TOKEN_TTL_SECONDS,
    modelGatewayClientCertPath: process.env.MODEL_GATEWAY_CLIENT_CERT_PATH,
    modelGatewayClientKeyPath: process.env.MODEL_GATEWAY_CLIENT_KEY_PATH,
    modelGatewayCaPath: process.env.MODEL_GATEWAY_CA_PATH,
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    nodeEnv: process.env.NODE_ENV,
    pushgatewayUrl: process.env.PUSHGATEWAY_URL,
    complianceRollupCron: process.env.COMPLIANCE_ROLLUP_CRON,
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
