import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
  bucket: process.env.S3_BUCKET || 'documents',
  useSsl: process.env.S3_USE_SSL === 'true',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  signedUrlExpiry: parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '900', 10),
  maxDocumentSizeMb: parseInt(process.env.MAX_DOCUMENT_SIZE_MB || '25', 10),
  allowedMimeTypes: (
    process.env.ALLOWED_MIME_TYPES ||
    'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,text/plain,text/csv'
  ).split(','),
}));
