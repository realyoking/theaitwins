import { getSelectedModel } from '@/components/ModelPicker';
import { streamByokChat } from './byok';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

/**
 * Generic streaming completion that respects the currently selected model
 * (Lovable cloud gateway or a BYOK OpenAI-compatible endpoint).
 */
export async function streamCompletion(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
) {
  const selected = getSelectedModel();

  if (selected.provider === 'byok') {
    await streamByokChat(
      [{ role: 'system', content: systemPrompt }, ...messages],
      selected.modelId,
      onDelta,
      signal,
    );
    return;
  }

  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, systemPrompt, model: selected.provider === 'lovable' ? selected.modelId : undefined }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({} as any));
    throw new Error(err.error || `Error ${resp.status}`);
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
