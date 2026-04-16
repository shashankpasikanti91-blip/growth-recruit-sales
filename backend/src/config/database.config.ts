import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[Database Config] DATABASE_URL is required. ' +
      'Set it in your .env file, e.g. postgresql://user:pass@host:5432/dbname',
    );
  }
  return { url };
});
