import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Query, Req, Res, StreamableFile, UseGuards, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { OrgGuard } from '../../auth/org.guard';
import { GeometryService } from './geometry.service';
import type { Response } from 'express';

@Controller('api/geometry')
@UseGuards(JwtAuthGuard, OrgGuard)
export class GeometryController {
  constructor(private readonly geometry: GeometryService) {}

  @Get(':partId/features')
  async getFeatures(@Req() req: any, @Param('partId') partId: string) {
    const orgId = req.rbac?.orgId;
    const row = await this.geometry.getStoredFeatures(partId, orgId);
    if (!row) throw new NotFoundException('Features not found');
    return row;
  }

  @Get(':partId/mesh')
  async streamMesh(
    @Req() req: any,
  @Param('partId') partId: string,
  @Res({ passthrough: true }) res: Response,
  @Query('lod') lod?: 'low' | 'med' | 'high',
  ) {
    const orgId = req.rbac?.orgId;
    const lodValue = lod ?? 'low';
    const { buffer, contentType, meshVersion } = await this.geometry.fetchMeshGlb(partId, orgId, lodValue);
    res.setHeader('Content-Type', contentType);
    res.setHeader('x-mesh-version', meshVersion);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return new StreamableFile(buffer);
  }

  @Get(':partId/mesh/metadata')
  async getMeshMetadata(
    @Req() req: any,
    @Param('partId') partId: string,
    @Query('lod') lod?: 'low' | 'med' | 'high',
  ) {
    const orgId = req.rbac?.orgId;
    return this.geometry.fetchMeshMetadata(partId, orgId, lod ?? 'low');
  }

  @Post(':partId/analyze')
  @HttpCode(HttpStatus.CREATED)
  async analyze(
    @Req() req: any,
    @Param('partId') partId: string,
    @Body()
    body: {
      file_url: string;
      units_hint?: 'mm' | 'inch' | null;
      org_id?: string;
    },
  ) {
    const orgId = body.org_id ?? req.rbac?.orgId;
    const fileUrl = body.file_url;
    const units = body.units_hint ?? 'mm';

    const result = await this.geometry.analyzeGeometrySync({ file_id: partId, file_path: undefined as any, file_url: fileUrl } as any);
    if (result.error) {
      return { error: result.error };
    }

    const features = this.geometry.toFeaturesJson(result.metrics!, {
      partId,
      fileUrl,
      units,
      loader: 'occ',
    });

    await this.geometry.persistFeatures(partId, orgId, features);

    return {
      features,
      mesh_info: { triangles: 0, decimated_triangles: 0 },
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.CREATED)
  async webhook(
    @Req() req: any,
    @Body()
    body: {
      part_id: string;
      org_id?: string;
      metrics?: any;
      file_url?: string;
      units_hint?: 'mm' | 'inch' | null;
      loader?: 'occ' | 'trimesh';
    },
  ) {
    const secret = process.env.GEOMETRY_WEBHOOK_SECRET;
    const provided = req.headers['x-cad-webhook-secret'];
    const signature = req.headers['x-cad-webhook-signature'];
    if (secret) {
      // Prefer HMAC signature when provided
      if (signature) {
        const payload = JSON.stringify(body ?? {});
        const h = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        if (signature !== `sha256=${h}`) {
          throw new ForbiddenException('Invalid webhook signature');
        }
      } else if (provided !== secret) {
        throw new ForbiddenException('Invalid webhook secret');
      }
    }

    // Optional IP allowlist (comma-separated list of IPs)
    const ipList = (process.env.GEOMETRY_WEBHOOK_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
    if (ipList.length > 0) {
      const remoteIp = (req.ip || '').replace('::ffff:', '');
      const xff = (req.headers['x-forwarded-for'] || '') as string;
      const chain = [remoteIp, ...xff.split(',').map((s) => s.trim()).filter(Boolean)];
      const anyMatch = chain.some((ip) => ipList.includes(ip));
      if (!anyMatch) {
        throw new ForbiddenException('IP not allowed');
      }
    }
    const orgId = body.org_id ?? req.rbac?.orgId;
    if (!body.part_id || !orgId) {
      return { error: 'part_id and org_id are required' };
    }
    if (!body.metrics) {
      return { error: 'metrics are required' };
    }

    const features = this.geometry.toFeaturesJson(body.metrics, {
      partId: body.part_id,
      fileUrl: body.file_url ?? '',
      units: body.units_hint ?? 'mm',
      loader: (body.loader as any) ?? 'occ',
    });
    await this.geometry.persistFeatures(body.part_id, orgId, features);
    return { ok: true };
  }
}
