import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminFilesService } from './admin-files.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReqUser } from '../auth/req-user.decorator';

@Controller('admin/files')
@UseGuards(AuthGuard, RolesGuard)
export class AdminFilesController {
  constructor(private readonly adminFilesService: AdminFilesService) {}

  @Get()
  @Roles('admin', 'reviewer', 'auditor')
  async getFiles(
    @Query() filters: {
      scope?: string;
      q?: string;
      sensitivity?: string;
      virus_scan?: string;
      date_from?: string;
      date_to?: string;
      org_id?: string;
    },
    @ReqUser() user: any,
  ) {
    try {
      // Add org_id to filters for org-scoped queries
      filters.org_id = user.orgId;
      const files = await this.adminFilesService.getFiles(filters);
      return { data: files };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch files', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Roles('admin', 'reviewer', 'auditor')
  async getFile(
    @Param('id') fileId: string,
  ) {
    try {
      const file = await this.adminFilesService.getFile(fileId);
      return { data: file };
    } catch (error) {
      throw new HttpException(
        { error: 'File not found', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/signed-url')
  @Roles('admin', 'reviewer')
  async generateSignedUrl(
    @Param('id') fileId: string,
    @Body() body: { expires_in?: number },
  ) {
    try {
      const result = await this.adminFilesService.generateSignedUrl(
        fileId,
        body.expires_in || 3600,
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to generate signed URL', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/revoke-link')
  @Roles('admin')
  async revokeSignedUrl(
    @Param('id') fileId: string,
  ) {
    try {
      const result = await this.adminFilesService.revokeSignedUrl(fileId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to revoke signed URL', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/transfer')
  @Roles('admin')
  async transferOwnership(
    @Param('id') fileId: string,
    @Body() transfer: {
      new_org_id: string;
      new_linked_type?: string;
      new_linked_id?: string;
    },
  ) {
    try {
      const result = await this.adminFilesService.transferOwnership(fileId, transfer);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to transfer ownership', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/unlink')
  @Roles('admin')
  async unlinkFile(
    @Param('id') fileId: string,
  ) {
    try {
      const result = await this.adminFilesService.unlinkFile(fileId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to unlink file', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles('admin')
  async deleteFile(
    @Param('id') fileId: string,
  ) {
    try {
      const result = await this.adminFilesService.deleteFile(fileId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to delete file', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk/revoke-links')
  @Roles('admin')
  async bulkRevokeLinks(
    @Body() body: { file_ids: string[] },
  ) {
    try {
      const result = await this.adminFilesService.bulkRevokeLinks(body.file_ids);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to bulk revoke links', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk/delete')
  @Roles('admin')
  async bulkDeleteFiles(
    @Body() body: { file_ids: string[] },
  ) {
    try {
      const result = await this.adminFilesService.bulkDeleteFiles(body.file_ids);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to bulk delete files', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk/transfer')
  @Roles('admin')
  async bulkTransferOwnership(
    @Body() body: {
      file_ids: string[];
      new_org_id: string;
      new_linked_type?: string;
      new_linked_id?: string;
    },
  ) {
    try {
      const result = await this.adminFilesService.bulkTransferOwnership(
        body.file_ids,
        {
          new_org_id: body.new_org_id,
          new_linked_type: body.new_linked_type,
          new_linked_id: body.new_linked_id,
        },
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to bulk transfer ownership', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/sensitivity')
  @Roles('admin')
  async setSensitivity(
    @Param('id') fileId: string,
    @Body() body: { sensitivity: string; reason?: string },
  ) {
    try {
      const result = await this.adminFilesService.setSensitivity(
        fileId,
        body.sensitivity,
        body.reason,
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to set sensitivity', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
