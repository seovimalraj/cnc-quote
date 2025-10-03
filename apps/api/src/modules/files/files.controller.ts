import { Controller, Post, Body, Param, UseGuards, Get, UploadedFile, UseInterceptors, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { OrgGuard } from '../../auth/org.guard';
import { StorageService } from './storage.service';
import { RbacGuard } from '../../auth/rbac.middleware';

@Controller('api/files')
@UseGuards(JwtAuthGuard, OrgGuard)
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Post('initiate')
  @UseGuards(RbacGuard('files:create', 'file'))
  async initiate(
    @Req() req: any,
    @Body() body: { filename: string; size?: number; content_type?: string },
  ) {
    const result = await this.storage.initiateUpload({ ...body, org_id: req.rbac?.orgId });
    req.audit = {
      action: 'FILE_UPLOADED',
      resourceType: 'file',
      resourceId: result.file?.id ?? null,
      before: null,
      after: { filename: body.filename, size: body.size ?? null },
    };
    return result;
  }

  @Post(':id/complete')
  @UseGuards(RbacGuard('files:update', 'file'))
  async complete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { sha256?: string; quote_id?: string; quote_item_id?: string },
  ) {
    const result = await this.storage.completeUpload(id, req.rbac?.orgId, body);
    req.audit = {
      action: 'FILE_UPLOADED',
      resourceType: 'file',
      resourceId: id,
      before: null,
      after: { sha256: body.sha256 ?? null, linked_id: body.quote_item_id ?? body.quote_id ?? null },
    };
    return result;
  }

  @Post('direct')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(RbacGuard('files:create', 'file'))
  async directUpload(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body()
    body: {
      sensitivity?: 'standard' | 'itar' | 'cui';
      linked_type?: string;
      linked_id?: string;
    },
  ) {
    const orgId = req.rbac?.orgId;
    if (!orgId) {
      throw new BadRequestException('Organization context missing');
    }

    const payloadFile = file
      ? {
          buffer: file.buffer as Buffer,
          mimetype: file.mimetype as string,
          originalname: file.originalname as string,
          size: file.size as number,
        }
      : null;

    const result = await this.storage.directUpload({
      org_id: orgId,
      file: payloadFile,
      sensitivity: body?.sensitivity,
      linked_type: body?.linked_type ?? null,
      linked_id: body?.linked_id ?? null,
    });
    req.audit = {
      action: 'FILE_UPLOADED',
      resourceType: 'file',
      resourceId: result?.file?.id ?? null,
      before: null,
      after: { filename: payloadFile?.originalname ?? null, size: payloadFile?.size ?? null },
    };
    return result;
  }

  @Get(':id/download')
  @UseGuards(RbacGuard('files:read', 'file'))
  async getDownloadUrl(@Req() req: any, @Param('id') id: string) {
    return this.storage.getDownloadUrl(id, req.rbac?.orgId);
  }

  @Get(':id/metadata')
  @UseGuards(RbacGuard('files:read', 'file'))
  async getMetadata(@Req() req: any, @Param('id') id: string) {
    return this.storage.getFileById(id, req.rbac?.orgId);
  }
}
