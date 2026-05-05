import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface AiCompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AiCompletionResult {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
  latencyMs: number;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly openai?: OpenAI;
  private readonly fallbackOpenrouter?: OpenAI;
  private readonly provider: string;
  private readonly defaultModel: string;
  private readonly baseUrl?: string;
  private readonly fallbackProvider?: string;
  private readonly fallbackModel?: string;
  private readonly ollamaTimeoutMs: number;
  private readonly ollamaFallbackModel: string;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get('ai.provider', 'openrouter');
    this.ollamaTimeoutMs = config.get<number>('ai.ollamaTimeoutMs', 120000);
    this.ollamaFallbackModel = config.get('ai.ollamaFallbackModel', 'llama3.2:1b');

    if (this.provider === 'ollama') {
      this.baseUrl = config.get('ai.ollamaBaseUrl', 'http://localhost:11434');
      this.defaultModel = config.get('ai.ollamaModel', 'llama3.2:1b');

      const fallbackProvider = config.get('ai.fallbackProvider', 'openrouter');
      const openrouterApiKey = config.get<string>('ai.openrouterApiKey');
      if (fallbackProvider === 'openrouter' && openrouterApiKey) {
        const openrouterBaseUrl = config.get('ai.openrouterBaseUrl', 'https://openrouter.ai/api/v1');
        this.fallbackOpenrouter = new OpenAI({
          apiKey: openrouterApiKey,
          baseURL: openrouterBaseUrl,
          defaultHeaders: { 'HTTP-Referer': 'https://srp-ai-labs.com', 'X-Title': 'SRP Platform' },
        });
        this.fallbackProvider = 'openrouter';
        this.fallbackModel = config.get('ai.openrouterModel', 'openai/gpt-4.1-mini');
      }
    } else if (this.provider === 'openrouter') {
      const apiKey = config.get<string>('ai.openrouterApiKey');
      if (!apiKey) {
        throw new Error('AI provider is openrouter but ai.openrouterApiKey is not configured');
      }

      this.baseUrl = config.get('ai.openrouterBaseUrl', 'https://openrouter.ai/api/v1');
      this.openai = new OpenAI({
        apiKey,
        baseURL: this.baseUrl,
        defaultHeaders: { 'HTTP-Referer': 'https://srp-ai-labs.com', 'X-Title': 'SRP Platform' },
      });
      this.defaultModel = config.get('ai.openrouterModel', 'openai/gpt-4.1-mini');
    } else {
      const apiKey = config.get<string>('ai.openaiApiKey');
      if (!apiKey) {
        throw new Error('AI provider is openai but ai.openaiApiKey is not configured');
      }

      this.openai = new OpenAI({ apiKey });
      this.defaultModel = config.get('ai.openaiModel', 'gpt-4o');
    }

    this.logger.log(`AI provider initialized: provider=${this.provider}, defaultModel=${this.defaultModel}`);
  }

  getProviderInfo() {
    return {
      provider: this.provider,
      defaultModel: this.defaultModel,
      baseUrl: this.baseUrl,
    };
  }

  async complete(userPrompt: string, options: AiCompletionOptions = {}): Promise<AiCompletionResult> {
    if (this.provider === 'ollama') {
      try {
        return await this.completeWithOllama(userPrompt, options);
      } catch (error) {
        const message = (error as Error).message || '';
        const requestedModel = options.model || this.defaultModel;
        if (message.includes('requires more system memory') && requestedModel !== this.ollamaFallbackModel) {
          this.logger.warn(`Ollama model ${requestedModel} too large for available RAM, retrying with ${this.ollamaFallbackModel}`);
          return this.completeWithOllama(userPrompt, { ...options, model: this.ollamaFallbackModel });
        }

        if (this.fallbackOpenrouter && this.fallbackProvider === 'openrouter') {
          this.logger.warn(`Ollama failed, falling back to OpenRouter: ${message}`);
          return this.completeWithOpenAI(this.fallbackOpenrouter, userPrompt, {
            ...options,
            model: options.model || this.fallbackModel,
          });
        }
        throw error;
      }
    }

    return this.completeWithOpenAI(this.openai!, userPrompt, options);
  }

  private async completeWithOpenAI(client: OpenAI, userPrompt: string, options: AiCompletionOptions = {}): Promise<AiCompletionResult> {

    const model = options.model || this.defaultModel;
    const start = Date.now();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000,
    });

    const latencyMs = Date.now() - start;
    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      tokensInput: response.usage?.prompt_tokens || 0,
      tokensOutput: response.usage?.completion_tokens || 0,
      model: response.model,
      latencyMs,
    };
  }

  private async completeWithOllama(userPrompt: string, options: AiCompletionOptions = {}): Promise<AiCompletionResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.ollamaTimeoutMs);

    const prompt = options.systemPrompt
      ? `${options.systemPrompt}\n\nUser request:\n${userPrompt}`
      : userPrompt;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.2,
            num_predict: options.maxTokens ?? 1200,
          },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error || `Ollama request failed with status ${response.status}`;
      throw new Error(message);
    }

    return {
      content: data?.response || '',
      tokensInput: 0,
      tokensOutput: data?.eval_count || 0,
      model,
      latencyMs: Date.now() - start,
    };
  }

  async completeJson<T>(userPrompt: string, options: AiCompletionOptions = {}): Promise<{ data: T; meta: Omit<AiCompletionResult, 'content'> }> {
    const result = await this.complete(userPrompt, {
      ...options,
      systemPrompt: (options.systemPrompt || '') + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no extra text.',
    });

    let data: T;
    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim();
      data = JSON.parse(cleaned);
    } catch (e) {
      this.logger.error('Failed to parse AI JSON response', result.content);
      throw new Error(`AI returned invalid JSON: ${result.content.slice(0, 200)}`);
    }

    const { content: _, ...meta } = result;
    return { data, meta };
  }
}
