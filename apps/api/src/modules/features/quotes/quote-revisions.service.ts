import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { ContractsV1, buildDiff, DiffResult } from '@cnc-quote/shared';

/**
 * Quote revision persistence service (Phase 2 start)
 * Stores revision metadata & diff summary in quote_revisions table.
 */
@Injectable()
export class QuoteRevisionsService {
  private readonly logger = new Logger(QuoteRevisionsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Create a draft revision with a provided diff summary */
  async createDraftRevision(params: {
    quote_id: string;
    reason?: string;
    diff_summary: ContractsV1.QuoteRevisionSummaryV1['diff_summary'];
    created_by?: string;
    state_snapshot?: Record<string, unknown> | null;
  }): Promise<ContractsV1.QuoteRevisionSummaryV1> {
    const rows = await this.fetchRevisionRows(params.quote_id);
    const nextRevision = (rows[0]?.revision_number || 0) + 1;
    const insert = {
      quote_id: params.quote_id,
      revision_number: nextRevision,
      status: 'draft',
      reason: params.reason || null,
      created_by: params.created_by || null,
      diff_summary: params.diff_summary || [],
      state_snapshot: params.state_snapshot ?? null,
    } as any;
    const { data, error } = await this.supabase.client
      .from('quote_revisions')
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return this.rowToSummary(data);
  }

  /** Create a revision by comparing current quote state with previous revision */
  async createRevisionFromQuoteState(params: {
    quote_id: string;
    current_quote_state: any; // Using any for now to match frontend structure
    reason?: string;
    created_by?: string;
  }): Promise<ContractsV1.QuoteRevisionSummaryV1> {
    // Get the most recent applied revision to compare against
    const rows = await this.fetchRevisionRows(params.quote_id);
    const baseline = this.resolveBaselineSnapshot(rows);
    const diffSummary = this.computeSnapshotDiffSummary(baseline, params.current_quote_state);

    return this.createDraftRevision({
      quote_id: params.quote_id,
      reason: params.reason,
      diff_summary: diffSummary,
      created_by: params.created_by,
      state_snapshot: this.cloneSnapshot(params.current_quote_state),
    });
  }

  async fetchRevisions(quoteId: string): Promise<ContractsV1.QuoteRevisionSummaryV1[]> {
    const rows = await this.fetchRevisionRows(quoteId);
    return rows.map((row) => this.rowToSummary(row));
  }

  async applyRevision(revisionId: string): Promise<ContractsV1.QuoteRevisionApplyResultV1> {
    // Mark revision applied (future: apply diff to quote + create new quote state snapshot)
    const { data: rev, error } = await this.supabase.client
      .from('quote_revisions')
      .update({ status: 'applied', applied_at: new Date().toISOString() })
      .eq('id', revisionId)
      .select()
      .single();
    if (error) throw error;
    // Fetch parent quote summary (placeholder: minimal shape)
    const quoteId = rev.quote_id;
    // For now we return a minimal stub as we do not re-materialize a mutated quote yet.
    const result: ContractsV1.QuoteRevisionApplyResultV1 = {
      quote_id: quoteId,
      revision_id: revisionId,
      applied_at: rev.applied_at,
      new_quote_summary: {
        id: quoteId,
        status: 'draft',
        currency: 'USD',
        parts: [],
        subtotal: 0,
        total: 0,
        expires_at: undefined,
        created_at: rev.created_at,
        updated_at: rev.applied_at
      } as any // cast until full quote summary fetch integrated
    };
    return result;
  }

  private rowToSummary(row: any): ContractsV1.QuoteRevisionSummaryV1 {
    return {
      id: row.id,
      quote_id: row.quote_id,
      revision_number: row.revision_number,
      created_at: row.created_at,
      created_by: row.created_by || undefined,
      reason: row.reason || undefined,
      diff_summary: row.diff_summary || [],
      status: row.status
    };
  }

  private async fetchRevisionRows(quoteId: string): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from('quote_revisions')
      .select('*')
      .eq('quote_id', quoteId)
      .order('revision_number', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  private resolveBaselineSnapshot(rows: any[]): Record<string, unknown> | null {
    const applied = rows.find((row) => row.status === 'applied' && row.state_snapshot);
    if (applied?.state_snapshot) {
      return applied.state_snapshot as Record<string, unknown>;
    }
    const latest = rows.find((row) => row.state_snapshot);
    return (latest?.state_snapshot as Record<string, unknown>) ?? null;
  }

  private computeSnapshotDiffSummary(
    previousState: any,
    currentState: any,
  ): ContractsV1.QuoteRevisionSummaryV1['diff_summary'] {
    const diff = buildDiff(previousState ?? null, currentState ?? null);
    if (!diff) {
      return [];
    }
    const summary: ContractsV1.QuoteRevisionSummaryV1['diff_summary'] = [];
    this.flattenDiff(diff, [], summary);
    return summary.slice(0, 100);
  }

  private flattenDiff(diff: DiffResult, path: string[], acc: ContractsV1.QuoteRevisionSummaryV1['diff_summary']): void {
    if (Array.isArray(diff)) {
      if (diff.length === 1) {
        this.handleAddition(diff[0], path, acc);
        return;
      }

      if (diff.length === 3 && diff[1] === 0 && diff[2] === 0) {
        this.handleRemoval(diff[0], path, acc);
        return;
      }

      if (diff.length >= 2) {
        this.recordChange(path, diff[0], diff[1], acc);
      }
      return;
    }

    if (diff && typeof diff === 'object') {
      for (const [key, value] of Object.entries(diff)) {
        this.flattenDiff(value as DiffResult, [...path, key], acc);
      }
    }
  }

  private formatPath(parts: string[]): string {
    if (!parts.length) {
      return 'root';
    }
    return parts.join('.');
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  private handleAddition(
    value: unknown,
    path: string[],
    acc: ContractsV1.QuoteRevisionSummaryV1['diff_summary'],
  ): void {
    if (this.isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        this.flattenDiff([child] as DiffResult, [...path, key], acc);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        this.flattenDiff([entry] as DiffResult, [...path, String(index)], acc);
      });
      return;
    }

    acc.push({ field: this.formatPath(path), previous: undefined, current: value });
  }

  private handleRemoval(
    value: unknown,
    path: string[],
    acc: ContractsV1.QuoteRevisionSummaryV1['diff_summary'],
  ): void {
    if (this.isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        this.flattenDiff([child, 0, 0] as DiffResult, [...path, key], acc);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        this.flattenDiff([entry, 0, 0] as DiffResult, [...path, String(index)], acc);
      });
      return;
    }

    acc.push({ field: this.formatPath(path), previous: value, current: undefined });
  }

  private recordChange(
    path: string[],
    previous: unknown,
    current: unknown,
    acc: ContractsV1.QuoteRevisionSummaryV1['diff_summary'],
  ): void {
    acc.push({ field: this.formatPath(path), previous, current });
  }

  private cloneSnapshot(snapshot: any): Record<string, unknown> | null {
    if (snapshot === null || snapshot === undefined) {
      return null;
    }
    try {
      return JSON.parse(JSON.stringify(snapshot));
    } catch (error) {
      this.logger.warn(`Failed to clone quote snapshot for revision: ${(error as Error).message}`);
      return snapshot;
    }
  }
}
