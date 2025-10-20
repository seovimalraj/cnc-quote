/**
 * CLI helper for scheduling AI model lifecycle jobs.
 * Usage:
 *   pnpm ai:train --model pricing-rationale --target v2025.10.20
 *   pnpm ai:rollback --model pricing-rationale --target v2025.10.15
 *   pnpm ai:bias-review --model pricing-rationale
 */

import 'dotenv/config';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import {
  type ModelId,
  type ModelLifecycleJobV1,
  getModelConfig,
  MODEL_LIFECYCLE_QUEUE,
} from '@cnc-quote/shared';

const QUEUE_NAME = MODEL_LIFECYCLE_QUEUE;
const JOB_NAME = 'ai-model-lifecycle:dispatch';

type Command = 'train' | 'rollback' | 'bias-review';

type ParsedArgs = {
  command: Command;
  options: Record<string, string>;
};

function usage(message?: string): never {
  if (message) {
    // eslint-disable-next-line no-console
    console.error(`Error: ${message}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Usage:
  pnpm ai:train --model <modelId> [--target <version>] [--git-ref <sha>] [--reason <text>]
  pnpm ai:rollback --model <modelId> --target <version> [--reason <text>]
  pnpm ai:bias-review --model <modelId> [--reason <text>]
`);
  process.exit(1);
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) {
    usage('Missing command');
  }
  const [commandRaw, ...rest] = argv;
  if (!['train', 'rollback', 'bias-review'].includes(commandRaw)) {
    usage(`Unsupported command ${commandRaw}`);
  }
  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const [key, inlineValue] = token.split('=');
    const optionKey = key.replace(/^--/, '');
    if (inlineValue !== undefined) {
      options[optionKey] = inlineValue;
      continue;
    }
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) {
      options[optionKey] = 'true';
      continue;
    }
    options[optionKey] = next;
    i += 1;
  }
  return { command: commandRaw as Command, options };
}

function resolveModel(options: Record<string, string>): ModelId {
  const model = options.model as ModelId | undefined;
  if (!model) {
    usage('Missing --model');
  }
  // Throws if model id is unknown
  getModelConfig(model);
  return model;
}

function resolveRedisConnection() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: Number(url.port || '6379'),
      password: url.password || undefined,
    };
  }
  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD ?? undefined,
  };
}

async function enqueue(command: Command, options: Record<string, string>) {
  const modelId = resolveModel(options);
  const connection = resolveRedisConnection();
  const queue = new Queue<ModelLifecycleJobV1>(QUEUE_NAME, { connection });

  try {
    const basePayload: ModelLifecycleJobV1 = {
      version: 1,
      modelId,
      action: command === 'train' ? 'retrain' : command === 'rollback' ? 'rollback' : 'bias_review',
      targetVersion: options.target ?? null,
      gitRef: options['git-ref'] ?? null,
      reason: options.reason ?? null,
      traceId: options.trace ?? randomUUID(),
      triggeredBy: options['triggered-by'] ?? null,
      runId: null,
    };

    if (basePayload.action === 'rollback' && !basePayload.targetVersion) {
      usage('Rollback requires --target <version>');
    }

    const jobId = `${JOB_NAME}:${modelId}:${basePayload.action}:${basePayload.traceId}`;

    await queue.add(JOB_NAME, basePayload, {
      jobId,
      removeOnComplete: true,
      removeOnFail: 25,
    });

    // eslint-disable-next-line no-console
    console.log(`Enqueued ${command} for ${modelId} (traceId=${basePayload.traceId})`);
  } finally {
    await queue.close();
  }
}

(async () => {
  const { command, options } = parseArgs(process.argv.slice(2));
  await enqueue(command, options);
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
