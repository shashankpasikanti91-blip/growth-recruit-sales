const { loadEnv } = require('./load-env');

class LocalAIClient {
  constructor(options = {}) {
    loadEnv(options.baseDir);

    this.provider = options.provider || process.env.AI_PROVIDER || 'ollama';
    this.ollamaBaseUrl = options.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = options.ollamaModel || process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
    this.ollamaFallbackModel = options.ollamaFallbackModel || process.env.OLLAMA_FALLBACK_MODEL || 'llama3.2:1b';
    this.ollamaTimeoutMs = Number(options.ollamaTimeoutMs || process.env.OLLAMA_TIMEOUT_MS || 120000);
    this.openrouterApiKey = options.openrouterApiKey || process.env.OPENROUTER_API_KEY || '';
    this.openrouterBaseUrl = options.openrouterBaseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.openrouterModel = options.openrouterModel || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini';
  }

  async complete(prompt, options = {}) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string.');
    }

    if (this.provider === 'ollama') {
      try {
        return await this.runOllama(prompt, this.ollamaModel, options);
      } catch (error) {
        const message = error.message || '';
        if (message.includes('requires more system memory') && this.ollamaFallbackModel !== this.ollamaModel) {
          return this.runOllama(prompt, this.ollamaFallbackModel, options);
        }
        if (this.openrouterApiKey) {
          return this.runOpenRouter(prompt, options);
        }
        throw error;
      }
    }

    if (this.provider === 'openrouter') {
      return this.runOpenRouter(prompt, options);
    }

    throw new Error(`Unsupported AI provider: ${this.provider}`);
  }

  async runOllama(prompt, model, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.ollamaTimeoutMs);

    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt: options.systemPrompt ? `${options.systemPrompt}\n\nUser request:\n${prompt}` : prompt,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.2,
            num_predict: options.maxTokens ?? 1200,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Ollama request failed with status ${response.status}`);
      }

      return {
        provider: 'ollama',
        model,
        content: data?.response || '',
        usage: data,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async runOpenRouter(prompt, options = {}) {
    if (!this.openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    const response = await fetch(`${this.openrouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://srp-ai-labs.com',
        'X-Title': process.env.OPENROUTER_X_TITLE || 'SRP Platform',
      },
      body: JSON.stringify({
        model: options.model || this.openrouterModel,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1200,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a senior software engineer. Give production-ready output.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenRouter request failed with status ${response.status}`);
    }

    return {
      provider: 'openrouter',
      model: data?.model || this.openrouterModel,
      content: data?.choices?.[0]?.message?.content || '',
      usage: data?.usage || null,
    };
  }
}

module.exports = { LocalAIClient };
