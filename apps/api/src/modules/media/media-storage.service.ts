import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', 'rbs-media');
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL', '');

    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY');

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
      this.logger.warn('S3 credentials are not fully configured. Media uploads will fail.');
    }
  }

  async uploadFile(file: UploadedFile, folder: string = 'uploads'): Promise<string> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('Storage service is not configured');
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${folder}/${uuidv4()}${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Deprecated in some S3 providers, but standard for public buckets
      });

      await this.s3Client.send(command);
      
      return `${this.publicUrl.replace(/\/$/, '')}/${filename}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${(error as Error).message}`);
      throw new InternalServerErrorException('Could not upload file');
    }
  }

  async deleteFileByUrl(url: string): Promise<void> {
    if (!this.s3Client) {
      this.logger.warn('Storage service not configured, skipping S3 deletion.');
      return;
    }

    if (!url.startsWith(this.publicUrl)) {
      this.logger.warn('URL does not belong to the current S3 public URL, skipping deletion.');
      return;
    }

    const key = url.replace(this.publicUrl, '').replace(/^\//, '');

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: decodeURIComponent(key),
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${(error as Error).message}`);
    }
  }
}
