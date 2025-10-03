/**
 * Step 15: Quote Revisions Service
 * Manages quote revision history and repricing operations
 */

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { AuditService } from '../../audit/audit.service';
import { QuoteRevision, PricingBreakdown, QuoteStatus } from './entities/revision.entity';
import { RepriceDto, ExtendExpirationDto } from './dtos/revisions.dto';
import { generatePricingDiff, validateBreakdowns } from './utils/pricing-diff.util';

@Injectable()
export class QuoteRevisionsService {
  private readonly logger = new Logger(QuoteRevisionsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get all revisions for a quote
   */
  async getRevisions(quoteId: string, orgId: string): Promise<QuoteRevision[]> {
    const { data, error } = await this.supabase.client
      .from('quote_revisions')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Verify quote belongs to org
    const { data: quote } = await this.supabase.client
      .from('quotes')
      .select('id')
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .single();

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return data || [];
  }

  /**
   * Get a specific revision
   */
  async getRevision(revisionId: string, orgId: string): Promise<QuoteRevision> {
    const { data, error } = await this.supabase.client
      .from('quote_revisions')
      .select('*, quotes!inner(org_id)')
      .eq('id', revisionId)
      .eq('quotes.org_id', orgId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Revision not found');
    }

    return data;
  }

  /**
   * Create a new revision with pricing diff
   */
  async createRevision(
    quoteId: string,
    orgId: string,
    userId: string,
    oldBreakdown: PricingBreakdown,
    newBreakdown: PricingBreakdown,
    note?: string,
    restoreOfRevisionId?: string,
  ): Promise<QuoteRevision> {
    // Validate breakdowns
    const validation = validateBreakdowns(oldBreakdown, newBreakdown);
    if (!validation.valid) {
      throw new ConflictException(`Invalid pricing data: ${validation.errors.join(', ')}`);
    }

    // Get quote for metadata
    const { data: quote } = await this.supabase.client
      .from('quotes')
      .select('pricing_version, org_id')
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .single();

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Generate diff
    const diff = generatePricingDiff(oldBreakdown, newBreakdown, {
      old_pricing_version: quote.pricing_version,
      new_pricing_version: process.env.PRICING_VERSION || 'v2',
    });

    // Create revision
    const { data: revision, error } = await this.supabase.client
      .from('quote_revisions')
      .insert({
        quote_id: quoteId,
        user_id: userId,
        diff_json: diff,
        note: note || 'Pricing revision',
        restore_of_revision_id: restoreOfRevisionId || null,
        pricing_version_old: quote.pricing_version,
        pricing_version_new: process.env.PRICING_VERSION || 'v2',
        total_delta: diff.total_delta,
        pct_delta: diff.pct_delta,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await this.audit.log({
      action: 'QUOTE_REPRICED',
      resourceType: 'quote',
      resourceId: quoteId,
      before: { breakdown: oldBreakdown },
      after: { breakdown: newBreakdown, revision_id: revision.id },
      ctx: {
        orgId,
        userId,
      },
    });

    this.logger.log(
      `Created revision ${revision.id} for quote ${quoteId}: ${diff.total_delta >= 0 ? '+' : ''}$${diff.total_delta.toFixed(2)} (${diff.pct_delta.toFixed(2)}%)`
    );

    return revision;
  }

  /**
   * Extend quote expiration
   */
  async extendExpiration(
    quoteId: string,
    orgId: string,
    userId: string,
    days: number,
    allowAfterExpiry: boolean = false,
  ): Promise<{ old_expires_at: Date | null; new_expires_at: Date }> {
    // Get current quote
    const { data: quote, error: fetchError } = await this.supabase.client
      .from('quotes')
      .select('expires_at, status')
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !quote) {
      throw new NotFoundException('Quote not found');
    }

    // Check if quote is expired and policy allows
    if (quote.status === 'expired' && !allowAfterExpiry) {
      throw new ConflictException(
        'Cannot extend expired quote without quotes.extend_after_expiry policy'
      );
    }

    // Calculate new expiration
    const baseDate = quote.expires_at ? new Date(quote.expires_at) : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    // Update quote
    const { error: updateError } = await this.supabase.client
      .from('quotes')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('id', quoteId)
      .eq('org_id', orgId);

    if (updateError) throw updateError;

    // Log audit
    await this.audit.log({
      action: 'QUOTE_EXPIRATION_EXTENDED',
      resourceType: 'quote',
      resourceId: quoteId,
      before: { expires_at: quote.expires_at },
      after: { expires_at: newExpiresAt.toISOString(), extended_by_days: days },
      ctx: {
        orgId,
        userId,
      },
    });

    this.logger.log(
      `Extended expiration for quote ${quoteId} by ${days} days: ${quote.expires_at || 'null'} → ${newExpiresAt.toISOString()}`
    );

    return {
      old_expires_at: quote.expires_at ? new Date(quote.expires_at) : null,
      new_expires_at: newExpiresAt,
    };
  }

  /**
   * Mark quote as expired (called by cron job)
   */
  async markExpired(quoteId: string, orgId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('quotes')
      .update({ status: 'expired' })
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .eq('status', 'active'); // Only expire active quotes

    if (error) throw error;

    // Log audit
    await this.audit.log({
      action: 'QUOTE_EXPIRED',
      resourceType: 'quote',
      resourceId: quoteId,
      before: { status: 'active' },
      after: { status: 'expired' },
      ctx: {
        orgId,
        userId: null, // System action
      },
    });

    this.logger.log(`Marked quote ${quoteId} as expired`);
  }

  /**
   * Restore quote to active after reprice
   */
  async restoreToActive(quoteId: string, orgId: string, newVersion: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('quotes')
      .update({
        status: 'active',
        version: newVersion,
        repriced_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('org_id', orgId);

    if (error) throw error;

    this.logger.log(`Restored quote ${quoteId} to active status (version ${newVersion})`);
  }

  /**
   * Get quotes due for expiration
   */
  async getQuotesDueForExpiration(limit: number = 500): Promise<Array<{ id: string; org_id: string }>> {
    const { data, error } = await this.supabase.client
      .from('quotes')
      .select('id, org_id')
      .eq('status', 'active')
      .lte('expires_at', new Date().toISOString())
      .limit(limit);

    if (error) throw error;

    return data || [];
  }
}
