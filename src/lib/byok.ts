/**
 * BYOK — Bring Your Own Key
 * Any OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq, Together, LM Studio, Ollama...).
 * Config is stored locally in the browser only.
 */

export interface ByokConfig {
  baseUrl: string;
  apiKey: string;
  models: string[];
  selectedModel: string;
}

const KEY = 'tat_byok_config';

const DEFAULT: ByokConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  models: [],
  selectedModel: '',
};

export function getByokConfig(): ByokConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT };
}

export function saveByokConfig(cfg: Partial<ByokConfig>): ByokConfig {
  const next = { ...getByokConfig(), ...cfg };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

function normalizeBase(url: string) {
  let u = url.trim().replace(/\/+$/, '');
  if (!/\/v\d+$/.test(u) && !u.endsWith('/api')) {
    // most OpenAI-compatible servers expose /v1
    if (!u.includes('/v1')) u += '/v1';
  }
  return u;
}

export async function fetchByokModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${normalizeBase(baseUrl)}/models`;
  const resp = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Failed to fetch models (${resp.status}) ${t.slice(0, 120)}`);
  }
  const data = await resp.json();
  const list: string[] = (data?.data ?? data?.models ?? [])
    .map((m: any) => m?.id ?? m?.name)
    .filter(Boolean);
  return Array.from(new Set(list)).sort();
}

/** Streams a chat completion from the user's own endpoint. */
export async function streamByokChat(
  messages: { role: string; content: any }[],
  model: string,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
) {
  const cfg = getByokConfig();
  const resp = await fetch(`${normalizeBase(cfg.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const t = await resp.text().catch(() => '');
    throw new Error(`BYOK error ${resp.status}: ${t.slice(0, 200)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') return;
      try {
        const parsed = JSON.parse(json);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {}
    }
  }
}
