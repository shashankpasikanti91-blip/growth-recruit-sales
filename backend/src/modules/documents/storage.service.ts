import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client;
  private bucket: string;
  private signedUrlExpiry: number;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.config.get<string>('storage.endpoint');
    const region = this.config.get<string>('storage.region');
    const accessKey = this.config.get<string>('storage.accessKey');
    const secretKey = this.config.get<string>('storage.secretKey');
    const forcePathStyle = this.config.get<boolean>('storage.forcePathStyle');

    this.bucket = this.config.get<string>('storage.bucket', 'documents');
    this.signedUrlExpiry = this.config.get<number>('storage.signedUrlExpiry', 900);

    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    await this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch {
      this.logger.warn(`Bucket "${this.bucket}" not found — creating`);
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      } catch (err) {
        this.logger.error(`Failed to create bucket: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Upload a buffer to S3. Returns the storage key used.
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );
    return key;
  }

  /**
   * Download file content from S3.
   */
  async download(key: string): Promise<{ body: ReadableStream; contentType: string }> {
    const resp = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      body: resp.Body as unknown as ReadableStream,
      contentType: resp.ContentType || 'application/octet-stream',
    };
  }

  /**
   * Generate a time-limited pre-signed download URL.
   */
  async getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresIn ?? this.signedUrlExpiry },
    );
  }

  /**
   * Delete a file from S3.
   */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getBucket(): string {
    return this.bucket;
  }
}
