import { Attributes, metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('worker.ollama');

const latencyHistogram = meter.createHistogram('ai_assistant_ollama_latency_seconds', {
  description: 'Latency for Ollama chat completions used by admin assistant',
  unit: 's',
});

const failureCounter = meter.createCounter('ai_assistant_ollama_failures_total', {
  description: 'Total Ollama chat invocation failures for admin assistant',
});

export function recordOllamaLatency(durationMs: number, attributes: Attributes = {}): void {
  latencyHistogram.record(durationMs / 1000, attributes);
}

export function incrementOllamaFailure(attributes: Attributes = {}): void {
  failureCounter.add(1, attributes);
}
