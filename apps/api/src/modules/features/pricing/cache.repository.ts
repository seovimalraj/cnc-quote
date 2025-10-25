import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../../lib/supabase/supabase.service";

export type PricingCacheCompression = "gzip" | "none";

export interface PricingCacheRecord {
  id: number;
  org_id: string;
  hash: string;
  version: string;
  request_json: Record<string, unknown>;
  response_json: Record<string, unknown>;
  created_at: string;
  ttl_at: string;
  hit_count: number;
  last_hit_at: string | null;
  size_bytes: number | null;
  compression: PricingCacheCompression;
}

export interface PricingCacheUpsertInput {
  orgId: string;
  hash: string;
  version: string;
  requestJson: Record<string, unknown>;
  responseJson: Record<string, unknown>;
  ttlAt: string;
  sizeBytes: number;
  compression?: PricingCacheCompression;
}

@Injectable()
export class PricingCacheRepository {
  private readonly logger = new Logger(PricingCacheRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async find(orgId: string, hash: string, version: string): Promise<PricingCacheRecord | null> {
    const { data, error } = await this.supabase.client
      .from("pricing_cache")
      .select("*")
      .eq("org_id", orgId)
      .eq("hash", hash)
      .eq("version", version)
      .maybeSingle();

    if (error) {
      this.logger.warn("Failed to load pricing cache row", { error, orgId, hash, version });
      return null;
    }

    return (data as PricingCacheRecord) ?? null;
  }

  async upsert(input: PricingCacheUpsertInput): Promise<PricingCacheRecord | null> {
    const { orgId, hash, version, requestJson, responseJson, ttlAt, sizeBytes, compression = "gzip" } = input;
    const payload = {
      org_id: orgId,
      hash,
      version,
      request_json: requestJson,
      response_json: responseJson,
      ttl_at: ttlAt,
      size_bytes: sizeBytes,
      compression,
    } as Record<string, unknown>;

    const { data, error } = await this.supabase.client
      .from("pricing_cache")
      .upsert(payload, { onConflict: "org_id,hash,version" })
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error("Failed to upsert pricing cache row", { error, orgId, hash, version });
      return null;
    }

    return data as PricingCacheRecord;
  }

  async recordHit(id: number, params: { ttlAt?: string } = {}): Promise<void> {
    const mutation: Record<string, unknown> = {
      last_hit_at: new Date().toISOString(),
    };

    if (params.ttlAt) {
      mutation.ttl_at = params.ttlAt;
    }

    const { error } = await this.supabase.client
      .rpc("pricing_cache_record_hit", { cache_id: id, ttl_at_param: params.ttlAt ?? null, now_param: mutation.last_hit_at });

    if (error) {
      // Fallback to direct update if RPC is unavailable
      await this.supabase.client
        .from("pricing_cache")
        .update({
          ...mutation,
        })
        .eq("id", id);
    }
  }

  async overwrite(id: number, input: Omit<PricingCacheUpsertInput, "orgId" | "hash" | "version">): Promise<void> {
    const { requestJson, responseJson, ttlAt, sizeBytes, compression = "gzip" } = input;
    const { error } = await this.supabase.client
      .from("pricing_cache")
      .update({
        request_json: requestJson,
        response_json: responseJson,
        ttl_at: ttlAt,
        size_bytes: sizeBytes,
        compression,
        last_hit_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      this.logger.error("Failed to overwrite pricing cache row", { error, id });
    }
  }

  async deleteByOrg(orgId: string, hashPrefix?: string): Promise<number> {
    let query = this.supabase.client.from("pricing_cache").delete({ count: "estimated" }).eq("org_id", orgId);

    if (hashPrefix) {
      query = query.like("hash", `${hashPrefix}%`);
    }

    const { count } = await query;
    return count ?? 0;
  }
}