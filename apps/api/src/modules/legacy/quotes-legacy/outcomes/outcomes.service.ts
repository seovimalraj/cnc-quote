/**
 * Step 14: Quote Outcomes Service
 * Handles CRUD operations for quote outcomes (accepted/rejected/expired/rescinded)
 */

import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { SupabaseService } from "../../../../lib/supabase/supabase.service";
import { AuditService } from "../../audit-legacy/audit.service";
import { AnalyticsService } from "../../../features/analytics/analytics.service";
import { SetOutcomeDto } from './dtos/outcome.dto';
import { QuoteOutcome } from './entities/outcome.entity';

@Injectable()
export class OutcomesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Get outcome for a quote
   */
  async getOutcome(quoteId: string, orgId: string): Promise<QuoteOutcome | null> {
    const { data, error } = await this.supabase.client
      .from('quote_outcomes')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('org_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    return data;
  }

  /**
   * Set or update quote outcome
   * Enforces business rules like preventing overwrite of accepted quotes by non-admins
   */
  async setOutcome(
    quoteId: string,
    orgId: string,
    userId: string,
    dto: SetOutcomeDto,
    isAdmin: boolean = false,
  ): Promise<QuoteOutcome> {
    // Verify quote exists and belongs to org
    const { data: quote, error: quoteError } = await this.supabase.client
      .from('quotes')
      .select('id, org_id, total_price, gross_margin_pct')
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .single();

    if (quoteError || !quote) {
      throw new NotFoundException('Quote not found');
    }

    // Check for existing outcome
    const existing = await this.getOutcome(quoteId, orgId);

    // Business rule: only admins can overwrite accepted quotes
    if (existing && existing.status === 'accepted' && !isAdmin) {
      throw new ConflictException(
        'Cannot modify accepted outcome. Contact administrator.',
      );
    }

    // Validate reason code if provided
    if (dto.reason_code) {
      await this.validateReasonCode(dto.reason_code);
    }

    // Prepare outcome data
    const outcomeData = {
      quote_id: quoteId,
      org_id: orgId,
      status: dto.status,
      reason_code: dto.reason_code || null,
      reason_notes: dto.reason_notes || null,
      amount: dto.amount || null,
      decided_by: userId,
      decided_at: new Date().toISOString(),
      meta: dto.meta || {},
    };

    // Upsert outcome
    const { data: outcome, error } = await this.supabase.client
      .from('quote_outcomes')
      .upsert(outcomeData, { onConflict: 'quote_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

        // Emit audit log
    await this.audit.log({
      action: 'OUTCOME_SET',
      resourceType: 'quote',
      resourceId: quoteId,
      before: existing,
      after: outcome,
      ctx: {
        orgId,
        userId,
      },
    });

    // Emit analytics event (using trackQuoteEvent method)
    await this.analytics.trackQuoteEvent({
      event: 'quote_status_transition' as any,
      quoteId,
      organizationId: orgId,
      userId,
      properties: {
        outcome_status: dto.status,
        reason_code: dto.reason_code,
        amount: dto.amount,
        quote_value: quote.total_price,
        gross_margin_pct: quote.gross_margin_pct,
        is_update: !!existing,
        variance: dto.amount && quote.total_price
          ? ((dto.amount - quote.total_price) / quote.total_price) * 100
          : null,
      },
    });

    return outcome;
  }

  /**
   * Clear/delete quote outcome
   */
  async deleteOutcome(
    quoteId: string,
    orgId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<void> {
    const existing = await this.getOutcome(quoteId, orgId);

    if (!existing) {
      throw new NotFoundException('Outcome not found');
    }

    // Business rule: only admins can clear accepted quotes
    if (existing.status === 'accepted' && !isAdmin) {
      throw new ForbiddenException('Cannot clear accepted outcome');
    }

    const { error } = await this.supabase.client
      .from('quote_outcomes')
      .delete()
      .eq('quote_id', quoteId)
      .eq('org_id', orgId);

    if (error) {
      throw error;
    }

    // Emit audit log
    await this.audit.log({
      action: 'OUTCOME_CLEARED',
      resourceType: 'quote',
      resourceId: quoteId,
      before: existing,
      after: null,
      ctx: {
        orgId,
        userId,
      },
    });
  }

  /**
   * Get quote outcomes with pagination and filtering
   */
  async listOutcomes(
    orgId: string,
    filters?: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    let query = this.supabase.client
      .from('quote_outcomes')
      .select('*, quotes!inner(id, created_at, customer_name, total_price)', { count: 'exact' })
      .eq('org_id', orgId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('decided_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('decided_at', filters.dateTo);
    }

    query = query
      .order('decided_at', { ascending: false })
      .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Validate reason code exists in lookup table
   */
  private async validateReasonCode(code: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('outcome_reason_codes')
      .select('code')
      .eq('code', code)
      .eq('active', true)
      .single();

    if (error || !data) {
      // Don't fail hard - reason codes are optional
      console.warn(`Invalid or inactive reason code: ${code}`);
    }
  }

  /**
   * Check if outcome update is idempotent (same values)
   */
  private isIdempotent(existing: any, incoming: any): boolean {
    return (
      existing.status === incoming.status &&
      existing.reason_code === incoming.reason_code &&
      existing.amount === incoming.amount
    );
  }

  /**
   * Get list of active reason codes
   */
  async getReasonCodes() {
    const { data, error } = await this.supabase.client
      .from('outcome_reason_codes')
      .select('*')
      .eq('active', true)
      .order('sort', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }
}
