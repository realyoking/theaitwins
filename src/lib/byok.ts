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
  imageModel: string;
}

const KEY = 'tat_byok_config';

const DEFAULT: ByokConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  models: [],
  selectedModel: '',
  imageModel: 'gpt-image-1',
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

/**
 * Image generation on the user's own endpoint.
 * Tries the OpenAI images API first, then falls back to a chat-completions
 * image request (OpenRouter / Gemini style) so most providers work.
 */
export async function generateByokImage(prompt: string, modelOverride?: string): Promise<string> {
  const cfg = getByokConfig();
  const base = normalizeBase(cfg.baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
  };
  const model = modelOverride || cfg.imageModel || 'gpt-image-1';

  // 1) /images/generations
  try {
    const resp = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, prompt, n: 1, size: '1024x1024' }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const item = data?.data?.[0];
      const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
      if (url) return url;
    }
  } catch {}

  // 2) chat-completions with image modality (OpenRouter, Gemini-compatible gateways)
  const resp2 = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    }),
  });
  if (!resp2.ok) {
    const t = await resp2.text().catch(() => '');
    throw new Error(`Image generation failed (${resp2.status}). Set a valid image model in the BYOK tab. ${t.slice(0, 160)}`);
  }
  const d2 = await resp2.json();
  const msg = d2?.choices?.[0]?.message;
  const url2 =
    msg?.images?.[0]?.image_url?.url ||
    msg?.images?.[0]?.url ||
    (typeof msg?.content === 'string' ? (msg.content.match(/https?:\/\/\S+\.(?:png|jpe?g|webp)/)?.[0] ?? null) : null);
  if (!url2) throw new Error('Your endpoint returned no image. Try a different image model.');
  return url2;
}
