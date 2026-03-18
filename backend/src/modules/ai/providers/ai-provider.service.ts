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
  private readonly openai: OpenAI;
  private readonly provider: string;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get('ai.provider', 'openai');

    if (this.provider === 'openrouter') {
      this.openai = new OpenAI({
        apiKey: config.get('ai.openrouterApiKey'),
        baseURL: config.get('ai.openrouterBaseUrl'),
        defaultHeaders: { 'HTTP-Referer': 'https://srp-ai-labs.com', 'X-Title': 'SRP Platform' },
      });
      this.defaultModel = config.get('ai.openrouterModel', 'openai/gpt-4o');
    } else {
      this.openai = new OpenAI({ apiKey: config.get('ai.openaiApiKey') });
      this.defaultModel = config.get('ai.openaiModel', 'gpt-4o');
    }
  }

  async complete(userPrompt: string, options: AiCompletionOptions = {}): Promise<AiCompletionResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const response = await this.openai.chat.completions.create({
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
