import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER || (process.env.NODE_ENV === 'production' ? 'openrouter' : 'ollama'),
  fallbackProvider: process.env.AI_FALLBACK_PROVIDER || 'openrouter',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  // gpt-4.1-mini: cheap, fast, high quality — ideal for screening & enrichment
  openrouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:1b',
  ollamaFallbackModel: process.env.OLLAMA_FALLBACK_MODEL || 'llama3.2:1b',
  ollamaTimeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
}));
