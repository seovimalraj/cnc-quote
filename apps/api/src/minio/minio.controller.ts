import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from './minio.service';

@Controller('storage')
export class MinioController {
  constructor(private readonly minioService: MinioService) {}

  /**
   * Upload a file directly to server, then to MinIO
   * POST /storage/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'model/step',
      'model/stp',
      'model/stl',
      'model/iges',
      'model/igs',
      'application/sla',
      'application/octet-stream', // Generic binary
    ];

    const allowedExtensions = ['.step', '.stp', '.stl', '.iges', '.igs', '.x_t'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `File type not allowed. Supported: ${allowedExtensions.join(', ')}`,
      );
    }

    // Max file size: 100MB
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 100MB limit');
    }

    const result = await this.minioService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    return {
      success: true,
      file: {
        name: file.originalname,
        path: result.path,
        size: result.size,
        mimeType: file.mimetype,
      },
    };
  }

  /**
   * Get presigned upload URL for client-side direct upload
   * POST /storage/upload-url
   */
  @Post('upload-url')
  async getUploadUrl(@Body('fileName') fileName: string) {
    if (!fileName) {
      throw new BadRequestException('fileName is required');
    }

    // Validate file extension
    const allowedExtensions = ['.step', '.stp', '.stl', '.iges', '.igs', '.x_t'];
    const fileExtension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `File type not allowed. Supported: ${allowedExtensions.join(', ')}`,
      );
    }

    const result = await this.minioService.getPresignedUploadUrl(fileName);

    return {
      success: true,
      uploadUrl: result.uploadUrl,
      objectName: result.objectName,
      fileName,
    };
  }

  /**
   * Get presigned download URL
   * GET /storage/download/:objectName
   */
  @Get('download/*')
  async getDownloadUrl(@Req() request: Request) {
    // Extract objectName from full path after /storage/download/
    const fullPath = request.path;
    const objectName = fullPath.replace('/storage/download/', '');
    
    if (!objectName) {
      throw new BadRequestException('Object name is required');
    }

    const url = await this.minioService.getPresignedUrl(objectName);

    return {
      success: true,
      downloadUrl: url,
      objectName,
    };
  }

  /**
   * Get file metadata
   * GET /storage/metadata/:objectName
   */
  @Get('metadata/*')
  async getMetadata(@Req() request: Request) {
    // Extract objectName from full path after /storage/metadata/
    const fullPath = request.path;
    const objectName = fullPath.replace('/storage/metadata/', '');
    
    if (!objectName) {
      throw new BadRequestException('Object name is required');
    }

    const metadata = await this.minioService.getFileMetadata(objectName);

    return {
      success: true,
      metadata,
      objectName,
    };
  }

  /**
   * List files in a directory
   * GET /storage/files?prefix=uploads/
   */
  @Get('files')
  async listFiles(@Query('prefix') prefix?: string) {
    const files = await this.minioService.listFiles(prefix);

    return {
      success: true,
      count: files.length,
      files,
    };
  }

  /**
   * Delete a file
   * DELETE /storage/:objectName
   */
  @Delete('*')
  async deleteFile(@Req() request: Request) {
    // Extract objectName from full path after /storage/
    const fullPath = request.path;
    const objectName = fullPath.replace('/storage/', '');
    
    if (!objectName) {
      throw new BadRequestException('Object name is required');
    }

    await this.minioService.deleteFile(objectName);

    return {
      success: true,
      message: 'File deleted successfully',
      objectName,
    };
  }
}
