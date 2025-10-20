import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { context, propagation, trace, SpanStatusCode } from "@opentelemetry/api";
import { ManualReviewService } from "./manual-review.service";
import {
  MANUAL_REVIEW_QUEUE,
  MANUAL_REVIEW_JOB_PRICING_COMPLIANCE,
  PricingComplianceGuardrailJob,
} from "./manual-review.queue";

@Injectable()
@Processor(MANUAL_REVIEW_QUEUE)
export class ManualReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(ManualReviewProcessor.name);

  constructor(private readonly manualReviewService: ManualReviewService) {
    super();
  }

  async process(job: Job<PricingComplianceGuardrailJob>) {
    switch (job.name) {
      case MANUAL_REVIEW_JOB_PRICING_COMPLIANCE:
        return this.handlePricingCompliance(job);
      default:
        this.logger.warn(`Unhandled manual-review job: ${job.name}`);
        throw new Error(`Unhandled manual-review job: ${job.name}`);
    }
  }

  private async handlePricingCompliance(job: Job<PricingComplianceGuardrailJob>) {
    const tracer = trace.getTracer("api.manual-review");
    const carrier = job.data.traceparent ? { traceparent: job.data.traceparent } : undefined;
    const parentContext = carrier ? propagation.extract(context.active(), carrier) : context.active();

    return tracer.startActiveSpan(
      "manual-review.pricing-compliance",
      {
        attributes: {
          "quote.id": job.data.quoteId,
          "quote.item_id": job.data.quoteItemId,
          "org.id": job.data.orgId,
          "manual_review.events": job.data.events.map((event) => event.code),
          "job.id": job.id ?? null,
        },
      },
      parentContext,
      async (span) => {
        try {
          const result = await this.manualReviewService.escalatePricingGuardrail({
            orgId: job.data.orgId,
            quoteId: job.data.quoteId,
            quoteItemId: job.data.quoteItemId,
            traceId: job.data.traceId,
            triggeredAt: new Date(job.data.triggeredAt),
            events: job.data.events,
            eventIds: job.data.eventIds,
            quoteSnapshot: job.data.quote,
            partSnapshot: job.data.part,
          });

          span.setStatus({ code: SpanStatusCode.OK });
          span.setAttribute("manual_review.task_action", result.action);
          if (result.taskId) {
            span.setAttribute("manual_review.task_id", result.taskId);
          }

          this.logger.log(
            `Processed pricing compliance escalation for quote=${job.data.quoteId} (${result.action})`,
          );
          return result;
        } catch (error) {
          const err = error as Error;
          span.recordException(err);
          span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
          this.logger.error(
            `Failed manual review escalation for quote=${job.data.quoteId}: ${err.message}`,
            err.stack,
          );
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
