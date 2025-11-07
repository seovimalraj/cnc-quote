import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private readonly bucketName = process.env.MINIO_BUCKET_CAD_FILES || 'cad-files';

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully`);

        // Set bucket policy to allow presigned URLs
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy),
        );
        this.logger.log(`Bucket policy set for ${this.bucketName}`);
      } else {
        this.logger.log(`Bucket ${this.bucketName} already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param file - File buffer
   * @param fileName - Original file name
   * @param mimeType - MIME type of the file
   * @returns Object path in MinIO
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ path: string; size: number }> {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectName = `uploads/${timestamp}-${sanitizedFileName}`;

    try {
      const result = await this.minioClient.putObject(
        this.bucketName,
        objectName,
        file,
        file.length,
        {
          'Content-Type': mimeType,
          'X-Original-Name': fileName,
        },
      );

      this.logger.log(`File uploaded: ${objectName} (${result.etag})`);

      return {
        path: objectName,
        size: file.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for file download (valid for 1 hour)
   * @param objectName - Path to object in MinIO
   * @returns Presigned URL
   */
  async getPresignedUrl(objectName: string): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        60 * 60, // 1 hour
      );
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${objectName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate a presigned URL for file upload (valid for 15 minutes)
   * Allows client-side direct upload to MinIO
   * @param fileName - Original file name
   * @returns Presigned upload URL and object name
   */
  async getPresignedUploadUrl(
    fileName: string,
  ): Promise<{ uploadUrl: string; objectName: string }> {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectName = `uploads/${timestamp}-${sanitizedFileName}`;

    try {
      const uploadUrl = await this.minioClient.presignedPutObject(
        this.bucketName,
        objectName,
        15 * 60, // 15 minutes
      );

      return { uploadUrl, objectName };
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Delete a file from MinIO
   * @param objectName - Path to object in MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`File deleted: ${objectName}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file ${objectName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param objectName - Path to object in MinIO
   */
  async getFileMetadata(objectName: string): Promise<{
    size: number;
    metaData: Record<string, string>;
    lastModified: Date;
  }> {
    try {
      const stat = await this.minioClient.statObject(
        this.bucketName,
        objectName,
      );
      return {
        size: stat.size,
        metaData: stat.metaData,
        lastModified: stat.lastModified,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get file metadata for ${objectName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * List all files in a directory
   * @param prefix - Directory prefix (e.g., 'uploads/')
   */
  async listFiles(prefix: string = 'uploads/'): Promise<
    Array<{
      name: string;
      size: number;
      lastModified: Date;
    }>
  > {
    const files: Array<{ name: string; size: number; lastModified: Date }> =
      [];

    try {
      const stream = this.minioClient.listObjectsV2(
        this.bucketName,
        prefix,
        true,
      );

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        });

        stream.on('error', (err) => {
          this.logger.error(`Error listing files: ${err.message}`);
          reject(err);
        });

        stream.on('end', () => {
          resolve(files);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to list files: ${error.message}`);
      throw error;
    }
  }
}
