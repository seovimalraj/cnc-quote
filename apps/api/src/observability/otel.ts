// @ts-nocheck
/**
 * Step 19: OpenTelemetry Setup for API
 * Distributed tracing with OTLP exporter
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const serviceName = process.env.OTEL_RESOURCE_SERVICE_NAME_API || 'api';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const samplingRate = parseFloat(process.env.TRACE_SAMPLING_RATE || '0.1');

/**
 * Initialize OpenTelemetry Node SDK
 */
export const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  
  traceExporter: new OTLPTraceExporter({
    url: otlpEndpoint,
    headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  }),
  
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: otlpEndpoint,
      headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    }),
    exportIntervalMillis: 60000, // 1 minute
  }),
  
  sampler: new TraceIdRatioBasedSampler(samplingRate),
  
  textMapPropagator: new W3CTraceContextPropagator(),
  
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { 
        enabled: true,
        ignoreIncomingPaths: ['/health', '/metrics'],
      },
      '@opentelemetry/instrumentation-express': { 
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': { 
        enabled: true,
        enhancedDatabaseReporting: true,
      },
      '@opentelemetry/instrumentation-redis-4': { 
        enabled: true,
      },
      '@opentelemetry/instrumentation-bullmq': { 
        enabled: true,
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Noisy, disable
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
    }),
  ],
});

/**
 * Start OpenTelemetry SDK
 */
export async function startOTel(): Promise<void> {
  try {
    await sdk.start();
    console.log(`✅ OpenTelemetry started (service=${serviceName}, endpoint=${otlpEndpoint}, sampling=${samplingRate})`);
  } catch (error) {
    console.error('❌ Failed to start OpenTelemetry:', error);
    throw error;
  }
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export async function shutdownOTel(): Promise<void> {
  try {
    await sdk.shutdown();
    console.log('✅ OpenTelemetry shut down gracefully');
  } catch (error) {
    console.error('❌ Error shutting down OpenTelemetry:', error);
  }
}

/**
 * Parse OTLP headers from environment variable
 * Format: "key1=value1,key2=value2"
 */
function parseHeaders(headersStr?: string): Record<string, string> {
  if (!headersStr) return {};
  
  const headers: Record<string, string> = {};
  headersStr.split(',').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  });
  return headers;
}
