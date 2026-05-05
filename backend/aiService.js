const { loadEnv } = require('./loadEnv');

loadEnv();

const AI_PROVIDER = process.env.AI_PROVIDER || (process.env.NODE_ENV === 'production' ? 'openrouter' : 'ollama');
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_FALLBACK_MODEL = process.env.OLLAMA_FALLBACK_MODEL || 'llama3:latest';

function resolveProviderConfig(options = {}) {
  if (AI_PROVIDER === 'ollama') {
    return {
      apiKey: 'local',
      url: `${OLLAMA_BASE_URL}/api/generate`,
      model: options.model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b',
      headers: {},
      provider: 'ollama',
    };
  }

  if (AI_PROVIDER === 'openai') {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      url: 'https://api.openai.com/v1/chat/completions',
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4o',
      headers: {},
      provider: 'openai',
    };
  }

  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    url: `${OPENROUTER_BASE_URL}/chat/completions`,
    model: options.model || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://srp-ai-labs.com',
      'X-Title': process.env.OPENROUTER_X_TITLE || 'SRP Platform',
    },
    provider: 'openrouter',
  };
}

async function runOpenrouterFallback(prompt, options = {}) {
  const fallbackApiKey = process.env.OPENROUTER_API_KEY;
  if (!fallbackApiKey) {
    throw new Error('Ollama request failed and OPENROUTER_API_KEY is not configured for fallback.');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fallbackApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://srp-ai-labs.com',
      'X-Title': process.env.OPENROUTER_X_TITLE || 'SRP Platform',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1200,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'You are a senior SaaS engineer. Give production-ready output.',
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
    const message = data?.error?.message || data?.message || `Fallback OpenRouter request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    content: data?.choices?.[0]?.message?.content || '',
    model: data?.model || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
    usage: data?.usage || null,
  };
}

async function runAI(prompt, options = {}) {
  const providerConfig = resolveProviderConfig(options);
  const apiKey = providerConfig.apiKey;
  if (providerConfig.provider !== 'ollama' && !apiKey) {
    throw new Error(
      providerConfig.provider === 'openai'
        ? 'Missing OPENAI_API_KEY in environment variables.'
        : 'Missing OPENROUTER_API_KEY in environment variables.',
    );
  }

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string.');
  }

  let response;
  if (providerConfig.provider === 'ollama') {
    const runOllama = async (model) => fetch(providerConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: options.systemPrompt
          ? `${options.systemPrompt}\n\nUser request:\n${prompt}`
          : prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.2,
          num_predict: options.maxTokens ?? 1200,
        },
      }),
    });

    try {
      response = await runOllama(providerConfig.model);
    } catch (error) {
      if (process.env.OPENROUTER_API_KEY) {
        return runOpenrouterFallback(prompt, options);
      }
      throw error;
    }

    const firstData = await response.json();
    if (!response.ok && String(firstData?.error || '').includes('requires more system memory') && providerConfig.model !== OLLAMA_FALLBACK_MODEL) {
      response = await runOllama(OLLAMA_FALLBACK_MODEL);
      const secondData = await response.json();
      if (!response.ok) {
        if (process.env.OPENROUTER_API_KEY) {
          return runOpenrouterFallback(prompt, options);
        }
        const secondMessage = secondData?.error?.message || secondData?.error || secondData?.message || `AI request failed with status ${response.status}`;
        throw new Error(secondMessage);
      }

      const content = secondData?.response;
      if (!content) {
        throw new Error('No AI response content returned.');
      }

      return {
        content,
        model: secondData?.model || OLLAMA_FALLBACK_MODEL,
        usage: secondData?.usage || null,
      };
    }

    if (!response.ok) {
      if (process.env.OPENROUTER_API_KEY) {
        return runOpenrouterFallback(prompt, options);
      }
      const firstMessage = firstData?.error?.message || firstData?.error || firstData?.message || `AI request failed with status ${response.status}`;
      throw new Error(firstMessage);
    }

    const content = firstData?.response;
    if (!content) {
      throw new Error('No AI response content returned.');
    }

    return {
      content,
      model: firstData?.model || providerConfig.model,
      usage: firstData?.usage || null,
    };
  } else {
    response = await fetch(providerConfig.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...providerConfig.headers,
      },
      body: JSON.stringify({
        model: providerConfig.model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1200,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a senior SaaS engineer. Give production-ready output.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
  }

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || `AI request failed with status ${response.status}`;
    throw new Error(message);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No AI response content returned.');
  }

  return {
    content,
    model: data?.model || providerConfig.model,
    usage: data?.usage || null,
  };
}

module.exports = { runAI };