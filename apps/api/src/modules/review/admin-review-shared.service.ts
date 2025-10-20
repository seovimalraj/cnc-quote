import { Logger } from '@nestjs/common';

import { SupabaseService } from '../../lib/supabase/supabase.service';
import {
  AdminReviewItem,
  CurrencyCode,
  Priority,
  ReviewListFilters,
} from './review.types';

export type QuoteMetrics = {
  itemCount: number;
  totalValue: number;
  dfmFindingCount: number;
};

export type CustomerRow = Record<string, unknown> & {
  id: string;
};

export type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

type PaginationResult = {
  items: AdminReviewItem[];
  nextCursor: string | null;
};

type FilterPredicate = (item: AdminReviewItem) => boolean;

export abstract class AdminReviewSharedService {
  protected readonly logger: Logger;
  protected readonly PRIORITY_ORDER: Priority[] = ['LOW', 'MED', 'HIGH', 'EXPEDITE'];

  protected constructor(protected readonly supabase: SupabaseService, context: string) {
    this.logger = new Logger(context);
  }

  protected defaultMetrics(): QuoteMetrics {
    return { itemCount: 0, totalValue: 0, dfmFindingCount: 0 };
  }

  protected countDfmIssues(dfm: any): number {
    if (!dfm) return 0;
    let collection: any[] = [];
    if (Array.isArray(dfm?.issues)) {
      collection = dfm.issues;
    } else if (Array.isArray(dfm?.findings)) {
      collection = dfm.findings;
    } else if (Array.isArray(dfm)) {
      collection = dfm;
    }

    return collection.filter((issue: any) => {
      if (!issue) return false;
      const severity = String(issue?.severity ?? '').toLowerCase();
      return severity && severity !== 'info';
    }).length;
  }

  protected async fetchQuoteMetrics(quoteIds: string[]): Promise<Map<string, QuoteMetrics>> {
    if (quoteIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.supabase.client
      .from('quote_items')
      .select('quote_id, total_price, dfm_json')
      .in('quote_id', quoteIds);

    if (error) {
      this.logger.warn(`Failed to fetch quote item metrics: ${error.message}`);
      return new Map();
    }

    const metrics = new Map<string, QuoteMetrics>();
    for (const row of data ?? []) {
      const entry = metrics.get(row.quote_id) ?? this.defaultMetrics();
      entry.itemCount += 1;
      entry.totalValue += Number(row.total_price ?? 0);
      entry.dfmFindingCount += this.countDfmIssues(row.dfm_json);
      metrics.set(row.quote_id, entry);
    }

    return metrics;
  }

  protected async fetchCustomers(ids: string[]): Promise<Map<string, CustomerRow>> {
    if (ids.length === 0) {
      return new Map();
    }

    try {
      const { data, error } = await this.supabase.client.from('customers').select('*').in('id', ids);
      if (error) {
        this.logger.warn(`Failed to fetch customers: ${error.message}`);
        return new Map();
      }
      const map = new Map<string, CustomerRow>();
      for (const row of data ?? []) {
        map.set(row.id, row);
      }
      return map;
    } catch (err) {
      this.logger.warn(`Error fetching customers: ${err instanceof Error ? err.message : String(err)}`);
      return new Map();
    }
  }

  protected async fetchProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
    if (ids.length === 0) {
      return new Map();
    }

    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);

      if (error) {
        this.logger.warn(`Failed to fetch profiles: ${error.message}`);
        return new Map();
      }

      const map = new Map<string, ProfileRow>();
      for (const row of data ?? []) {
        map.set(row.id, row);
      }
      return map;
    } catch (err) {
      this.logger.warn(`Error fetching profiles: ${err instanceof Error ? err.message : String(err)}`);
      return new Map();
    }
  }

  protected resolveCurrency(currency?: string | null): CurrencyCode {
    const upper = (currency ?? 'USD').toUpperCase();
    if (['USD', 'EUR', 'GBP', 'NOK', 'INR'].includes(upper)) {
      return upper as CurrencyCode;
    }
    return 'USD';
  }

  protected resolveCustomerName(customer?: CustomerRow): string {
    if (!customer) return '—';
    return (
      (customer.name as string | undefined) ||
      (customer.display_name as string | undefined) ||
      (customer.primary_contact_name as string | undefined) ||
      (customer.contact_name as string | undefined) ||
      '—'
    );
  }

  protected resolveCustomerCompany(customer?: CustomerRow): string {
    if (!customer) return '—';
    return (
      (customer.company as string | undefined) ||
      (customer.company_name as string | undefined) ||
      (customer.organization as string | undefined) ||
      this.resolveCustomerName(customer)
    );
  }

  protected resolveSubmitter(profile?: ProfileRow): string {
    if (!profile) return '—';
    return profile.full_name || profile.email || '—';
  }

  protected resolveAssignee(profile?: ProfileRow, fallbackId?: string | null): string | null {
    if (profile?.full_name) return profile.full_name;
    if (profile?.email) return profile.email;
    if (fallbackId) return fallbackId;
    return null;
  }

  protected applyFilters(items: AdminReviewItem[], filters: ReviewListFilters): AdminReviewItem[] {
    const predicates = this.buildFilterPredicates(filters);
    if (predicates.length === 0) {
      return items;
    }
    return items.filter((item) => predicates.every((predicate) => predicate(item)));
  }

  protected applySort(items: AdminReviewItem[], sort: ReviewListFilters['sort'], order: ReviewListFilters['order']): AdminReviewItem[] {
    const sorted = [...items];
    const direction = order === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sort) {
        case 'totalValue':
          return direction * (a.totalValue - b.totalValue);
        case 'dfmFindingCount':
          return direction * (a.dfmFindingCount - b.dfmFindingCount);
        case 'priority':
          return direction * (this.PRIORITY_ORDER.indexOf(a.priority) - this.PRIORITY_ORDER.indexOf(b.priority));
        case 'lastActionAt': {
          const aDate = a.lastActionAt ? new Date(a.lastActionAt).getTime() : 0;
          const bDate = b.lastActionAt ? new Date(b.lastActionAt).getTime() : 0;
          return direction * (aDate - bDate);
        }
        case 'createdAt':
        default: {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return direction * (aDate - bDate);
        }
      }
    });

    return sorted;
  }

  protected applyPagination(items: AdminReviewItem[], limit: number, cursor?: string): PaginationResult {
    let startIndex = 0;
    const decoded = this.decodeCursor(cursor);
    if (decoded) {
      const idx = items.findIndex((item) => item.id === decoded.id);
      if (idx >= 0) {
        startIndex = idx + 1;
      }
    }

    const slice = items.slice(startIndex, startIndex + limit);
    const next = items[startIndex + limit];

    return {
      items: slice,
      nextCursor: next ? this.encodeCursor(next.id) : null,
    };
  }

  protected toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private buildFilterPredicates(filters: ReviewListFilters): FilterPredicate[] {
    const predicates: FilterPredicate[] = [];

    if (filters.lane) {
      const lanes = new Set(this.toArray(filters.lane));
      predicates.push((item) => lanes.has(item.lane));
    }

    if (filters.priority) {
      const priorities = new Set(this.toArray(filters.priority));
      predicates.push((item) => priorities.has(item.priority));
    }

    if (filters.assignee) {
      const assignees = new Set(this.toArray(filters.assignee));
      predicates.push((item) => Boolean(item.assignee && assignees.has(item.assignee)));
    }

    if (filters.hasDFM) {
      predicates.push((item) => item.dfmFindingCount > 0);
    }

    if (filters.search) {
      const needle = filters.search.toLowerCase();
      predicates.push((item) => {
        const haystack = [item.quoteNo, item.customerName, item.company]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      predicates.push((item) => new Date(item.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      predicates.push((item) => new Date(item.createdAt) <= toDate);
    }

    if (typeof filters.minValue === 'number') {
      const minValue = filters.minValue;
      predicates.push((item) => item.totalValue >= minValue);
    }

    if (typeof filters.maxValue === 'number') {
      const maxValue = filters.maxValue;
      predicates.push((item) => item.totalValue <= maxValue);
    }

    return predicates;
  }

  private toArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
  }

  private encodeCursor(id: string): string {
    return Buffer.from(JSON.stringify({ id }), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor?: string | null): { id: string } | null {
    if (!cursor) return null;
    try {
      const json = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed.id === 'string') {
        return { id: parsed.id };
      }
    } catch {
      return null;
    }
    return null;
  }
}
