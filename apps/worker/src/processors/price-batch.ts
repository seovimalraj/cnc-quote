/**
 * Step 18: Price Batch Processor
 * Step 19: Enhanced with OpenTelemetry trace propagation
 * Batch price N parts with current config
 */

import { Job } from 'bullmq';
import axios from 'axios';
import crypto from 'crypto';
import { trace, context, propagation } from '@opentelemetry/api';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { publishProgressBoth } from '../events/publisher.js';

export interface PriceBatchPayload {
  job_id: string;
  org_id: string;
  user_id: string;
  request_id?: string;
  quote_id: string;
  line_ids: string[];
  config: {
    process: string;
    material: string;
    quantity: number;
    region?: string;
    lead_time_class?: string;
    [key: string]: any;
  };
  batch_hash: string;
  created_at: string;
  _trace?: string; // W3C traceparent header for distributed tracing
}

export interface PriceBatchResult {
  quote_id: string;
  line_ids: string[];
  completed: number;
  failed: number;
  results: Array<{
    line_id: string;
    success: boolean;
    price?: number;
    error?: string;
  }>;
}

/**
 * Compute batch hash for idempotency
 */
export function computeBatchHash(
  quoteId: string,
  lineIds: string[],
  config: any,
): string {
  const sortedLineIds = [...lineIds].sort();
  const canonical = JSON.stringify({
    quote_id: quoteId,
    line_ids: sortedLineIds,
    config,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Process price-batch job
 */
export async function processPriceBatch(
  job: Job<PriceBatchPayload>,
): Promise<PriceBatchResult> {
  const { org_id, quote_id, line_ids, config: pricingConfig, job_id } = job.data;

  // Get tracer for manual span creation
  const tracer = trace.getTracer('worker');

  // Extract trace context from job data (_trace field added by API)
  let parentContext = context.active();
  if (job.data._trace) {
    try {
      // Recreate context from W3C traceparent header
      const carrier = { traceparent: job.data._trace };
      parentContext = propagation.extract(context.active(), carrier);
    } catch (error) {
      logger.warn({ error }, 'Failed to extract trace context from job');
    }
  }

  // Create span for this job
  return tracer.startActiveSpan(
    'worker.price-batch.process',
    {
      attributes: {
        'job.id': job.id!,
        'job.queue': job.queueName,
        'org.id': org_id,
        'quote.id': quote_id,
        'line.count': line_ids.length,
      },
    },
    parentContext,
    async (span) => {
      logger.info(
        { jobId: job.id, quoteId: quote_id, lineCount: line_ids.length },
        'Processing price-batch',
      );

      const results: PriceBatchResult['results'] = [];
      let completed = 0;
      let failed = 0;

      try {
        await publishProgressBoth(org_id, {
          job_id: job_id || job.id!,
          status: 'active',
          progress: 0,
          message: `Starting batch pricing for ${line_ids.length} lines`,
          meta: { quote_id, total: line_ids.length },
        });

          // Process each line
          for (let i = 0; i < line_ids.length; i++) {
            const lineId = line_ids[i];

            try {
              logger.debug({ lineId, index: i }, 'Pricing line');

              // Inject trace context into outbound HTTP headers
              const headers: Record<string, string> = {
                'X-Org-Id': org_id,
                'X-User-Id': job.data.user_id,
                'X-Worker-Secret': process.env.WORKER_SECRET || 'dev-secret',
              };

              // Propagate W3C trace context
              propagation.inject(context.active(), headers);

              // Call API pricing endpoint
              const pricingResponse = await axios.post(
                `${config.apiBaseUrl}/pricing/compute`,
                {
                  line_id: lineId,
                  ...pricingConfig,
                },
                {
                  headers,
                  timeout: 30000,
                },
              );

              const price = pricingResponse.data.total_price;

              results.push({
                line_id: lineId,
                success: true,
                price,
              });

              completed++;
            } catch (error: any) {
              logger.error({ error, lineId }, 'Failed to price line');

              results.push({
                line_id: lineId,
                success: false,
                error: error.message,
              });

              failed++;
            }

            // Update progress
            const progress = Math.floor(((i + 1) / line_ids.length) * 100);
            await job.updateProgress(progress);

            // Emit progress event every 10% or on last item
            if ((i + 1) % Math.max(1, Math.floor(line_ids.length / 10)) === 0 || i === line_ids.length - 1) {
              await publishProgressBoth(org_id, {
                job_id: job_id || job.id!,
                status: 'progress',
                progress,
                message: `Priced ${i + 1} of ${line_ids.length} lines`,
                meta: {
                  quote_id,
                  completed: i + 1,
                  total: line_ids.length,
                  current_line: lineId,
                },
              });
            }
          }

          const result: PriceBatchResult = {
            quote_id,
            line_ids,
            completed,
            failed,
            results,
          };

          await publishProgressBoth(org_id, {
            job_id: job_id || job.id!,
            status: 'completed',
            progress: 100,
            message: `Batch pricing completed: ${completed} succeeded, ${failed} failed`,
            result,
          });

          logger.info(
            { jobId: job.id, quoteId: quote_id, completed, failed },
            'Price-batch completed',
          );

          // Mark span as successful
          span.setStatus({ code: 1 }); // SpanStatusCode.OK = 1
          span.setAttribute('result.completed', completed);
          span.setAttribute('result.failed', failed);

          return result;
        } catch (error: any) {
          logger.error({ error, jobId: job.id, quoteId: quote_id }, 'Price-batch failed');

          // Mark span as failed
          span.setStatus({ code: 2, message: error.message }); // SpanStatusCode.ERROR = 2
          span.recordException(error);

          // Preserve partial results
          const partialResult: PriceBatchResult = {
            quote_id,
            line_ids,
            completed,
            failed,
            results,
          };

          await publishProgressBoth(org_id, {
            job_id: job_id || job.id!,
            status: 'failed',
            progress: typeof (job as any).progress === 'number' ? (job as any).progress : 0,
            message: error.message,
            error: error.message,
            result: partialResult,
          });

          throw error;
        } finally {
          // Always end the span
          span.end();
        }
      },
    );
}
