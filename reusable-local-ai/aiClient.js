const { loadEnv } = require('./loadEnv');

loadEnv(__dirname);

const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
const OLLAMA_FALLBACK_MODEL = process.env.OLLAMA_FALLBACK_MODEL || 'llama3:latest';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini';

async function runOllama(prompt, model, options = {}) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Ollama request failed with status ${response.status}`);
  }

  return {
    content: data?.response || '',
    model: data?.model || model,
    usage: data?.usage || null,
  };
}

async function runOpenRouter(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required for OpenRouter fallback.');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://local-project.dev',
      'X-Title': process.env.OPENROUTER_X_TITLE || 'Reusable Local AI Starter',
    },
    body: JSON.stringify({
      model: options.model || OPENROUTER_MODEL,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1200,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'You are a senior software engineer. Return practical output.',
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
    content: data?.choices?.[0]?.message?.content || '',
    model: data?.model || options.model || OPENROUTER_MODEL,
    usage: data?.usage || null,
  };
}

async function runAI(prompt, options = {}) {
  const finalPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\nUser request:\n${prompt}`
    : prompt;

  if (AI_PROVIDER === 'ollama') {
    try {
      return await runOllama(finalPrompt, options.model || OLLAMA_MODEL, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('requires more system memory') && (options.model || OLLAMA_MODEL) !== OLLAMA_FALLBACK_MODEL) {
        return runOllama(finalPrompt, OLLAMA_FALLBACK_MODEL, options);
      }

      if (process.env.OPENROUTER_API_KEY) {
        return runOpenRouter(prompt, options);
      }

      throw error;
    }
  }

  return runOpenRouter(prompt, options);
}

module.exports = { runAI };