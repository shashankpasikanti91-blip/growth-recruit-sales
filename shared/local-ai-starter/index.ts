export interface LocalAIClientOptions {
  baseDir?: string;
  provider?: 'ollama' | 'openrouter';
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  ollamaFallbackModel?: string;
  ollamaTimeoutMs?: number;
  openrouterApiKey?: string;
  openrouterBaseUrl?: string;
  openrouterModel?: string;
}

export interface CompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface CompletionResult {
  provider: string;
  model: string;
  content: string;
  usage: unknown;
}

export class LocalAIClient {
  provider: 'ollama' | 'openrouter';
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaFallbackModel: string;
  ollamaTimeoutMs: number;
  openrouterApiKey: string;
  openrouterBaseUrl: string;
  openrouterModel: string;

  constructor(options: LocalAIClientOptions = {}) {
    this.provider = options.provider || (process.env.AI_PROVIDER as 'ollama' | 'openrouter') || 'ollama';
    this.ollamaBaseUrl = options.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = options.ollamaModel || process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
    this.ollamaFallbackModel = options.ollamaFallbackModel || process.env.OLLAMA_FALLBACK_MODEL || 'llama3.2:1b';
    this.ollamaTimeoutMs = Number(options.ollamaTimeoutMs || process.env.OLLAMA_TIMEOUT_MS || 120000);
    this.openrouterApiKey = options.openrouterApiKey || process.env.OPENROUTER_API_KEY || '';
    this.openrouterBaseUrl = options.openrouterBaseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.openrouterModel = options.openrouterModel || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini';
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<CompletionResult> {
    if (!prompt) {
      throw new Error('Prompt must be a non-empty string.');
    }

    if (this.provider === 'ollama') {
      try {
        return await this.runOllama(prompt, this.ollamaModel, options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('requires more system memory') && this.ollamaFallbackModel !== this.ollamaModel) {
          return this.runOllama(prompt, this.ollamaFallbackModel, options);
        }
        if (this.openrouterApiKey) {
          return this.runOpenRouter(prompt, options);
        }
        throw error;
      }
    }

    return this.runOpenRouter(prompt, options);
  }

  private async runOllama(prompt: string, model: string, options: CompletionOptions): Promise<CompletionResult> {
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

  private async runOpenRouter(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    if (!this.openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    const response = await fetch(`${this.openrouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openrouterApiKey}`,
        'Content-Type': 'application/json',
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
