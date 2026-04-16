import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;

  if (nodeEnv === 'production' && (!accessKey || !secretKey || accessKey === 'minioadmin')) {
    throw new Error(
      '[Storage Config] S3_ACCESS_KEY and S3_SECRET_KEY must be set with secure values in production. ' +
      'Default "minioadmin" credentials are not allowed.',
    );
  }

  return {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: accessKey || 'minioadmin',
    secretKey: secretKey || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'documents',
    useSsl: process.env.S3_USE_SSL === 'true',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    signedUrlExpiry: parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '900', 10),
    maxDocumentSizeMb: parseInt(process.env.MAX_DOCUMENT_SIZE_MB || '25', 10),
    allowedMimeTypes: (
      process.env.ALLOWED_MIME_TYPES ||
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,text/plain,text/csv'
    ).split(','),
  };
});
