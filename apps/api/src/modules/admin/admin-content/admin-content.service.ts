import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ContractsV1 } from '@cnc-quote/shared';

import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CMS_STATUS_VALUES, CmsStatusValue, UpsertDocumentDto, UpsertPageDto } from './admin-content.dto';

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  summary?: string | null;
  content?: string | null;
  hero_image?: string | null;
  seo_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  published_at?: string | null;
};

type DocumentRow = {
  id: string;
  title: string;
  slug?: string | null;
  status?: string | null;
  description?: string | null;
  document_type?: string | null;
  asset_url?: string | null;
  storage_path?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  published_at?: string | null;
};

export interface ActorContext {
  userId?: string | null;
  role?: string | null;
  email?: string | null;
  ip?: string | null;
}

const CMS_STATUS_SET = new Set<string>(CMS_STATUS_VALUES);

@Injectable()
export class AdminContentService {
  private readonly logger = new Logger(AdminContentService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async listPages(): Promise<ContractsV1.AdminCmsPagesResponseV1> {
  const { data, error } = await this.supabase.client
    .from('admin_cms_pages')
      .select('id, slug, title, status, summary, content, hero_image, seo_description, created_at, updated_at, updated_by, published_at')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) {
      this.logger.error('Failed to load CMS pages', error);
      throw new BadRequestException('Unable to load pages');
    }

    const mapped = (data ?? []).map((row) => this.mapPageRow(row));

    return {
      fetched_at: new Date().toISOString(),
      pages: mapped,
    };
  }

  async listDocuments(): Promise<ContractsV1.AdminCmsDocumentsResponseV1> {
  const { data, error } = await this.supabase.client
    .from('admin_cms_documents')
      .select('id, title, slug, status, description, document_type, asset_url, storage_path, created_at, updated_at, updated_by, published_at')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) {
      this.logger.error('Failed to load CMS documents', error);
      throw new BadRequestException('Unable to load documents');
    }

    const mapped = (data ?? []).map((row) => this.mapDocumentRow(row));

    return {
      fetched_at: new Date().toISOString(),
      documents: mapped,
    };
  }

  async upsertPage(input: UpsertPageDto, actor: ActorContext): Promise<ContractsV1.AdminCmsPageV1> {
    const now = new Date().toISOString();
    const status = this.normalizeStatus(input.status);
    const actorId = actor.userId ?? null;

    const selectColumns = 'id, slug, title, status, summary, content, hero_image, seo_description, created_at, updated_at, updated_by, published_at';

    let previous: ContractsV1.AdminCmsPageV1 | null = null;
    if (input.id) {
      const existing = await this.fetchPageRowById(input.id, selectColumns);
      if (!existing) {
        throw new BadRequestException('Page not found');
      }
      previous = this.mapPageRow(existing);
    }

    const payload: Partial<PageRow> = {
      slug: input.slug,
      title: input.title,
      summary: input.summary ?? null,
      content: input.content ?? null,
      hero_image: input.hero_image ?? null,
      seo_description: input.seo_description ?? null,
      status,
      updated_at: now,
      updated_by: actorId,
    };

    let row: PageRow | null = null;

    if (input.id) {
    const { data, error } = await this.supabase.client
      .from('admin_cms_pages')
        .update(payload)
        .eq('id', input.id)
        .select(selectColumns)
        .single();

      if (error) {
        this.logger.error('Failed to update CMS page', error);
        throw new BadRequestException('Unable to update page');
      }

      row = data;
    } else {
      const insertPayload: Partial<PageRow> & { slug: string; title: string } = {
        ...payload,
        slug: input.slug,
        title: input.title,
        created_at: now,
      };

    const { data, error } = await this.supabase.client
      .from('admin_cms_pages')
        .insert(insertPayload)
        .select(selectColumns)
        .single();

      if (error) {
        this.logger.error('Failed to create CMS page', error);
        throw new BadRequestException('Unable to create page');
      }

      row = data;
    }

    const mapped = this.mapPageRow(row);
    await this.logAudit('page_upsert', 'page', mapped.id, actor, previous, mapped, `CMS page ${input.id ? 'updated' : 'created'}`);
    return mapped;
  }

  async upsertDocument(input: UpsertDocumentDto, actor: ActorContext): Promise<ContractsV1.AdminCmsDocumentV1> {
    const now = new Date().toISOString();
    const status = this.normalizeStatus(input.status);
    const actorId = actor.userId ?? null;

    const selectColumns = 'id, title, slug, status, description, document_type, asset_url, storage_path, created_at, updated_at, updated_by, published_at';

    let previous: ContractsV1.AdminCmsDocumentV1 | null = null;
    if (input.id) {
      const existing = await this.fetchDocumentRowById(input.id, selectColumns);
      if (!existing) {
        throw new BadRequestException('Document not found');
      }
      previous = this.mapDocumentRow(existing);
    }

    const payload: Partial<DocumentRow> = {
      title: input.title,
      slug: input.slug ?? null,
      description: input.description ?? null,
      document_type: input.document_type ?? null,
      asset_url: input.asset_url ?? null,
      storage_path: input.storage_path ?? null,
      status,
      updated_at: now,
      updated_by: actorId,
    };

    let row: DocumentRow | null = null;

    if (input.id) {
    const { data, error } = await this.supabase.client
      .from('admin_cms_documents')
        .update(payload)
        .eq('id', input.id)
        .select(selectColumns)
        .single();

      if (error) {
        this.logger.error('Failed to update CMS document', error);
        throw new BadRequestException('Unable to update document');
      }

      row = data;
    } else {
      const insertPayload: Partial<DocumentRow> & { title: string } = {
        ...payload,
        title: input.title,
        created_at: now,
      };

    const { data, error } = await this.supabase.client
      .from('admin_cms_documents')
        .insert(insertPayload)
        .select(selectColumns)
        .single();

      if (error) {
        this.logger.error('Failed to create CMS document', error);
        throw new BadRequestException('Unable to create document');
      }

      row = data;
    }

    const mapped = this.mapDocumentRow(row);
    await this.logAudit('document_upsert', 'document', mapped.id, actor, previous, mapped, `CMS document ${input.id ? 'updated' : 'created'}`);
    return mapped;
  }

  private normalizeStatus(value?: string | null): CmsStatusValue {
    if (value && CMS_STATUS_SET.has(value)) {
      return value as CmsStatusValue;
    }
    return 'draft';
  }

  private mapPageRow(row: PageRow): ContractsV1.AdminCmsPageV1 {
    const status = this.normalizeStatus(row.status ?? undefined);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status,
      summary: row.summary ?? null,
      content: row.content ?? null,
      hero_image: row.hero_image ?? null,
      seo_description: row.seo_description ?? null,
      updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      created_at: row.created_at ?? null,
      updated_by: row.updated_by ?? null,
      published_at: row.published_at ?? null,
    };
  }

  private mapDocumentRow(row: DocumentRow): ContractsV1.AdminCmsDocumentV1 {
    const status = this.normalizeStatus(row.status ?? undefined);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug ?? null,
      status,
      description: row.description ?? null,
      document_type: row.document_type ?? null,
      asset_url: row.asset_url ?? null,
      storage_path: row.storage_path ?? null,
      updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      created_at: row.created_at ?? null,
      updated_by: row.updated_by ?? null,
      published_at: row.published_at ?? null,
    };
  }

  private async fetchPageRowById(id: string, columns: string): Promise<PageRow | null> {
    const { data, error } = await this.supabase.client
      .from('admin_cms_pages')
      .select(columns)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.logger.error(`Failed to load CMS page ${id}`, error);
      throw new BadRequestException('Unable to load page');
    }

    return data ?? null;
  }

  private async fetchDocumentRowById(id: string, columns: string): Promise<DocumentRow | null> {
    const { data, error } = await this.supabase.client
      .from('admin_cms_documents')
      .select(columns)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.logger.error(`Failed to load CMS document ${id}`, error);
      throw new BadRequestException('Unable to load document');
    }

    return data ?? null;
  }

  private async logAudit(
    action: string,
    targetType: string,
    targetId: string,
    actor: ActorContext,
    before: unknown,
    after: unknown,
    notes?: string,
  ) {
    try {
      const now = new Date().toISOString();
      await this.supabase.client.from('audit_events').insert({
        actor_user_id: actor.userId ?? null,
        actor_role: actor.role ?? null,
        actor_ip: actor.ip ?? null,
        area: 'cms',
        action,
        target_type: targetType,
        target_id: targetId,
        before: before ?? null,
        after: after ?? null,
        notes: notes ?? null,
        ts: now,
        created_at: now,
      });
    } catch (error) {
      this.logger.warn(`Failed to write CMS audit event for ${targetType}:${targetId}: ${error?.message ?? error}`);
    }
  }
}
