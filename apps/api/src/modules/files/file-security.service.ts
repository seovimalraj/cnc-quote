import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

interface FileValidationResult {
  isValid: boolean;
  mimeType?: string;
  error?: string;
}

@Injectable()
export class FileSecurityService {
  private readonly logger = new Logger(FileSecurityService.name);

  // Allowed MIME types for CAD files
  private readonly allowedMimeTypes = [
    'application/octet-stream', // Generic binary
    'model/stl', // STL files
    'model/obj', // OBJ files
    'application/sla', // STL files
    'model/step', // STEP files
    'model/step+xml', // STEP XML files
    'application/x-step', // STEP files
    'model/iges', // IGES files
    'application/iges', // IGES files
    'model/x3d+xml', // X3D files
    'application/x-3ds', // 3DS files
    'application/x-blender', // Blender files
    'application/x-fusion360', // Fusion 360 files
    'application/x-solidworks', // SolidWorks files
    'application/x-autocad', // AutoCAD files
    'application/x-inventor', // Inventor files
    'application/zip', // ZIP archives containing CAD files
    'application/x-zip-compressed', // ZIP files
  ];

  // Allowed file extensions
  private readonly allowedExtensions = [
    '.stl', '.obj', '.step', '.stp', '.iges', '.igs', '.x3d',
    '.3ds', '.blend', '.f3d', '.sldprt', '.sldasm', '.dwg', '.dxf',
    '.ipt', '.iam', '.zip'
  ];

  async validateFile(file: Express.Multer.File, req?: Request): Promise<FileValidationResult> {
    try {
      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return {
          isValid: false,
          error: 'File size exceeds maximum allowed size of 50MB'
        };
      }

      // Check file extension
      const extension = path.extname(file.originalname).toLowerCase();
      if (!this.allowedExtensions.includes(extension)) {
        return {
          isValid: false,
          error: `File extension '${extension}' is not allowed`
        };
      }

      // Check MIME type
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        // Some CAD files might have generic MIME types, so we'll be more lenient
        if (!file.mimetype.startsWith('application/') && !file.mimetype.startsWith('model/')) {
          return {
            isValid: false,
            error: `MIME type '${file.mimetype}' is not allowed`
          };
        }
      }

      // Basic content validation for known file types
      const contentValidation = await this.validateFileContent(file);
      if (!contentValidation.isValid) {
        return contentValidation;
      }

      // TODO: Implement virus scanning
      // const virusScan = await this.scanForViruses(file);
      // if (!virusScan.isValid) {
      //   return virusScan;
      // }

      return {
        isValid: true,
        mimeType: file.mimetype
      };

    } catch (error) {
      this.logger.error('Error validating file:', error);
      return {
        isValid: false,
        error: 'File validation failed due to an internal error'
      };
    }
  }

  private async validateFileContent(file: Express.Multer.File): Promise<FileValidationResult> {
    try {
      const buffer = file.buffer;
      const extension = path.extname(file.originalname).toLowerCase();

      // Basic file signature validation
      switch (extension) {
        case '.stl':
          // STL files should start with "solid" (ASCII) or have binary header
          if (buffer.length < 80) {
            return { isValid: false, error: 'STL file is too small' };
          }
          const header = buffer.slice(0, 80).toString('ascii').toLowerCase();
          if (!header.includes('solid') && buffer.readUInt32LE(80) === 0) {
            return { isValid: false, error: 'Invalid STL file format' };
          }
          break;

        case '.step':
        case '.stp':
          // STEP files should contain ISO standard header
          const content = buffer.slice(0, Math.min(1024, buffer.length)).toString('ascii');
          if (!content.includes('ISO') && !content.includes('STEP')) {
            return { isValid: false, error: 'Invalid STEP file format' };
          }
          break;

        case '.zip':
          // ZIP files should have PK header
          if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
            return { isValid: false, error: 'Invalid ZIP file format' };
          }
          break;
      }

      return { isValid: true };
    } catch (error) {
      this.logger.error('Error validating file content:', error);
      return { isValid: false, error: 'File content validation failed' };
    }
  }

  private async scanForViruses(file: Express.Multer.File): Promise<FileValidationResult> {
    // TODO: Implement virus scanning using ClamAV or similar service
    // For now, return valid
    return { isValid: true };
  }

  getAllowedExtensions(): string[] {
    return [...this.allowedExtensions];
  }

  getAllowedMimeTypes(): string[] {
    return [...this.allowedMimeTypes];
  }
}
