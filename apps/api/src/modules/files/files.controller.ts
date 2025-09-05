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
import { FilesService } from './files.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from '../../auth/org.guard';
import { ReqUser } from '../../auth/req-user.decorator';
import { FileMeta } from '../../../../../packages/shared/src/types/schema';

@Controller('files')
@UseGuards(AuthGuard, OrgGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async getFiles(
    @Query() filters: any,
    @ReqUser() user: any,
  ) {
    try {
      const files = await this.filesService.getFiles(user.orgId, filters);
      return { data: files };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch files', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getFile(
    @Param('id') fileId: string,
    @ReqUser() user: any,
  ) {
    try {
      const file = await this.filesService.getFile(fileId, user.orgId);
      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      return { data: file };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { error: 'Failed to fetch file', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createFile(
    @Body() fileData: Partial<FileMeta>,
    @ReqUser() user: any,
  ) {
    try {
      const file = await this.filesService.createFile(fileData, user.id);
      return { data: file };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create file', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateFile(
    @Param('id') fileId: string,
    @Body() updates: Partial<FileMeta>,
    @ReqUser() user: any,
  ) {
    try {
      const file = await this.filesService.updateFile(fileId, updates, user.id);
      return { data: file };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to update file', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/link')
  async linkFileToObject(
    @Param('id') fileId: string,
    @Body() body: { type: string; objectId: string; tags?: string[] },
    @ReqUser() user: any,
  ) {
    try {
      const file = await this.filesService.linkFileToObject(
        fileId,
        body.type,
        body.objectId,
        body.tags,
        user.id,
      );
      return { data: file };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to link file', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/link')
  async unlinkFileFromObject(
    @Param('id') fileId: string,
    @Body() body: { type: string; objectId: string },
    @ReqUser() user: any,
  ) {
    try {
      const file = await this.filesService.unlinkFileFromObject(
        fileId,
        body.type,
        body.objectId,
        user.id,
      );
      return { data: file };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to unlink file', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteFile(
    @Param('id') fileId: string,
    @ReqUser() user: any,
  ) {
    try {
      const file = await this.filesService.deleteFile(fileId, user.id);
      return { data: file };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to delete file', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/download')
  async getDownloadUrl(
    @Param('id') fileId: string,
    @Query('disposition') disposition: 'inline' | 'attachment' = 'inline',
    @ReqUser() user: any,
  ) {
    try {
      const signedUrl = await this.filesService.getSignedUrl(fileId, disposition);
      return { data: { url: signedUrl } };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to generate download URL', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bulk operations
  @Post('bulk/download')
  async bulkDownload(
    @Body() body: { fileIds: string[] },
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.filesService.bulkDownload(body.fileIds, user.id);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create bulk download', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('bulk')
  async bulkDelete(
    @Body() body: { fileIds: string[] },
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.filesService.bulkDelete(body.fileIds, user.id);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to bulk delete files', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk/tag')
  async bulkTag(
    @Body() body: { fileIds: string[]; tags: string[] },
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.filesService.bulkTag(body.fileIds, body.tags, user.id);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to bulk tag files', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Preview operations
  @Post(':id/preview')
  async generatePreview(
    @Param('id') fileId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.filesService.generatePreview(fileId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to generate preview', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Virus scanning
  @Post(':id/scan')
  async scanForVirus(
    @Param('id') fileId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.filesService.scanForVirus(fileId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to scan file', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
