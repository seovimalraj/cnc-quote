import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { AdminHealthService, HealthStatus } from "../admin/admin/admin-health/admin-health.service";

export interface SystemHealthSummary {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    api: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency_ms: number;
      last_check: string;
    };
    cad: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency_ms: number;
      last_check: string;
    };
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency_ms: number;
      last_check: string;
    };
    redis: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency_ms: number;
      last_check: string;
    };
    queues: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      depth: number;
      last_check: string;
    };
  };
  uptime_seconds: number;
  last_updated: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  version: string;
  last_updated: string;
  effective_date: string;
}

/**
 * @module AdminSystemService
 * @ownership platform-observability
 * Provides aggregated system telemetry and regulated legal document retrieval for the admin workcenter.
 * The service intentionally delegates health probes to dedicated modules and Supabase so that summary
 * endpoints stay deterministic and auditable, while legal copy is sourced from a single canonical store.
 */
@Injectable()
export class AdminSystemService {
  private static readonly HEALTH_SUMMARY_CACHE_KEY = 'admin:system:health_summary';
  private static readonly HEALTH_SUMMARY_TTL_SECONDS = 30;
  private static readonly LEGAL_DOCUMENT_CACHE_TTL_SECONDS = 60 * 5;
  private static readonly LEGAL_DOCUMENT_COLLECTION_CACHE_KEY = 'admin:system:legal_documents';
  private static readonly KNOWN_LEGAL_TYPES = ['terms', 'privacy', 'dpa', 'security', 'aup'];

  private readonly logger = new Logger(AdminSystemService.name);
  private readonly bootedAt = new Date();
  private readonly legalDocumentsTable?: string;
  private readonly legalDocumentsBucket?: string;
  private readonly legalDocumentsPrefix?: string;
  private legalDocumentsTableAvailable = true;
  private legalDocumentsBucketAvailable = true;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
    private readonly adminHealthService: AdminHealthService,
    private readonly configService: ConfigService,
  ) {
  const table = this.configService.get<string>('LEGAL_DOCUMENTS_TABLE', 'legal_documents');
  this.legalDocumentsTable = table?.trim() ? table.trim() : 'legal_documents';

  const bucket = this.configService.get<string>('LEGAL_DOCUMENTS_BUCKET', 'legal-documents');
  this.legalDocumentsBucket = bucket?.trim() ? bucket.trim() : 'legal-documents';

    const prefix = this.configService.get<string>('LEGAL_DOCUMENTS_PREFIX');
    this.legalDocumentsPrefix = prefix?.trim() ? prefix.trim() : 'legal';
  }

  async getSystemHealthSummary(): Promise<SystemHealthSummary> {
    const cached = await this.cache.get<SystemHealthSummary>(AdminSystemService.HEALTH_SUMMARY_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const observedAt = new Date().toISOString();

    const [apiResult, cadResult, dbResult, queuesResult] = await Promise.allSettled([
      this.adminHealthService.getApiHealth(),
      this.adminHealthService.getCadHealth(),
      this.adminHealthService.getDbHealth(),
      this.adminHealthService.getQueuesHealth(),
    ]);

    const apiHealth = this.unwrapHealthResult(apiResult, 'api');
    const cadHealth = this.unwrapHealthResult(cadResult, 'cad');
    const dbHealth = this.unwrapHealthResult(dbResult, 'database');
    const queueHealth = this.unwrapHealthResult(queuesResult, 'queues');
    const redisHealth = await this.checkRedisHealth();

    const services = {
      api: this.buildStandardServiceEntry(apiHealth, observedAt),
      cad: this.buildStandardServiceEntry(cadHealth, observedAt),
      database: this.buildStandardServiceEntry(dbHealth, observedAt),
      redis: redisHealth,
      queues: this.buildQueueServiceEntry(queueHealth, observedAt),
    };

    const overallStatus = this.deriveOverallStatus([
      services.api.status,
      services.cad.status,
      services.database.status,
      services.redis.status,
      services.queues.status,
    ]);

    const summary: SystemHealthSummary = {
      overall_status: overallStatus,
      services,
      uptime_seconds: await this.resolveUptimeSeconds(),
      last_updated: observedAt,
    };

    await this.cache.set(
      AdminSystemService.HEALTH_SUMMARY_CACHE_KEY,
      summary,
      AdminSystemService.HEALTH_SUMMARY_TTL_SECONDS,
    );

    return summary;
  }

  async getLegalDocument(type: string): Promise<LegalDocument> {
    const slug = type.trim().toLowerCase();
    const cacheKey = this.getLegalDocumentCacheKey(slug);
    const cached = await this.cache.get<LegalDocument>(cacheKey);
    if (cached) {
      return cached;
    }

    const document = await this.loadLegalDocument(slug);
    if (!document) {
      throw new NotFoundException(`Legal document '${slug}' not found`);
    }

    await this.cache.set(cacheKey, document, AdminSystemService.LEGAL_DOCUMENT_CACHE_TTL_SECONDS);
    return document;
  }

  async getAllLegalDocuments(): Promise<LegalDocument[]> {
    const cached = await this.cache.get<LegalDocument[]>(
      AdminSystemService.LEGAL_DOCUMENT_COLLECTION_CACHE_KEY,
    );
    if (cached?.length) {
      return cached;
    }

    const tableDocuments = await this.loadAllLegalDocumentsFromTable();
    const documents = tableDocuments.length
      ? tableDocuments
      : await this.loadDocumentsFromFallbackTypes();

    if (!documents.length) {
      throw new NotFoundException('No legal documents available');
    }

    await this.cache.set(
      AdminSystemService.LEGAL_DOCUMENT_COLLECTION_CACHE_KEY,
      documents,
      AdminSystemService.LEGAL_DOCUMENT_CACHE_TTL_SECONDS,
    );

    return documents;
  }

  async logSystemEvent(
    eventType: string,
    details: any,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.supabase.client
        .from('system_events')
        .insert({
          event_type: eventType,
          details,
          user_id: userId,
          ip_address: ipAddress,
          ts: new Date().toISOString(),
        });
    } catch (error) {
      this.logger.error('Failed to log system event', error);
    }
  }

  private async loadDocumentsFromFallbackTypes(): Promise<LegalDocument[]> {
    const results = await Promise.allSettled(
      AdminSystemService.KNOWN_LEGAL_TYPES.map((slug) => this.loadLegalDocument(slug)),
    );

    return results
      .filter((result): result is PromiseFulfilledResult<LegalDocument | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((doc): doc is LegalDocument => Boolean(doc));
  }

  private buildStandardServiceEntry(
    health: HealthStatus | null,
    observedAt: string,
  ): SystemHealthSummary['services']['api'] {
    return {
      status: this.mapHealthStatus(health?.status),
      latency_ms: health?.latency_ms ?? 0,
      last_check: health?.last_heartbeat ?? observedAt,
    };
  }

  private buildQueueServiceEntry(
    health: HealthStatus | null,
    observedAt: string,
  ): SystemHealthSummary['services']['queues'] {
    const depth = typeof health?.meta?.total_waiting === 'number' ? health.meta.total_waiting : 0;
    return {
      status: this.mapHealthStatus(health?.status),
      depth,
      last_check: health?.last_heartbeat ?? observedAt,
    };
  }

  private mapHealthStatus(status?: HealthStatus['status']): 'healthy' | 'degraded' | 'unhealthy' {
    if (status === 'warn') {
      return 'degraded';
    }
    if (status === 'ok') {
      return 'healthy';
    }
    return 'unhealthy';
  }

  private deriveOverallStatus(statuses: Array<'healthy' | 'degraded' | 'unhealthy'>): 'healthy' | 'degraded' | 'unhealthy' {
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  private unwrapHealthResult(
    result: PromiseSettledResult<HealthStatus>,
    service: string,
  ): HealthStatus | null {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    this.logger.error(`Health probe for ${service} failed`, result.reason);
    return null;
  }

  private async checkRedisHealth(): Promise<SystemHealthSummary['services']['redis']> {
    const pulseKey = 'admin:system:redis:pulse';
    const observedAt = new Date().toISOString();
    const start = Date.now();

    try {
      const token = `${observedAt}:${Math.random()}`;
      await this.cache.set(pulseKey, token, 10);
      const roundTrip = await this.cache.get<string>(pulseKey);
      const latency = Date.now() - start;

      if (roundTrip !== token) {
        this.logger.warn('Redis pulse check returned unexpected payload');
        return {
          status: 'degraded',
          latency_ms: latency,
          last_check: observedAt,
        };
      }

      return {
        status: 'healthy',
        latency_ms: latency,
        last_check: observedAt,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'unhealthy',
        latency_ms: Date.now() - start,
        last_check: observedAt,
      };
    }
  }

  private async resolveUptimeSeconds(): Promise<number> {
    try {
      const { data, error } = await this.supabase.client
        .from('metrics_gauges')
        .select('value')
        .eq('metric', 'system.uptime_seconds')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!error && data?.length && typeof data[0].value === 'number') {
        return Math.floor(data[0].value);
      }

      if (error) {
        this.logger.warn('Failed to resolve uptime from metrics', error);
      }
    } catch (error) {
      this.logger.warn('Failed to resolve uptime from metrics', error);
    }

    return Math.floor((Date.now() - this.bootedAt.getTime()) / 1000);
  }

  private getLegalDocumentCacheKey(slug: string): string {
    return `admin:system:legal:${slug}`;
  }

  private async loadLegalDocument(slug: string): Promise<LegalDocument | null> {
    const tableDocument = await this.loadLegalDocumentFromTable(slug);
    if (tableDocument) {
      return tableDocument;
    }

    return this.loadLegalDocumentFromStorage(slug);
  }

  private async loadLegalDocumentFromTable(slug: string): Promise<LegalDocument | null> {
    if (!this.legalDocumentsTable || !this.legalDocumentsTableAvailable) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.client
        .from(this.legalDocumentsTable)
        .select('id, slug, type, title, version, content, content_md, updated_at, last_updated, effective_date, effective_at, metadata')
        .or(`slug.eq.${slug},type.eq.${slug}`)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        if (error.message?.includes('does not exist')) {
          this.logger.warn(
            `Legal documents table '${this.legalDocumentsTable}' is unavailable; disabling table lookups until restart`,
          );
          this.legalDocumentsTableAvailable = false;
          return null;
        }

        this.logger.error(`Failed to fetch legal document '${slug}' from table`, error);
        return null;
      }

      const row = data?.[0];
      if (!row) {
        return null;
      }

      const content = row.content_md ?? row.content;
      if (!content) {
        this.logger.warn(`Legal document '${slug}' returned without content payload`);
      }

      return {
        id: row.id?.toString() ?? row.slug ?? row.type ?? slug,
        title: row.title ?? this.inferTitle(slug),
        content: content ?? '',
        version: row.version ?? row.metadata?.version ?? 'unknown',
        last_updated: this.normalizeIsoString(row.updated_at ?? row.last_updated) ?? new Date().toISOString(),
        effective_date: this.normalizeIsoString(row.effective_date ?? row.effective_at) ?? new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Unexpected failure loading legal document '${slug}' from table`, error);
      return null;
    }
  }

  private async loadAllLegalDocumentsFromTable(): Promise<LegalDocument[]> {
    if (!this.legalDocumentsTable || !this.legalDocumentsTableAvailable) {
      return [];
    }

    try {
      const { data, error } = await this.supabase.client
        .from(this.legalDocumentsTable)
        .select('id, slug, type, title, version, content, content_md, updated_at, last_updated, effective_date, effective_at, metadata')
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist')) {
          this.logger.warn(
            `Legal documents table '${this.legalDocumentsTable}' is unavailable; disabling table lookups until restart`,
          );
          this.legalDocumentsTableAvailable = false;
          return [];
        }

        this.logger.error('Failed to fetch legal documents from table', error);
        return [];
      }

      return (
        data?.map((row: any) => {
          const content = row.content_md ?? row.content ?? '';
          const slug = row.slug ?? row.type ?? 'document';
          return {
            id: row.id?.toString() ?? slug,
            title: row.title ?? this.inferTitle(slug),
            content,
            version: row.version ?? row.metadata?.version ?? 'unknown',
            last_updated: this.normalizeIsoString(row.updated_at ?? row.last_updated) ?? new Date().toISOString(),
            effective_date: this.normalizeIsoString(row.effective_date ?? row.effective_at) ?? new Date().toISOString(),
          } as LegalDocument;
        }) ?? []
      );
    } catch (error) {
      this.logger.error('Unexpected failure loading legal documents from table', error);
      return [];
    }
  }

  private async loadLegalDocumentFromStorage(slug: string): Promise<LegalDocument | null> {
    if (!this.legalDocumentsBucket || !this.legalDocumentsBucketAvailable) {
      return null;
    }

    const prefix = this.legalDocumentsPrefix ? `${this.legalDocumentsPrefix}/${slug}` : slug;

    try {
      const { data: files, error } = await this.supabase.client.storage
        .from(this.legalDocumentsBucket)
        .list(prefix, { limit: 1, sortBy: { column: 'updated_at', order: 'desc' } });

      if (error) {
        this.logger.error(`Failed to list legal document files for '${slug}'`, error);
        if (error.message?.includes('not found')) {
          this.legalDocumentsBucketAvailable = false;
        }
        return null;
      }

      const file = files?.[0];
      if (!file) {
        return null;
      }

      const path = prefix ? `${prefix}/${file.name}` : file.name;
      const { data: blob, error: downloadError } = await this.supabase.client.storage
        .from(this.legalDocumentsBucket)
        .download(path);

      if (downloadError || !blob) {
        this.logger.error(`Failed to download legal document '${slug}' at path ${path}`, downloadError);
        return null;
      }

      const content = await blob.text();
      const version = file.metadata?.version ?? this.extractVersionFromFilename(file.name) ?? 'unknown';
      const effectiveDate = this.normalizeIsoString(file.metadata?.effective_date ?? file.updated_at);

      return {
        id: `${slug}:${file.name}`,
        title: this.inferTitle(slug),
        content,
        version,
        last_updated: this.normalizeIsoString(file.updated_at) ?? new Date().toISOString(),
        effective_date: effectiveDate ?? new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Unexpected failure retrieving legal document '${slug}' from storage`, error);
      return null;
    }
  }

  private inferTitle(slug: string): string {
    return slug
      .split(/[-_]/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private normalizeIsoString(value?: string | Date | null): string | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString();
  }

  private extractVersionFromFilename(filename: string): string | undefined {
    const match = filename.match(/v?(\d+\.\d+\.\d+)/i);
    return match?.[1];
  }
}
