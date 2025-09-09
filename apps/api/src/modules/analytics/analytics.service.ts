import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase/supabase.service';

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

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async trackDfmEvent(event: DfmAnalyticsEvent): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();

      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: 'dfm',
          event_name: event.event,
          user_id: event.userId,
          session_id: event.sessionId,
          organization_id: event.organizationId,
          dfm_request_id: event.dfmRequestId,
          properties: event.properties || {},
          timestamp: event.timestamp || new Date(),
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
        });

      if (error) {
        this.logger.error('Failed to track DFM analytics event:', error);
      }
    } catch (error) {
      this.logger.error('Error tracking DFM analytics event:', error);
    }
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
}
