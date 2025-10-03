import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import * as crypto from 'crypto';

export interface GeometryMetrics {
  volume: number;
  surface_area: number;
  bbox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  thickness?: number;
  primitive_features: {
    holes?: number;
    pockets?: number;
    slots?: number;
    faces?: number;
    bends?: number;
    cuts?: number;
    notches?: number;
  };
  material_usage?: {
    stock_size: {
      length: number;
      width: number;
      height?: number;
      thickness?: number;
    };
    waste_percentage: number;
  };
}

export interface GeometryAnalysisRequest {
  file_id: string;
  file_path?: string;
  file_url?: string;
  units_hint?: 'mm' | 'inch' | null;
}

export interface GeometryAnalysisResponse {
  file_id: string;
  task_id?: string;
  metrics?: GeometryMetrics;
  error?: string;
}

@Injectable()
export class GeometryService {
  private readonly logger = new Logger(GeometryService.name);
  private readonly cadServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.cadServiceUrl = this.configService.get<string>('CAD_SERVICE_URL', 'http://localhost:8002');
  }

  /**
   * Request geometry analysis from CAD service (async)
   */
  async analyzeGeometry(request: GeometryAnalysisRequest): Promise<GeometryAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.cadServiceUrl}/analyze`, request)
      );

      return {
        file_id: request.file_id,
        task_id: response.data.task_id,
      };
    } catch (error) {
      this.logger.error(`Failed to request geometry analysis: ${error.message}`);
      return {
        file_id: request.file_id,
        error: error.message,
      };
    }
  }

  /**
   * Request synchronous geometry analysis (for small files)
   */
  async analyzeGeometrySync(request: GeometryAnalysisRequest): Promise<GeometryAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.cadServiceUrl}/analyze/sync`, request)
      );

      return {
        file_id: request.file_id,
        metrics: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze geometry: ${error.message}`);
      return {
        file_id: request.file_id,
        error: error.message,
      };
    }
  }

  /**
   * Get analysis result by task ID
   */
  async getAnalysisResult(taskId: string): Promise<GeometryAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.cadServiceUrl}/analyze/${taskId}`)
      );

      return {
        file_id: response.data.file_id,
        metrics: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis result: ${error.message}`);
      return {
        file_id: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Convert geometry metrics to PartConfigV1 geometry fields
   */
  convertToPartConfig(metrics: GeometryMetrics): any {
    const bbox = metrics.bbox;
    const dimensions = {
      length: Math.abs(bbox.max.x - bbox.min.x),
      width: Math.abs(bbox.max.y - bbox.min.y),
      height: Math.abs(bbox.max.z - bbox.min.z),
    };

    const primitiveFeatures = metrics.primitive_features || {};
    const featureEntries = Object.entries(primitiveFeatures).filter(([, value]) => typeof value === 'number');
    const normalizedFeatureCounts = featureEntries.reduce((acc, [key, value]) => {
      acc[key] = Number(value) || 0;
      return acc;
    }, {} as Record<string, number>);
    const totalFeatures = featureEntries.reduce((sum, [, value]) => sum + (value as number), 0);
    const dominantFeature = featureEntries.sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];
    const riskFlags: string[] = [];

    if (typeof metrics.thickness === 'number' && metrics.thickness > 0 && metrics.thickness < 1.5) {
      riskFlags.push('thin_material');
    }

    if ((normalizedFeatureCounts.holes || 0) >= 12) {
      riskFlags.push('high_hole_density');
    }

    if ((normalizedFeatureCounts.bends || 0) >= 6) {
      riskFlags.push('complex_bend_profile');
    }

    const featureSummary = {
      counts: normalizedFeatureCounts,
      total: totalFeatures || undefined,
      dominant_feature: dominantFeature,
      risk_flags: riskFlags.length ? riskFlags : undefined,
    };

    return {
      geometry: {
        metrics: {
          volume: metrics.volume,
          surface_area: metrics.surface_area,
          bounding_box: metrics.bbox,
          thickness: metrics.thickness,
          feature_summary: featureSummary,
        },
        dimensions,
        features: metrics.primitive_features,
        material_usage: metrics.material_usage,
      },
    };
  }

  /**
   * Transform metrics into features_json schema (v1.0)
   */
  toFeaturesJson(
    metrics: GeometryMetrics,
    opts: { partId: string; fileUrl: string; units: 'mm' | 'inch' | null; loader: 'occ' | 'trimesh' },
  ) {
    const units = opts.units ?? 'mm';
    // metrics.volume is cm^3, surface_area is cm^2 in current mock analyzer
    const volume_mm3 = Math.round((metrics.volume ?? 0) * 1000);
    const surface_area_mm2 = Math.round((metrics.surface_area ?? 0) * 100);
    const bbox = metrics.bbox;
    const holesCount = metrics.primitive_features?.holes ?? 0;
    const pocketsCount = metrics.primitive_features?.pockets ?? 0;

    const holes = Array.from({ length: Number(holesCount) || 0 }).map((_, i) => ({
      id: `H-${String(i + 1).padStart(3, '0')}`,
      type: 'through' as const,
      diameter_mm: 0,
      depth_mm: 0,
      axis: [0, 0, 1],
      entry_face_id: 0,
      exit_face_id: 0,
      tri_indices: [] as number[],
    }));

    const pockets = Array.from({ length: Number(pocketsCount) || 0 }).map((_, i) => ({
      id: `P-${String(i + 1).padStart(3, '0')}`,
      planar_face_ids: [] as number[],
      depth_mm: 0,
      mouth_area_mm2: 0,
      aspect_ratio: 0,
    }));

    const thickness = typeof metrics.thickness === 'number' ? metrics.thickness : 0;
    const global_min_mm = thickness > 0 ? Number(thickness.toFixed(3)) : 0;

  const file_sha256 = crypto.createHash('sha256').update(opts.fileUrl).digest('hex');
    const mesh_available_lods: Array<'low' | 'med' | 'high'> = ['low', 'med', 'high'];
    const approxTriangles = Number(metrics.primitive_features?.faces ?? 0) || undefined;

    return {
      version: '1.0',
      units,
      bbox: { x: Math.abs(bbox.max.x - bbox.min.x), y: Math.abs(bbox.max.y - bbox.min.y), z: Math.abs(bbox.max.z - bbox.min.z) },
      mass_props: { volume_mm3, surface_area_mm2 },
      holes,
      pockets,
      min_wall: { global_min_mm, samples: [] as any[] },
      source: {
        file_sha256,
        file_url: opts.fileUrl,
        loader: opts.loader,
        part_id: opts.partId,
        mesh_available_lods,
        mesh_version_hint: `${file_sha256}:${opts.loader}`,
        approx_triangles: approxTriangles,
      },
    };
  }

  /**
   * Persist features_json row
   */
  async persistFeatures(partId: string, orgId: string, features: any) {
    const { error } = await this.supabase.client.from('geometry_features').insert({
      part_id: partId,
      org_id: orgId,
      features_json: features,
    });
    if (error) {
      this.logger.error(`Failed to persist geometry features: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch latest features by part
   */
  async getStoredFeatures(partId: string, orgId: string) {
    const { data, error } = await this.supabase.client
      .from('geometry_features')
      .select('*')
      .eq('part_id', partId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      this.logger.error(`Failed to fetch geometry features: ${error.message}`);
      throw error;
    }
    return data;
  }

  private ensureFeatureSource(row: any) {
    const source = row?.features_json?.source;
    if (!source?.file_url) {
      throw new NotFoundException('Mesh source unavailable for part');
    }
    const loader: 'occ' | 'trimesh' = source.loader === 'occ' ? 'occ' : 'trimesh';
    const meshAvailableLods: Array<'low' | 'med' | 'high'> = Array.isArray(source.mesh_available_lods)
      ? source.mesh_available_lods
      : ['low', 'med', 'high'];
    return { source, loader, meshAvailableLods };
  }

  async fetchMeshGlb(partId: string, orgId: string, lod: 'low' | 'med' | 'high' = 'low') {
    const row = await this.getStoredFeatures(partId, orgId);
    if (!row) {
      throw new NotFoundException('Geometry features missing');
    }
    const { source, loader, meshAvailableLods } = this.ensureFeatureSource(row);
    if (!meshAvailableLods.includes(lod)) {
      throw new BadRequestException(`LOD "${lod}" not available`);
    }
    const endpoint = loader === 'occ' ? '/gltf/stream-step' : '/gltf/stream';
    const url = `${this.cadServiceUrl}${endpoint}`;
    let response: AxiosResponse<ArrayBuffer>;
    try {
      response = await this.httpService.axiosRef.get(url, {
        params: {
          file_url: source.file_url,
          lod,
        },
        responseType: 'arraybuffer',
      });
    } catch (error: any) {
      this.logger.error(`Failed to fetch mesh GLB: ${error?.message ?? error}`);
      throw new BadRequestException('Unable to fetch mesh stream');
    }
    const meshVersion = (response.headers?.['x-mesh-version'] as string | undefined) ?? `${source.file_sha256}:${lod}`;
    const contentType = (response.headers?.['content-type'] as string | undefined) ?? 'model/gltf-binary';
    return {
      buffer: Buffer.from(response.data),
      meshVersion,
      contentType,
    };
  }

  async fetchMeshMetadata(partId: string, orgId: string, lod: 'low' | 'med' | 'high' = 'low') {
    const row = await this.getStoredFeatures(partId, orgId);
    if (!row) {
      throw new NotFoundException('Geometry features missing');
    }
    const { source, loader, meshAvailableLods } = this.ensureFeatureSource(row);
    if (!meshAvailableLods.includes(lod)) {
      throw new BadRequestException(`LOD "${lod}" not available`);
    }
    const endpoint = loader === 'occ' ? '/gltf/metadata-step' : '/gltf/metadata';
    const url = `${this.cadServiceUrl}${endpoint}`;
    try {
      const response = await this.httpService.axiosRef.get(url, {
        params: {
          file_url: source.file_url,
          lod,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch mesh metadata: ${error?.message ?? error}`);
      throw new BadRequestException('Unable to fetch mesh metadata');
    }
  }
}
