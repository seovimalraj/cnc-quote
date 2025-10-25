/**
 * Step 18 + 19: OpenTelemetry Instrumentation
 * Initialize distributed tracing for worker service with trace propagation
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { config } from '../config.js';
import { logger } from './logger.js';

let sdk: NodeSDK | null = null;

const serviceName = process.env.OTEL_RESOURCE_SERVICE_NAME_WORKER || 'worker';
const samplingRate = parseFloat(process.env.TRACE_SAMPLING_RATE || '0.1');

/**
 * Initialize OpenTelemetry SDK
 */
export function initOtel(): void {
  if (!config.otelEndpoint) {
    logger.info('OpenTelemetry disabled (no OTEL_EXPORTER_OTLP_ENDPOINT)');
    return;
  }

  try {
    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.nodeEnv,
      }),
      
      traceExporter: new OTLPTraceExporter({
        url: config.otelEndpoint,
      }),
      
      // metrics disabled for now to avoid version mismatch; traces remain enabled
      
      sampler: new TraceIdRatioBasedSampler(samplingRate),
      
      textMapPropagator: new W3CTraceContextPropagator(),
      
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    logger.info({ endpoint: config.otelEndpoint, service: serviceName, sampling: samplingRate }, '✅ OpenTelemetry initialized');
  } catch (error) {
    logger.error({ error }, '❌ Failed to initialize OpenTelemetry');
  }
}

/**
 * Shutdown OpenTelemetry SDK
 */
export async function shutdownOtel(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry shut down');
    } catch (error) {
      logger.error({ error }, 'Error shutting down OpenTelemetry');
    }
  }
}
