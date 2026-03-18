import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER || 'openrouter',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  // gpt-4.1-mini: cheap, fast, high quality — ideal for screening & enrichment
  openrouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
}));
