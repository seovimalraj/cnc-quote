import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtGuard } from '../../auth/jwt.guard';
import { OrgGuard } from '../../auth/org.guard';
import { User } from '../../auth/user.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtGuard, OrgGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/init')
  async initiateUpload(
    @Body() body: { fileName: string; fileSize: number; organizationId: string },
    @User('sub') userId: string,
  ) {
    return this.filesService.initiateUpload(body, userId);
  }

  @Post('upload/complete')
  async completeUpload(
    @Body() body: { fileId: string },
    @User('sub') userId: string,
  ) {
    return this.filesService.completeUpload(body.fileId, userId);
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @User('sub') userId: string) {
    return this.filesService.getFile(id, userId);
  }

  @Get(':id/download')
  async getDownloadUrl(@Param('id') id: string, @User('sub') userId: string) {
    return this.filesService.getDownloadUrl(id, userId);
  }
}
