import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AdminFeatureFlagsService } from '../admin-feature-flags/admin-feature-flags.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { PRICING_COMPLIANCE_ML_JOB, PRICING_COMPLIANCE_ML_QUEUE, PricingComplianceMlAssistJob } from './pricing-ml-assist.queue';

const FEATURE_FLAG_KEY = 'pricing_compliance_ml_assist';

@Injectable()
export class PricingComplianceMlAssistService {
  private readonly logger = new Logger(PricingComplianceMlAssistService.name);

  constructor(
    @InjectQueue(PRICING_COMPLIANCE_ML_QUEUE)
    private readonly queue: Queue<PricingComplianceMlAssistJob>,
    private readonly featureFlags: AdminFeatureFlagsService,
    private readonly supabase: SupabaseService,
  ) {}

  async enqueueRationale(params: {
    quoteId: string;
    quoteItemId: string;
    traceId: string;
    eventIds: string[];
  }): Promise<void> {
    if (!Array.isArray(params.eventIds) || params.eventIds.length === 0) {
      return;
    }

    try {
      const { data: quote, error } = await this.supabase.client
        .from('quotes')
        .select('id, org_id')
        .eq('id', params.quoteId)
        .maybeSingle();

      if (error) {
        this.logger.warn(
          `Unable to load quote context for ML assist (quote=${params.quoteId}): ${error.message}`,
        );
        return;
      }

      const orgId = quote?.org_id ?? null;
      const evaluation = await this.featureFlags.evaluateFeatureFlag(FEATURE_FLAG_KEY, {
        organization_id: orgId ?? undefined,
      });

      if (!evaluation.enabled) {
        this.logger.debug(
          `ML assist feature flag disabled for quote=${params.quoteId} (org=${orgId ?? 'n/a'})`,
        );
        return;
      }

      await this.queue.add(
        PRICING_COMPLIANCE_ML_JOB,
        {
          version: 1,
          quoteId: params.quoteId,
          quoteItemId: params.quoteItemId,
          orgId,
          traceId: params.traceId,
          eventIds: params.eventIds,
          triggeredAt: new Date().toISOString(),
          featureFlagKey: FEATURE_FLAG_KEY,
        },
        {
          jobId: `compliance-ml:${params.quoteItemId}:${params.traceId}`,
          removeOnComplete: true,
          removeOnFail: 25,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
      this.logger.debug(
        `Enqueued compliance ML rationale job for quote=${params.quoteId} item=${params.quoteItemId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue compliance ML assist job for quote=${params.quoteId}: ${(error as Error).message}`,
      );
    }
  }
}
