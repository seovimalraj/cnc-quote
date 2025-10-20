/**
 * @module marketplace/supplier-quotes.service
 * @ownership supplier-portal
 * @description Collates supplier-facing quote snapshots from Supabase with contract-safe typing.
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  SupplierQuoteListItem,
  SupplierQuoteStatus,
  SupplierQuoteStatusSchema,
} from '@cnc-quote/shared/marketplace';

import { SupabaseService } from '../lib/supabase/supabase.service';

type RawQuoteJoin = {
  id: string;
  quote_id: string;
  status?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  routed_at?: string | null;
  updated_at?: string | null;
  quotes?:
    | null
    | {
        id: string;
        status?: string | null;
        total_amount?: number | null;
        currency?: string | null;
        customer_id?: string | null;
        updated_at?: string | null;
        expires_at?: string | null;
      }
    | Array<{
        id: string;
        status?: string | null;
        total_amount?: number | null;
        currency?: string | null;
        customer_id?: string | null;
        updated_at?: string | null;
        expires_at?: string | null;
      }>;
};

@Injectable()
export class SupplierQuotesService {
  private readonly logger = new Logger(SupplierQuotesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async listForSupplier(
    orgId: string,
    supplierId: string,
    limit = 50,
  ): Promise<SupplierQuoteListItem[]> {
    const query = this.supabase.client
      .from('orders')
      .select(
        `
          id,
          quote_id,
          status,
          total_amount,
          currency,
          routed_at,
          updated_at,
          quotes!inner(
            id,
            status,
            total_amount,
            currency,
            customer_id,
            updated_at,
            expires_at
          )
        `,
      )
      .eq('org_id', orgId)
      .eq('supplier_id', supplierId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to load supplier quotes', { error, orgId, supplierId });
      throw new BadRequestException(`Failed to fetch supplier quotes: ${error.message}`);
    }

    return (data as RawQuoteJoin[] | null)?.map((row) => this.mapRow(row)) ?? [];
  }

  private mapRow(row: RawQuoteJoin): SupplierQuoteListItem {
    const joined = Array.isArray(row.quotes) ? row.quotes[0] : row.quotes ?? null;
    const status = this.normalizeStatus(row.status ?? joined?.status ?? 'draft');

    const totalAmount =
      typeof row.total_amount === 'number'
        ? Number(row.total_amount)
        : typeof joined?.total_amount === 'number'
        ? Number(joined.total_amount)
        : null;

    return {
      orderId: row.id,
      quoteId: joined?.id ?? row.quote_id ?? row.id,
      status,
      totalAmount,
      currency: row.currency ?? joined?.currency ?? 'USD',
      customerId: joined?.customer_id ?? null,
      routedAt: row.routed_at ?? null,
      updatedAt: row.updated_at ?? joined?.updated_at ?? new Date().toISOString(),
      expiresAt: joined?.expires_at ?? null,
    };
  }

  private normalizeStatus(candidate: string): SupplierQuoteStatus {
    const parsed = SupplierQuoteStatusSchema.safeParse(candidate);
    if (parsed.success) {
      return parsed.data;
    }

    this.logger.warn('Unknown supplier quote status, coercing to draft', {
      candidate,
    });
    return 'draft';
  }
}
