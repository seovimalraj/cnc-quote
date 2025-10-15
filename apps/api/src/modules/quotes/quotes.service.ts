import { Injectable, Logger, Optional } from "@nestjs/common";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { Resend } from "resend";
import { UpdateQuoteDto } from "./quotes.dto";
import { ContractsV1, ContractsVNext, computeQuoteDiffSummaryV1, toQuoteSummaryVNext } from '@cnc-quote/shared';

type DiffableQuoteSummary = Partial<Omit<ContractsV1.QuoteSummaryV1, 'status'>> & {
  status?: Exclude<ContractsV1.QuoteSummaryV1['status'], 'converted'>;
};
import { QuoteRevisionsService } from './quote-revisions.service';
import { MetricsService } from '../metrics/metrics.service';
import {
  AnalyticsService,
  QuoteAnalyticsEvent,
  QuoteStatusChangeAnalyticsEvent,
} from '../analytics/analytics.service';
import { NotifyService } from '../notify/notify.service';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  private readonly resend: Resend;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly revisionsService: QuoteRevisionsService,
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly analyticsService?: AnalyticsService,
    @Optional() private readonly notifyService?: NotifyService,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Create a new quote with multiple part placeholders (multi-file upload flow)
   * Minimal validation for now; will be hardened later.
   */
  async createMultiPartQuote(payload: {
    org_id: string;
    customer_id?: string;
    currency?: string;
    parts: Array<{
      file_id: string;
      process_type?: ContractsV1.ProcessType;
      material_id?: string;
      finish_ids?: string[];
      quantities?: number[];
      selected_quantity?: number;
      lead_time_option?: ContractsV1.LeadTimeOption;
      inspection_level?: ContractsV1.InspectionLevel;
    }>;
  }, _orgId?: string | null, _actorId?: string | null) {
    const now = new Date().toISOString();
    const currency = payload.currency || 'USD';

    // 1. Create base quote record
    const baseQuoteInsert = {
      org_id: payload.org_id,
      customer_id: payload.customer_id || payload.org_id,
      price_profile_id: 'default',
      total_amount: 0,
      currency,
      status: 'draft',
      notes: 'Multi-part quote initialization'
    } as any;
    const { data: quoteRow, error: quoteErr } = await this.supabase.client
      .from('quotes')
      .insert(baseQuoteInsert)
      .select()
      .single();
    if (quoteErr) throw quoteErr;

    // 2. Insert quote_items rows
    const itemsToInsert = payload.parts.map(p => ({
      quote_id: quoteRow.id,
      file_id: p.file_id,
      material_id: p.material_id || 'best_available',
      finish_ids: p.finish_ids || [],
  quantity: p.quantities?.[0] || 1,
      unit_price: 0,
      total_price: 0,
      lead_time_days: 0,
      created_at: now,
      updated_at: now
    }));
    const { data: itemRows, error: itemsErr } = await this.supabase.client
      .from('quote_items')
      .insert(itemsToInsert)
      .select();
    if (itemsErr) throw itemsErr;

    // 3. Initialize config_json for each item
    for (const item of itemRows) {
      const partDef = payload.parts.find(p => p.file_id === item.file_id)!;
      const quantities = (partDef.quantities && partDef.quantities.length > 0) ? [...new Set(partDef.quantities)].sort((a,b)=>a-b) : [1];
      const selected_quantity = partDef.selected_quantity && quantities.includes(partDef.selected_quantity)
        ? partDef.selected_quantity
        : quantities[0];
      const config: ContractsV1.PartConfigV1 = {
        id: item.id,
        quote_id: quoteRow.id,
        file_id: item.file_id,
        process_type: partDef.process_type || 'cnc_milling',
        material_id: item.material_id || 'best_available',
        material_spec: undefined,
        finish_ids: partDef.finish_ids || [],
        tolerance_class: 'standard',
        tolerances: [],
        quantities,
        selected_quantity,
        lead_time_option: partDef.lead_time_option || 'standard',
        secondary_operations: [],
        inspection_level: partDef.inspection_level || 'basic',
        surface_finish: 'standard',
        machining_complexity: 'medium',
        sheet_thickness_mm: undefined,
        bend_count: undefined,
        material_gauge: undefined,
        geometry: { metrics: {} },
        dfm: { status: 'pending', issues: [] },
        pricing: { status: 'pending', matrix: [], currency },
        overrides: undefined,
        audit: { created_at: now, updated_at: now }
      };
      await this.supabase.client
        .from('quote_items')
        .update({ config_json: config, pricing_matrix: [], dfm_json: { status: 'pending', issues: [] } })
        .eq('id', item.id);
    }

    // 4. Return summary style payload
    await this.trackQuoteAnalytics({
      event: 'quote_created',
      quoteId: quoteRow.id,
      organizationId: payload.org_id,
      properties: {
        parts_count: payload.parts.length,
        currency,
        source: 'multipart_upload',
      },
    });

    return this.getQuoteSummaryV1(quoteRow.id);
  }

  /**
   * Batch add parts to an existing quote (e.g., subsequent uploads)
   */
  async addPartsToQuote(quoteId: string, _orgId: string | undefined, parts: Array<{
    file_id: string;
    process_type?: ContractsV1.ProcessType;
    material_id?: string;
    finish_ids?: string[];
    quantities?: number[];
    selected_quantity?: number;
    lead_time_option?: ContractsV1.LeadTimeOption;
    inspection_level?: ContractsV1.InspectionLevel;
  }>) {
    const now = new Date().toISOString();
    const quote = await this.getQuote(quoteId);
    const currency = quote.currency || 'USD';

    const toInsert = parts.map(p => ({
      quote_id: quoteId,
      file_id: p.file_id,
      material_id: p.material_id || 'best_available',
      finish_ids: p.finish_ids || [],
  quantity: p.quantities?.[0] || 1,
      unit_price: 0,
      total_price: 0,
      lead_time_days: 0,
      created_at: now,
      updated_at: now
    }));
    const { data: newItems, error: newItemsErr } = await this.supabase.client
      .from('quote_items')
      .insert(toInsert)
      .select();
    if (newItemsErr) throw newItemsErr;

    for (const item of newItems) {
      const def = parts.find(p => p.file_id === item.file_id)!;
      const quantities = (def.quantities && def.quantities.length > 0) ? [...new Set(def.quantities)].sort((a,b)=>a-b) : [1];
      const selected_quantity = def.selected_quantity && quantities.includes(def.selected_quantity)
        ? def.selected_quantity
        : quantities[0];
      const config: ContractsV1.PartConfigV1 = {
        id: item.id,
        quote_id: quoteId,
        file_id: item.file_id,
        process_type: def.process_type || 'cnc_milling',
        material_id: item.material_id || 'best_available',
        material_spec: undefined,
        finish_ids: def.finish_ids || [],
        tolerance_class: 'standard',
        tolerances: [],
        quantities,
        selected_quantity,
        lead_time_option: def.lead_time_option || 'standard',
        secondary_operations: [],
        inspection_level: def.inspection_level || 'basic',
        surface_finish: 'standard',
        machining_complexity: 'medium',
        sheet_thickness_mm: undefined,
        bend_count: undefined,
        material_gauge: undefined,
        geometry: { metrics: {} },
        dfm: { status: 'pending', issues: [] },
        pricing: { status: 'pending', matrix: [], currency },
        overrides: undefined,
        audit: { created_at: now, updated_at: now }
      };
      await this.supabase.client
        .from('quote_items')
        .update({ config_json: config, pricing_matrix: [], dfm_json: { status: 'pending', issues: [] } })
        .eq('id', item.id);
    }

    await this.trackQuoteAnalytics({
      event: 'quote_parts_added',
      quoteId,
      organizationId: quote.org_id,
      properties: {
        parts_added: parts.length,
        prior_parts_count: quote.items?.length || 0,
        currency,
      },
    });

    return this.getQuoteSummaryV1(quoteId);
  }

  async createQuoteFromDfm(dfmRequestId: string) {
    this.logger.log(`Creating quote from DFM request: ${dfmRequestId}`);

    // Get DFM request with file info
    const { data: dfmRequest, error: dfmError } = await this.supabase.client
      .from('dfm_requests')
      .select(`
        *,
        file:files(*),
        organization:organizations(*),
        user:users(*)
      `)
      .eq('id', dfmRequestId)
      .single();

    if (dfmError || !dfmRequest) {
      this.logger.error(`DFM request not found: ${dfmRequestId}`, dfmError);
      throw new Error('DFM request not found');
    }

    if (!dfmRequest.file) {
      throw new Error('DFM request file not found');
    }

    // Map DFM specs to quote specs
    const quoteSpecs = await this.mapDfmToQuoteSpecs(dfmRequest);

    // Create quote
    const quoteData = {
      org_id: dfmRequest.organization_id,
      customer_id: dfmRequest.organization_id, // Use org as customer for now
      price_profile_id: dfmRequest.organization.price_profile_id || 'default',
      dfm_ruleset_id: dfmRequest.df_ruleset_id,
      total_amount: 0, // Will be calculated by pricing
      currency: 'USD',
      notes: `Created from DFM analysis: ${dfmRequest.file_name}`,
      items: [quoteSpecs]
    };

    const quote = await this.createQuote(quoteData);

    // Initialize JSONB config for first (only) item
    try {
      const itemId = quote.items[0]?.id;
      if (itemId) {
        const now = new Date().toISOString();
        const partConfig = {
          id: itemId,
          quote_id: quote.id,
          file_id: quoteSpecs.file_id,
            process_type: 'cnc_milling',
          material_id: quoteSpecs.material_id,
          material_spec: null,
          finish_ids: quoteSpecs.finish_ids || [],
          tolerance_class: 'standard',
          quantities: [quoteSpecs.quantity || 1],
          selected_quantity: quoteSpecs.quantity || 1,
          lead_time_option: 'standard',
          secondary_operations: [],
          inspection_level: 'basic',
          geometry: { metrics: {} },
          dfm: { status: 'pending', issues: [] },
          pricing: { status: 'pending', matrix: [], currency: quote.currency || 'USD' },
          overrides: null,
          audit: { created_at: now, updated_at: now }
        };
        await this.supabase.client
          .from('quote_items')
          .update({ config_json: partConfig, pricing_matrix: [], dfm_json: { status: 'pending', issues: [] } })
          .eq('id', itemId);
      }
    } catch (e) {
      this.logger.warn(`Failed to initialize config_json for quote ${quote.id}: ${e}`);
    }

    // Kick off background pricing
    this.kickOffPricing(quote.id, quoteSpecs);

    await this.trackQuoteAnalytics({
      event: 'quote_created',
      quoteId: quote.id,
      organizationId: quote.org_id,
      properties: {
        source: 'dfm_conversion',
        currency: quote.currency || 'USD',
      },
    });

    return {
      quote_id: quote.id,
      line_id: quote.items[0].id
    };
  }

  private async mapDfmToQuoteSpecs(dfmRequest: any) {
    // Map process type (assume CNC for now, can be extended)
    const processType = 'cnc';

    // Map material - if not specified, use best available
    let materialId = 'best_available';
    if (dfmRequest.material_id) {
      materialId = dfmRequest.material_id;
    }

    // Map finish IDs
    const finishIds = dfmRequest.finish_ids || [];

    // Map tolerance pack to tolerance
    const tolerance = dfmRequest.tolerance_pack || 'standard';

    // Map criticality to risk profile
    const riskProfile = this.mapCriticalityToRisk(dfmRequest.criticality);

    // Map certifications to inspection defaults
    const certifications = dfmRequest.certifications || [];

    return {
      file_id: dfmRequest.file_id,
      process_type: processType,
      material_id: materialId,
      finish_ids: finishIds,
      tolerance: tolerance,
      quantity: 1, // Default quantity
      unit_price: 0, // Will be calculated
      total_price: 0, // Will be calculated
      lead_time_days: 14, // Default lead time
      complexity_multiplier: 1.0,
      risk_profile: riskProfile,
      certifications: certifications,
      notes: dfmRequest.notes
    };
  }

  private mapCriticalityToRisk(criticality: string): string {
    switch (criticality?.toLowerCase()) {
      case 'low':
        return 'standard';
      case 'medium':
        return 'standard';
      case 'high':
        return 'premium';
      case 'critical':
        return 'premium';
      default:
        return 'standard';
    }
  }

  private async kickOffPricing(quoteId: string, quoteSpecs: any) {
    try {
      // Import pricing service dynamically to avoid circular dependencies
  await import('../pricing/pricing.service');

      // Create pricing request
      // (pricingRequest shape omitted - future queued implementation will use this signature)

      // This would typically be sent to a queue for background processing
      this.logger.log(`Kicking off pricing for quote ${quoteId}`);

      // For now, we'll simulate the pricing call
      // In production, this should be queued
      setTimeout(async () => {
        try {
          // Update quote with pricing results
          await this.supabase.client
            .from('quote_items')
            .update({
              unit_price: 150.00, // Example price
              total_price: 150.00,
              lead_time_days: 14,
              updated_at: new Date().toISOString()
            })
            .eq('id', quoteSpecs.id);

          // Update quote total
          await this.supabase.client
            .from('quotes')
            .update({
              total_amount: 150.00,
              updated_at: new Date().toISOString()
            })
            .eq('id', quoteId);

          this.logger.log(`Pricing completed for quote ${quoteId}`);
        } catch (error) {
          this.logger.error(`Pricing failed for quote ${quoteId}`, error);
        }
      }, 2000); // Simulate 2 second processing time

    } catch (error) {
      this.logger.error(`Failed to kick off pricing for quote ${quoteId}`, error);
    }
  }

  async getQuote(id: string, _orgId?: string) {
    const { data: quote, error } = await this.supabase.client
      .from("quotes")
      .select(
        `
        *,
        items:quote_items(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return quote;
  }

  /**
   * Return versioned contract summary (QuoteSummaryV1)
   * This is an initial shim: enriches existing quote/items into PartConfigV1-like structures.
   * Future: pull config/pricing/dfm from dedicated tables once migrations land.
   */
  private buildQuoteSummaryV1(quote: any): ContractsV1.QuoteSummaryV1 {

    // Derive status mapping (draft|processing|ready etc.) – for now map existing statuses.
    const statusMap: Record<string, ContractsV1.QuoteSummaryV1['status']> = {
      draft: 'draft',
      processing: 'processing',
      ready: 'ready',
      sent: 'sent',
      accepted: 'accepted',
      rejected: 'rejected',
      expired: 'expired',
      cancelled: 'cancelled',
      converted: 'converted',
    };
    const status: ContractsV1.QuoteSummaryV1['status'] = statusMap[quote.status] || 'draft';

    const parts: ContractsV1.PartConfigV1[] = (quote.items || []).map((item: any) => {
      const created_at = item.created_at || quote.created_at || new Date().toISOString();
      const updated_at = item.updated_at || quote.updated_at || created_at;
      // If config_json exists, prefer it (already shaped similarly).
      if (item.config_json) {
        return item.config_json as ContractsV1.PartConfigV1;
      }
      // Legacy fallback mapping
      return {
        id: item.id,
        quote_id: quote.id,
        file_id: item.file_id,
        process_type: 'cnc_milling',
        material_id: item.material_id || 'unknown',
        material_spec: undefined,
        finish_ids: item.finish_ids || [],
        tolerance_class: (item.tolerance ? 'precision' : 'standard'),
        quantities: [item.quantity || 1],
        selected_quantity: item.quantity || 1,
        lead_time_option: 'standard',
        secondary_operations: [],
        inspection_level: 'basic',
        geometry: { metrics: {} },
        dfm: { status: 'pending', issues: [] },
        pricing: {
          status: 'ready',
          matrix: [{
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            lead_time_days: item.lead_time_days || 14,
            breakdown: { material: 0, machining: 0, setup: 0, finish: 0, inspection: 0, overhead: 0, margin: 0 },
            status: 'ready'
          }],
          currency: quote.currency || 'USD'
        },
        overrides: undefined,
        audit: { created_at, updated_at }
      };
    });

    const subtotal = parts.reduce((acc, p) => {
      const active = p.pricing.matrix.find(m => m.quantity === p.selected_quantity);
      return acc + (active?.total_price || 0);
    }, 0);

    const summary: ContractsV1.QuoteSummaryV1 = {
      id: quote.id,
      status,
      currency: quote.currency || 'USD',
      parts,
      subtotal,
      total: subtotal, // no shipping/tax yet
      expires_at: quote.expires_at || undefined,
      created_at: quote.created_at,
      updated_at: quote.updated_at
    };
    return summary;
  }

  async getQuoteSummaryV1(id: string, _orgId?: string): Promise<ContractsV1.QuoteSummaryV1> {
    const bundle = await this.loadBundle(id, _orgId);
    return bundle.summary;
  }

  async getQuoteSummaryVNext(id: string, _orgId?: string): Promise<ContractsVNext.QuoteSummaryVNext> {
    const bundle = await this.loadBundle(id, _orgId);
    const { quote, summary } = bundle;

    return toQuoteSummaryVNext(summary, {
      orgId: quote.org_id ?? null,
      customerId: quote.customer_id ?? null,
      notes: quote.notes ?? null,
      terms: quote.terms ?? null,
    });
  }

  async loadBundle(id: string, _orgId?: string): Promise<{ quote: any; summary: ContractsV1.QuoteSummaryV1 }> {
    const quote = await this.getQuote(id, _orgId);
    const summary = this.buildQuoteSummaryV1(quote);
    return { quote, summary };
  }

  async updateQuote(id: string, data: UpdateQuoteDto, _orgId?: string) {
    // Fetch current summary for diff baseline
    let before: Partial<ContractsV1.QuoteSummaryV1> | undefined;
    try {
      before = await this.getQuoteSummaryV1(id, _orgId);
    } catch {/* ignore */}

    const { data: quote, error } = await this.supabase.client
      .from('quotes')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // After update summary
    let after: Partial<ContractsV1.QuoteSummaryV1> | undefined;
    try {
      after = await this.getQuoteSummaryV1(id, _orgId);
    } catch {/* ignore */}

    if (before && after) {
      const diff = computeQuoteDiffSummaryV1(
        this.sanitizeQuoteSummaryForDiff(before),
        this.sanitizeQuoteSummaryForDiff(after),
      );
      if (diff.length > 0) {
        try {
          await this.revisionsService.createDraftRevision({ quote_id: id, diff_summary: diff });
        } catch (e) {
          this.logger.warn(`Failed to create draft revision for quote ${id}: ${e}`);
        }
      }
    }
    return quote;
  }

  private sanitizeQuoteSummaryForDiff(
    summary?: Partial<ContractsV1.QuoteSummaryV1>,
  ): DiffableQuoteSummary {
    if (!summary) {
      return {};
    }
    if (summary.status === 'converted') {
      const { status: _converted, ...rest } = summary;
      return rest as DiffableQuoteSummary;
    }
    return summary as DiffableQuoteSummary;
  }

  /**
   * Controlled lifecycle transition with validation.
   * Allowed transitions:
   * draft -> processing | cancelled
   * processing -> ready | cancelled
   * ready -> sent | cancelled
   * sent -> accepted | rejected | expired
   * (accepted/rejected/expired are terminal)
   */
  async transitionQuoteStatus(id: string, next: ContractsV1.QuoteSummaryV1['status'], _orgId?: string) {
    const { data: current, error: fetchErr } = await this.supabase.client
      .from('quotes')
      .select('id,status')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;
    const from: ContractsV1.QuoteSummaryV1['status'] = current.status;
    const allowed: Record<typeof from, Array<ContractsV1.QuoteSummaryV1['status']>> = {
      draft: ['processing', 'cancelled'],
      processing: ['ready', 'cancelled'],
      ready: ['sent', 'cancelled'],
      sent: ['accepted', 'rejected', 'expired', 'cancelled'],
      accepted: ['converted'],
      rejected: [],
      expired: [],
      cancelled: [],
      converted: []
    } as any;
    const validNext = allowed[from] || [];
    if (!validNext.includes(next)) {
      throw new Error(`Invalid status transition from ${from} to ${next}`);
    }
    const now = new Date().toISOString();
    const patch: any = { status: next, updated_at: now };
    if (next === 'processing') patch.processing_started_at = now;
    if (next === 'ready') patch.ready_at = now;
    if (next === 'sent') patch.sent_at = now;
    if (next === 'accepted') patch.accepted_at = now;
    if (next === 'rejected') patch.rejected_at = now;
    if (next === 'expired') patch.expired_at = now;
    if (next === 'cancelled') patch.cancelled_at = now;
    if (next === 'converted') patch.converted_at = now;
    const updated = await this.updateQuote(id, patch, _orgId);
    // Record metrics if available (lazy require to avoid circular DI)
    // Emit metric (best-effort)
    try {
      this.metricsService?.quoteStatusTransitions.inc({ from, to: next });
    } catch {
      /* ignore metrics errors */
    }

    await this.trackQuoteStatusAnalytics({
      event: 'quote_status_transition',
      quoteId: id,
      organizationId: (updated as any)?.org_id,
      previousStatus: from,
      nextStatus: next,
      properties: {
        total_amount: (updated as any)?.total_amount,
        currency: (updated as any)?.currency,
      },
    });

    if (this.shouldNotifyStatus(next)) {
      await this.notifyStatusChange(
        id,
        from,
        next,
        (updated as any)?.org_id,
        (updated as any)?.customer_id,
        (updated as any)?.total_amount,
        (updated as any)?.currency,
      );
    }
    return updated;
  }

  async generatePdf(_id: string, _orgId?: string): Promise<Buffer> {
    // PDF generation temporarily disabled
    throw new Error("PDF generation is temporarily disabled");
  }

  async sendQuote(id: string, email: string, _orgId?: string) {
    const quote = await this.getQuote(id, _orgId);

    // Generate secure accept link
    const acceptToken = await this.generateAcceptToken(id);
    const acceptUrl = `${process.env.APP_URL}/quotes/${id}/accept?token=${acceptToken}`;

    // Send email without PDF attachment (temporarily)
    return this.resend.emails.send({
      from: "CNC Quote <noreply@cncquote.com>",
      to: email,
      subject: `Quote #Q-${id.slice(0, 8)} - CNC Quote`,
      html: `
        <h2>Your CNC Quote is Ready</h2>
        <p>Quote Number: Q-${id.slice(0, 8)}</p>
        <p>Total Amount: ${quote.currency}${quote.total_amount}</p>
        <p><a href="${acceptUrl}">View and Accept Quote</a></p>
        <p>Note: PDF attachment is temporarily disabled.</p>
      `,
    });
  }

  private async generateAcceptToken(quoteId: string): Promise<string> {
    // Simple non-cryptographic token (placeholder) – replace with signed JWT in production
    return Buffer.from(`${quoteId}-${Date.now()}`).toString("base64");
  }

  // Helper method to create a quote (placeholder)
  private async createQuote(quoteData: any) {
    const { data: quote, error } = await this.supabase.client
      .from('quotes')
      .insert(quoteData)
      .select()
      .single();

    if (error) throw error;
    return quote;
  }

  private async trackQuoteAnalytics(event: QuoteAnalyticsEvent): Promise<void> {
    if (!this.analyticsService) return;
    try {
      await this.analyticsService.trackQuoteEvent(event);
    } catch (error) {
      this.logger.debug(
        `Failed to record quote analytics event "${event.event}": ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async trackQuoteStatusAnalytics(event: QuoteStatusChangeAnalyticsEvent): Promise<void> {
    if (!this.analyticsService) return;
    try {
      await this.analyticsService.trackQuoteStatusChange(event);
    } catch (error) {
      this.logger.debug(
        `Failed to record quote status transition for ${event.quoteId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private shouldNotifyStatus(status: ContractsV1.QuoteSummaryV1['status']): boolean {
    return ['ready', 'sent', 'accepted', 'rejected', 'expired', 'cancelled', 'converted'].includes(status);
  }

  private async notifyStatusChange(
    quoteId: string,
    previousStatus: ContractsV1.QuoteSummaryV1['status'],
    nextStatus: ContractsV1.QuoteSummaryV1['status'],
    organizationId?: string,
    customerId?: string | null,
    totalAmount?: number,
    currency?: string,
  ): Promise<void> {
    if (!this.notifyService) return;
    try {
      const recipientEmail = await this.resolveCustomerEmail(customerId);
      await this.notifyService.notifyQuoteStatusChange({
        quoteId,
        previousStatus,
        status: nextStatus,
        recipientEmail,
        metadata: {
          organization_id: organizationId,
          total_amount: totalAmount,
          currency,
        },
      });
    } catch (error) {
      this.logger.debug(
        `Failed to send quote status notification for ${quoteId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async resolveCustomerEmail(customerId?: string | null): Promise<string | undefined> {
    if (!customerId) return undefined;
    try {
      const { data, error } = await this.supabase.client
        .from('customers')
        .select('email')
        .eq('id', customerId)
        .maybeSingle();
      if (error) {
        this.logger.debug(`Failed to resolve customer email for ${customerId}: ${error.message}`);
        return undefined;
      }
      return data?.email ?? undefined;
    } catch (error) {
      this.logger.debug(
        `Error while resolving customer email for ${customerId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return undefined;
    }
  }
}
