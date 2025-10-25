/**
 * Step 15: Quote Expiration Cron Job
 * Daily job to expire stale quotes and trigger optional reprice
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuoteRevisionsService } from "../../legacy/quotes-legacy/revisions/revisions.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QuoteExpirationJob {
  private readonly logger = new Logger(QuoteExpirationJob.name);
  private readonly batchSize = 500;
  private readonly concurrency = 5;

  constructor(
    private readonly revisionsService: QuoteRevisionsService,
    private readonly analytics: AnalyticsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Run daily at 5:00 AM to expire quotes
   * Cron: "0 5 * * *"
   */
  @Cron('0 5 * * *', {
    name: 'expireQuotesDaily',
    timeZone: 'UTC',
  })
  async handleExpireQuotes(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting daily quote expiration job');

    try {
      let processed = 0;
      let expired = 0;
      let errors = 0;

      // Fetch quotes due for expiration
      const quotesDue = await this.revisionsService.getQuotesDueForExpiration(this.batchSize);

      this.logger.log(`Found ${quotesDue.length} quotes due for expiration`);

      // Process in batches with concurrency control
      for (let i = 0; i < quotesDue.length; i += this.concurrency) {
        const batch = quotesDue.slice(i, i + this.concurrency);

        await Promise.allSettled(
          batch.map(async (quote) => {
            try {
              await this.revisionsService.markExpired(quote.id, quote.org_id);

              // Emit analytics event
              await this.analytics.trackQuoteEvent({
                event: 'quote_status_transition' as any,
                quoteId: quote.id,
                organizationId: quote.org_id,
                properties: {
                  from_status: 'active',
                  to_status: 'expired',
                  reason: 'automatic_expiration',
                },
              });

              expired++;
            } catch (error) {
              this.logger.error(
                `Failed to expire quote ${quote.id}: ${error.message}`,
                error.stack
              );
              errors++;
            }
            processed++;
          })
        );

        // Log progress
        if (processed % 100 === 0) {
          this.logger.log(`Progress: ${processed}/${quotesDue.length} processed`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Expiration job complete: ${expired} expired, ${errors} errors, ${duration}ms duration`
      );

      // Emit job metrics
      await this.emitJobMetrics('expire_quotes', {
        processed,
        expired,
        errors,
        duration_ms: duration,
      });
    } catch (error) {
      this.logger.error('Expiration job failed', error.stack);
      throw error;
    }
  }

  /**
   * Optional: Auto-reprice expired quotes
   * Runs 30 minutes after expiration job
   * Cron: "30 5 * * *"
   */
  @Cron('30 5 * * *', {
    name: 'autoRepriceExpired',
    timeZone: 'UTC',
  })
  async handleAutoReprice(): Promise<void> {
    const enabled = this.config.get<boolean>('quotes.autoreprice.enabled', false);

    if (!enabled) {
      this.logger.debug('Auto-reprice feature is disabled');
      return;
    }

    this.logger.log('Starting auto-reprice job for expired quotes');

    try {
      // Implementation would enqueue reprice jobs to BullMQ
      // For now, log that feature is ready
      this.logger.log('Auto-reprice job complete (enqueue logic pending)');
    } catch (error) {
      this.logger.error('Auto-reprice job failed', error.stack);
    }
  }

  /**
   * Emit job metrics for monitoring
   */
  private async emitJobMetrics(
    jobName: string,
    metrics: { processed: number; expired?: number; errors: number; duration_ms: number }
  ): Promise<void> {
    try {
      // Emit to analytics/metrics service
      await this.analytics.trackQuoteEvent({
        event: 'quote_status_transition' as any,
        properties: {
          job_name: jobName,
          ...metrics,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to emit job metrics: ${error.message}`);
    }
  }
}
