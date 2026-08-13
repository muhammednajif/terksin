const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const REQUEST_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '180000');

export class OllamaProvider {
  constructor() {
    this.baseUrl = OLLAMA_BASE_URL.replace(/\/+$/, '');
    this.model = OLLAMA_MODEL;
  }

  async healthCheck() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return { available: false, error: `Ollama returned status ${res.status}` };
      const data = await res.json();
      const models = (data.models || []).map(m => m.name);
      const modelInstalled = models.some(m => m.startsWith(this.model) || m.startsWith(this.model.replace(/:.*$/, '')));
      return { available: true, models, modelInstalled, modelName: this.model };
    } catch (err) {
      return { available: false, error: err.message || 'Connection failed', modelInstalled: false };
    }
  }

  async generate(messages, options = {}) {
    const { temperature = 0.7, maxTokens = 4096, format } = options;
    const body = {
      model: this.model,
      messages,
      stream: false,
      temperature,
      max_tokens: maxTokens,
      options: { num_ctx: 4096 },
    };
    if (format === 'json') {
      body.format = 'json';
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Ollama error ${res.status}: ${errBody}`);
      }
      const data = await res.json();
      return { content: data.message?.content || '', totalTokens: data.eval_count || 0 };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async *stream(messages, options = {}) {
    const { temperature = 0.7, maxTokens = 4096 } = options;
    const body = {
      model: this.model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
      options: { num_ctx: 4096 },
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Ollama error ${res.status}: ${errBody}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.done) {
              yield { content: parsed.message?.content || '', done: true, totalTokens: parsed.eval_count };
            } else {
              yield { content: parsed.message?.content || '', done: false };
            }
          } catch {}
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async getModelInfo() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
