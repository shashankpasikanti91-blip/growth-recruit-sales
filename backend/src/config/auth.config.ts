import { registerAs } from '@nestjs/config';

const INSECURE_DEFAULTS = ['insecure-default-secret', 'insecure-default-refresh-secret', 'secret', 'changeme'];

function requireSecret(envVar: string, value: string | undefined): string {
  if (!value || INSECURE_DEFAULTS.includes(value) || value.length < 32) {
    throw new Error(
      `[Auth Config] ${envVar} is missing, insecure, or too short (min 32 chars). ` +
      `Set a strong random secret in your .env file. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
    );
  }
  return value;
}

export default registerAs('auth', () => ({
  jwtSecret: requireSecret('JWT_SECRET', process.env.JWT_SECRET),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/google/callback',
}));
