/**
 * Step 16: Revisions Service
 * Core business logic for quote revisions
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { AuditService } from '../audit-legacy/audit.service';
import { computeRevisionDiff } from './diff.util';

export interface QuoteRevision {
  id: string;
  org_id: string;
  quote_id: string;
  version: number;
  user_id: string | null;
  event_type: 'user_update' | 'system_reprice' | 'tax_update' | 'restore' | 'initial';
  pricing_hash: string;
  snapshot_json: any;
  diff_json: any;
  note: string | null;
  restored_from_revision_id: string | null;
  created_at: string;
  total_delta: number;
  pct_delta: number;
}

export interface CreateRevisionDto {
  quote_id: string;
  org_id: string;
  user_id: string | null;
  event_type: 'user_update' | 'system_reprice' | 'tax_update' | 'restore' | 'initial';
  pricing_hash: string;
  snapshot_json: any;
  note?: string;
  restored_from_revision_id?: string;
}

@Injectable()
export class RevisionsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new revision
   */
  async create(dto: CreateRevisionDto): Promise<QuoteRevision> {
    const client = this.supabase.client;

    // Get the previous revision to compute diff
    const { data: previousRevision } = await client
      .from('quote_revisions')
      .select('*')
      .eq('quote_id', dto.quote_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Compute diff
    const diff_json = previousRevision
      ? computeRevisionDiff(previousRevision.snapshot_json, dto.snapshot_json)
      : { summary: { total_delta_amount: 0, total_delta_pct: 0 }, fields: [], by_factor: [], lines: [] };

    // Get next version number
    const version = previousRevision ? previousRevision.version + 1 : 1;

    // Insert revision
    const { data: revision, error } = await client
      .from('quote_revisions')
      .insert({
        org_id: dto.org_id,
        quote_id: dto.quote_id,
        version,
        user_id: dto.user_id,
        event_type: dto.event_type,
        pricing_hash: dto.pricing_hash,
        snapshot_json: dto.snapshot_json,
        diff_json,
        note: dto.note,
        restored_from_revision_id: dto.restored_from_revision_id,
        total_delta: diff_json.summary?.total_delta_amount || 0,
        pct_delta: diff_json.summary?.total_delta_pct || 0,
      })
      .select()
      .single();

    if (error) {
      throw new ConflictException(`Failed to create revision: ${error.message}`);
    }

    // Create audit log
    await this.auditService.log({
      action: 'REVISION_CREATED',
      resourceType: 'quote_revision',
      resourceId: revision.id,
      ctx: {
        userId: dto.user_id,
        orgId: dto.org_id,
      },
      after: {
        quote_id: dto.quote_id,
        version,
        event_type: dto.event_type,
        total_delta: diff_json.summary?.total_delta_amount || 0,
        pct_delta: diff_json.summary?.total_delta_pct || 0,
      },
    });

    return revision;
  }

  /**
   * Check if a new revision should be created based on pricing hash
   */
  async shouldCreateRevision(quoteId: string, newHash: string): Promise<boolean> {
    const client = this.supabase.client;

    const { data: lastRevision } = await client
      .from('quote_revisions')
      .select('pricing_hash')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Create if no previous revision or hash changed
    return !lastRevision || lastRevision.pricing_hash !== newHash;
  }

  /**
   * List revisions for a quote with pagination
   */
  async list(
    quoteId: string,
    orgId: string,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<{ items: QuoteRevision[]; next_cursor?: string; has_more: boolean }> {
    const client = this.supabase.client;
    const limit = options.limit || 50;

    let query = client
      .from('quote_revisions')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (options.cursor) {
      const cursorDate = Buffer.from(options.cursor, 'base64').toString('utf-8');
      query = query.lt('created_at', cursorDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list revisions: ${error.message}`);
    }

    const has_more = data.length > limit;
    const items = has_more ? data.slice(0, limit) : data;
    const next_cursor = has_more
      ? Buffer.from(items[items.length - 1].created_at).toString('base64')
      : undefined;

    return { items, next_cursor, has_more };
  }

  /**
   * Get a single revision by ID
   */
  async findOne(revisionId: string, orgId: string): Promise<QuoteRevision> {
    const client = this.supabase.client;

    const { data, error } = await client
      .from('quote_revisions')
      .select('*')
      .eq('id', revisionId)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Revision ${revisionId} not found`);
    }

    return data;
  }

  /**
   * Update revision note
   */
  async updateNote(revisionId: string, orgId: string, userId: string, note: string): Promise<void> {
    const client = this.supabase.client;

    const { error } = await client
      .from('quote_revisions')
      .update({ note })
      .eq('id', revisionId)
      .eq('org_id', orgId);

    if (error) {
      throw new ConflictException(`Failed to update note: ${error.message}`);
    }

    await this.auditService.log({
      action: 'REVISION_ANNOTATED',
      resourceType: 'quote_revision',
      resourceId: revisionId,
      ctx: {
        userId: userId,
        orgId: orgId,
      },
      after: { note },
    });
  }

  // Alias methods for controller compatibility
  async listRevisions(
    quoteId: string,
    orgId: string,
    options: { cursor?: string; limit?: number } = {},
  ) {
    return this.list(quoteId, orgId, options);
  }

  async getRevision(revisionId: string, orgId: string) {
    return this.findOne(revisionId, orgId);
  }

  async compareRevisions(revisionId1: string, revisionId2: string, orgId: string) {
    const [rev1, rev2] = await Promise.all([
      this.findOne(revisionId1, orgId),
      this.findOne(revisionId2, orgId),
    ]);

    const diff = computeRevisionDiff(rev1.snapshot_json, rev2.snapshot_json);

    return {
      from: rev1,
      to: rev2,
      diff,
    };
  }

  async restoreRevision(revisionId: string, orgId: string, userId: string) {
    const revision = await this.findOne(revisionId, orgId);

    // Create a new revision marking this as a restore
    return this.create({
      quote_id: revision.quote_id,
      org_id: orgId,
      user_id: userId,
      event_type: 'restore',
      pricing_hash: revision.pricing_hash,
      snapshot_json: revision.snapshot_json,
      note: `Restored from revision ${revision.version}`,
      restored_from_revision_id: revisionId,
    });
  }

  async updateRevisionNote(revisionId: string, orgId: string, userId: string, note: string) {
    return this.updateNote(revisionId, orgId, userId, note);
  }
}
