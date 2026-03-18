import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'insecure-default-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'insecure-default-refresh-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || '',
}));
