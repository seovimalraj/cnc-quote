/**
 * Step 14: Margins Service
 * Handles margin calculation, persistence, and retrieval
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { AuditService } from "../../audit-legacy/audit.service";

export interface CostBreakdown {
  setup_time_cost: number;
  machine_time_cost: number;
  material_cost: number;
  finish_cost: number;
  risk_markup: number;
  tolerance_multiplier_cost: number;
  overhead_cost: number;
  margin_amount: number;
}

export interface LineMargin {
  line_id: string;
  process: string;
  material: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_cost_breakdown: CostBreakdown;
  margin_amount: number;
  margin_pct: number;
}

export interface QuoteMargins {
  quote: {
    id: string;
    total_price: number;
    gross_margin_amount: number;
    gross_margin_pct: number;
  };
  lines: LineMargin[];
}

@Injectable()
export class MarginsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get margins for a quote
   */
  async getQuoteMargins(quoteId: string, orgId: string): Promise<QuoteMargins> {
    // Fetch quote header
    const { data: quote, error: quoteError } = await this.supabase.client
      .from('quotes')
      .select('id, total_price, gross_margin_amount, gross_margin_pct')
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .single();

    if (quoteError || !quote) {
      throw new NotFoundException('Quote not found');
    }

    // Check if margins are finalized
    if (quote.gross_margin_amount === null) {
      throw new NotFoundException('Margins not finalized for this quote', 'NOT_FINALIZED');
    }

    // Fetch quote lines with margins
    const { data: lines, error: linesError } = await this.supabase.client
      .from('quote_lines')
      .select('id, process, material, quantity, unit_price, total_price, line_cost_breakdown, margin_amount, margin_pct')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true });

    if (linesError) {
      throw linesError;
    }

    return {
      quote: {
        id: quote.id,
        total_price: quote.total_price,
        gross_margin_amount: quote.gross_margin_amount,
        gross_margin_pct: quote.gross_margin_pct,
      },
      lines: (lines || []).map((line) => ({
        line_id: line.id,
        process: line.process,
        material: line.material,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.total_price,
        line_cost_breakdown: line.line_cost_breakdown || {},
        margin_amount: line.margin_amount,
        margin_pct: line.margin_pct,
      })),
    };
  }

  /**
   * Persist margins for a quote and its lines
   * Called during quote finalization after pricing calculation
   */
  async finalizeMargins(
    quoteId: string,
    orgId: string,
    userId: string,
    linesData: Array<{
      lineId: string;
      breakdown: CostBreakdown;
      sellPrice: number;
    }>,
  ): Promise<void> {
    // Calculate aggregates
    let totalMarginAmount = 0;
    let totalSellPrice = 0;

    // Update each line
    for (const lineData of linesData) {
      const cogsTotal = this.calculateCOGS(lineData.breakdown);
      const marginAmount = lineData.sellPrice - cogsTotal;
      const marginPct = lineData.sellPrice > 0 ? marginAmount / lineData.sellPrice : 0;

      totalMarginAmount += marginAmount;
      totalSellPrice += lineData.sellPrice;

      // Update line
      const { error: lineError } = await this.supabase.client
        .from('quote_lines')
        .update({
          line_cost_breakdown: lineData.breakdown,
          margin_amount: marginAmount,
          margin_pct: marginPct,
        })
        .eq('id', lineData.lineId);

      if (lineError) {
        throw lineError;
      }
    }

    // Calculate quote-level margin
    const grossMarginPct = totalSellPrice > 0 ? totalMarginAmount / totalSellPrice : 0;

    // Update quote header
    const { error: quoteError } = await this.supabase.client
      .from('quotes')
      .update({
        gross_margin_amount: totalMarginAmount,
        gross_margin_pct: grossMarginPct,
      })
      .eq('id', quoteId)
      .eq('org_id', orgId);

    if (quoteError) {
      throw quoteError;
    }

    // Emit audit log
    await this.audit.log({
      action: 'MARGINS_FINALIZED',
      resourceType: 'quote',
      resourceId: quoteId,
      before: null,
      after: {
        gross_margin_amount: totalMarginAmount,
        gross_margin_pct: grossMarginPct,
        lines_count: linesData.length,
      },
      ctx: {
        orgId,
        userId,
      },
    });
  }

  /**
   * Calculate total COGS from breakdown
   */
  private calculateCOGS(breakdown: CostBreakdown): number {
    return (
      (breakdown.setup_time_cost || 0) +
      (breakdown.machine_time_cost || 0) +
      (breakdown.material_cost || 0) +
      (breakdown.finish_cost || 0) +
      (breakdown.risk_markup || 0) +
      (breakdown.tolerance_multiplier_cost || 0) +
      (breakdown.overhead_cost || 0)
    );
  }

  /**
   * Get margins for multiple quotes (for export)
   */
  async getMarginsBatch(
    orgId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      customerId?: string;
      tags?: string[];
    },
  ) {
    let query = this.supabase.client
      .from('quotes')
      .select(`
        id,
        created_at,
        customer_name,
        status,
        total_price,
        gross_margin_amount,
        gross_margin_pct,
        quote_lines(
          id,
          process,
          material,
          quantity,
          unit_price,
          total_price,
          line_cost_breakdown,
          margin_amount,
          margin_pct
        ),
        quote_outcomes(status, reason_code)
      `)
      .eq('org_id', orgId)
      .not('gross_margin_amount', 'is', null); // Only finalized quotes

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }
}
