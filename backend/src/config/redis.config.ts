import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || '';

  if (nodeEnv === 'production' && !password) {
    throw new Error(
      '[Redis Config] REDIS_PASSWORD is required in production. ' +
      'Set it in your .env file to secure your Redis instance.',
    );
  }

  return {
    host,
    port,
    password,
    url: process.env.REDIS_URL || `redis://${host}:${port}`,
  };
});
