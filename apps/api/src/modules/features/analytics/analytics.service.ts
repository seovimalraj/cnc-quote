import { Injectable, Logger } from '@nestjs/common';
import { ContractsV1 } from '@cnc-quote/shared';
import { SupabaseService } from "../../../lib/supabase/supabase.service";

export interface DfmAnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  organizationId?: string;
  dfmRequestId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export type QuoteAnalyticsEventName =
  | 'quote_created'
  | 'quote_parts_added'
  | 'quote_preview_generated'
  | 'quote_status_transition'
  | 'quote_checkout_initiated'
  | 'quote_checkout_completed';

export interface QuoteAnalyticsEvent {
  event: QuoteAnalyticsEventName;
  quoteId?: string;
  organizationId?: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface QuoteStatusChangeAnalyticsEvent
  extends QuoteAnalyticsEvent {
  previousStatus: ContractsV1.QuoteSummaryV1['status'];
  nextStatus: ContractsV1.QuoteSummaryV1['status'];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async trackDfmEvent(event: DfmAnalyticsEvent): Promise<void> {
    const timestamp = event.timestamp || new Date();
    const primaryRecord = {
      event_type: 'dfm',
      event_name: event.event,
      user_id: event.userId,
      session_id: event.sessionId,
      organization_id: event.organizationId,
      dfm_request_id: event.dfmRequestId,
      properties: event.properties || {},
      timestamp,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
    };

    const legacyRecord = {
      event_type: 'dfm',
      quote_id: event.properties?.quote_id ?? null,
      organization_id: event.organizationId,
      properties: {
        event_name: event.event,
        dfm_request_id: event.dfmRequestId,
        ...(event.properties || {}),
      },
      created_at: timestamp.toISOString(),
    };

    await this.insertEvent(primaryRecord, legacyRecord, 'DFM');
  }

  async trackDfmFunnel(
    userId: string | undefined,
    sessionId: string | undefined,
    organizationId: string | undefined,
    dfmRequestId: string,
    event: string,
    properties: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.trackDfmEvent({
      event,
      userId,
      sessionId,
      organizationId,
      dfmRequestId,
      properties,
      ipAddress,
      userAgent,
    });
  }

  // Specific DFM funnel events
  async trackFormView(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_form_view',
      dfmRequestId,
      properties,
    });
  }

  async trackOptionsLoaded(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_options_loaded',
      dfmRequestId,
      properties,
    });
  }

  async trackUploadStarted(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_upload_started',
      dfmRequestId,
      properties,
    });
  }

  async trackUploadDone(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_upload_done',
      dfmRequestId,
      properties,
    });
  }

  async trackRequestCreated(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_request_created',
      dfmRequestId,
      properties,
    });
  }

  async trackAnalysisStarted(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_analysis_started',
      dfmRequestId,
      properties,
    });
  }

  async trackAnalysisComplete(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_analysis_complete',
      dfmRequestId,
      properties,
    });
  }

  async trackGateShown(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_gate_shown',
      dfmRequestId,
      properties,
    });
  }

  async trackGateCompleted(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_gate_completed',
      dfmRequestId,
      properties,
    });
  }

  async trackResultViewed(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_result_viewed',
      dfmRequestId,
      properties,
    });
  }

  async trackInstantQuoteClicked(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_get_instant_quote_clicked',
      dfmRequestId,
      properties,
    });
  }

  async trackQapDownloaded(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_qap_downloaded',
      dfmRequestId,
      properties,
    });
  }

  async trackReportDownloaded(dfmRequestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_report_downloaded',
      dfmRequestId,
      properties,
    });
  }

  async trackStatusChecked(requestId: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackDfmEvent({
      event: 'dfm_status_checked',
      dfmRequestId: requestId,
      properties,
    });
  }

  async trackQuoteEvent(event: QuoteAnalyticsEvent): Promise<void> {
    const timestamp = event.timestamp || new Date();
    const primaryRecord = {
      event_type: 'quote',
      event_name: event.event,
      user_id: event.userId,
      session_id: event.sessionId,
      organization_id: event.organizationId,
      properties: {
        ...(event.properties || {}),
        quote_id: event.quoteId,
      },
      timestamp,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
    };

    const legacyRecord = {
      event_type: 'quote',
      quote_id: event.quoteId ?? null,
      organization_id: event.organizationId,
      properties: {
        event_name: event.event,
        ...(event.properties || {}),
      },
      created_at: timestamp.toISOString(),
    };

    await this.insertEvent(primaryRecord, legacyRecord, 'Quote');
  }

  async trackQuoteStatusChange(event: QuoteStatusChangeAnalyticsEvent): Promise<void> {
    await this.trackQuoteEvent({
      ...event,
      event: 'quote_status_transition',
      properties: {
        previous_status: event.previousStatus,
        next_status: event.nextStatus,
        ...(event.properties || {}),
      },
    });
  }

  private async insertEvent(
    record: Record<string, any>,
    legacyRecord: Record<string, any> | undefined,
    context: string,
  ): Promise<void> {
    try {
      const supabase = this.supabaseService.client;
      const { error } = await supabase.from('analytics_events').insert(record);
      if (error) {
        if (legacyRecord && this.shouldAttemptLegacyInsert(error)) {
          this.logger.debug(
            `${context} analytics insert failed against primary schema, retrying legacy shape: ${error.message}`,
          );
          const { error: legacyError } = await supabase
            .from('analytics_events')
            .insert(legacyRecord);
          if (legacyError) {
            this.logger.error(
              `Failed to track ${context.toLowerCase()} analytics event (legacy retry):`,
              legacyError,
            );
          }
        } else {
          this.logger.error(`Failed to track ${context.toLowerCase()} analytics event:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Error tracking ${context.toLowerCase()} analytics event:`, error);
    }
  }

  private shouldAttemptLegacyInsert(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('column') && message.includes('does not exist');
  }
}
