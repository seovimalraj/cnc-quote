import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PRICING_RECALC_JOB } from "../../modules/features/pricing/pricing-recalc.queue";
import { PricingRecalcService } from "../../modules/features/pricing/pricing-recalc.service";

@Processor("pricing")
export class PricingProcessor extends WorkerHost {
  private readonly logger = new Logger(PricingProcessor.name);
  constructor(private readonly recalc: PricingRecalcService) { super(); }

  async process(job: Job) {
    switch (job.name) {
      case "calculate":
        return this.calculate(job);
      case PRICING_RECALC_JOB:
        return this.recalculate(job); 
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async calculate(_job: Job) {
    // TODO: Implement pricing calculation
    return { status: "processed" };
  }

  private async recalculate(job: Job) {
    const { orgId, reason, targetQuoteIds, dryRun, traceId } = job.data ?? {};
    this.logger.log(
      `recalc start reason=${reason} org=${orgId ?? "null"} targetQuotes=${
        Array.isArray(targetQuoteIds) ? targetQuoteIds.length : "all"
      } dryRun=${Boolean(dryRun)} traceId=${traceId ?? "-"}`
    );
    try {
      return await this.recalc.process(job.data);
    } catch (error) {
      this.logger.error(`recalc failed: ${(error as Error).message}`);
      throw error;
    }
  }
}

