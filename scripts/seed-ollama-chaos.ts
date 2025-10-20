#!/usr/bin/env ts-node

import { performance } from 'perf_hooks';
import { setTimeout as sleep } from 'timers/promises';

interface ChaosResult {
  endpoint: string;
  ok: boolean;
  latencyMs: number;
  status: number;
  error?: string;
}

const DEFAULT_ENDPOINTS = ['http://localhost:11435'];
const DEFAULT_MODEL = 'llama3.1:8b';
const DEFAULT_PROMPT = 'Provide a two sentence summary of CNC milling risk mitigation strategies.';
const DEFAULT_TIMEOUT = 15000;

async function pingEndpoint(endpoint: string, model: string, prompt: string, timeoutMs: number): Promise<ChaosResult> {
  const controller = new AbortController();
  const start = performance.now();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a quality assurance probe validating Ollama high-availability.' },
          { role: 'user', content: prompt }
        ],
        options: { temperature: 0.2, top_p: 0.9 }
      }),
      signal: controller.signal
    });

    const latencyMs = performance.now() - start;
    clearTimeout(timeoutHandle);

    if (!response.ok) {
      return { endpoint, ok: false, latencyMs, status: response.status, error: await response.text() };
    }

    const payload = (await response.json()) as { message?: { content?: string } };
    if (!payload?.message?.content) {
      return { endpoint, ok: false, latencyMs, status: response.status, error: 'Empty response content' };
    }

    return { endpoint, ok: true, latencyMs, status: response.status };
  } catch (error) {
    clearTimeout(timeoutHandle);
    const latencyMs = performance.now() - start;
    return { endpoint, ok: false, latencyMs, status: 0, error: (error as Error).message };
  }
}

async function main(): Promise<void> {
  const endpoints = (process.env.CHAOS_OLLAMA_ENDPOINTS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const targets = endpoints.length > 0 ? endpoints : DEFAULT_ENDPOINTS;
  const model = process.env.CHAOS_OLLAMA_MODEL ?? DEFAULT_MODEL;
  const prompt = process.env.CHAOS_OLLAMA_PROMPT ?? DEFAULT_PROMPT;
  const timeoutMs = Number.parseInt(process.env.CHAOS_OLLAMA_TIMEOUT_MS ?? '', 10) || DEFAULT_TIMEOUT;
  const pauseMs = Number.parseInt(process.env.CHAOS_OLLAMA_PAUSE_MS ?? '', 10) || 250;

  console.log(`🌪️  Seeding chaos traffic across ${targets.length} Ollama endpoint(s)`);
  console.log(`     Model: ${model}`);
  console.log(`     Timeout: ${timeoutMs}ms`);

  let failures = 0;
  for (const endpoint of targets) {
    const result = await pingEndpoint(endpoint, model, prompt, timeoutMs);
    if (result.ok) {
      console.log(`   ✅ ${endpoint} responded ${result.status} in ${result.latencyMs.toFixed(0)}ms`);
    } else {
      failures += 1;
      console.error(`   ❌ ${endpoint} failed (${result.status || 'ERR'}) after ${result.latencyMs.toFixed(0)}ms :: ${result.error ?? 'unknown error'}`);
    }

    if (pauseMs > 0) {
      await sleep(pauseMs);
    }
  }

  if (failures > 0) {
    console.error(`\n❌ Chaos seeding completed with ${failures} failure(s)`);
    process.exit(1);
  }

  console.log('\n✅ Chaos seeding completed successfully');
}

main().catch((error) => {
  console.error('❌ Chaos seeding crashed', error);
  process.exit(1);
});
