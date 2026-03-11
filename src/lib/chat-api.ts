import { SYSTEM_PROMPTS } from './prompts';
import { useAppStore } from './store';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

let abortController: AbortController | null = null;

export function abortChat() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

export async function sendChatMessage(userText: string, imageData?: string | null) {
  const store = useAppStore.getState();
  const { model, mode, user, modelPrompts, language, memories, notificationsEnabled } = store;

  const isDraw = userText.toLowerCase().startsWith('/draw');
  if (isDraw) {
    const drawPrompt = userText.slice(5).trim() || 'A beautiful landscape';
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: drawPrompt }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      const imageUrl = data.images?.[0]?.image_url?.url;
      if (imageUrl) {
        store.addMessage({ role: 'bot', type: 'image', text: data.text || `Generated: "${drawPrompt}"`, image: imageUrl });
      } else {
        store.addMessage({ role: 'bot', type: 'text', text: data.text || 'Image generation returned no image.' });
      }
    } catch (e: any) {
      store.addMessage({ role: 'bot', type: 'text', text: `⚠️ **Draw Error:** ${e.message}` });
    }
    store.setIsGenerating(false);
    return;
  }

  abortController = new AbortController();
  const startTime = Date.now();

  try {
    const { globalPrompts } = store;
    let finalSysPrompt = modelPrompts[model] || globalPrompts[model] || SYSTEM_PROMPTS[model] || SYSTEM_PROMPTS.gemini;
    finalSysPrompt += `\n\nUSER PROFILE:\nName: ${user!.name}\nAge: ${user!.age}\nGender: ${user!.gender}\nHobbies: ${user!.hobbies}\nLanguage Pref: ${language}\nUse this context to personalize responses.`;

    // Add memories
    if (memories.length > 0) {
      finalSysPrompt += `\n\nAI MEMORY - Facts about the user:\n${memories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\nUse these facts to better assist the user.`;
    }

    if (mode === 'fast') finalSysPrompt += '\nMODE: FAST. Be concise, direct, and short.';
    if (mode === 'thinking') finalSysPrompt += '\nMODE: THINKING. Think step-by-step logically before answering.';
    if (mode === 'pro') finalSysPrompt += '\nMODE: PRO. Provide an extremely exhaustive, expert-level response.';

    if (imageData) {
      finalSysPrompt += '\nThe user may attach images. Analyze them thoroughly and respond about what you see.';
    }

    const state = useAppStore.getState();
    const convo = state.conversations.find(c => c.id === state.activeConversationId);
    const msgs = convo?.messages || [];

    const history = msgs.slice(-12).map((m) => {
      const msg: any = { role: m.role === 'bot' ? 'assistant' : 'user', content: m.text || '[Image]' };
      if (m.image && m.role === 'user') msg.imageData = m.image;
      return msg;
    });

    // Retry logic for rate limits
    let resp: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history, systemPrompt: finalSysPrompt, mode }),
        signal: abortController.signal,
      });

      if (resp.status === 429) {
        const wait = (attempt + 1) * 3000; // 3s, 6s, 9s
        store.addMessage({ role: 'bot', type: 'text', text: `⏳ Rate limited, retrying in ${wait / 1000}s...` });
        await new Promise(r => setTimeout(r, wait));
        // Remove the retry message
        const st = useAppStore.getState();
        const aid = st.activeConversationId;
        const updated = st.conversations.map(c => {
          if (c.id !== aid) return c;
          const msgs = c.messages.filter((_, i) => i !== c.messages.length - 1);
          return { ...c, messages: msgs };
        });
        useAppStore.setState({ conversations: updated });
        continue;
      }
      break;
    }

    if (!resp || !resp.ok) {
      const errorData = await resp?.json().catch(() => ({})) || {};
      if (resp?.status === 429) {
        throw new Error('Rate limit exceeded. Free models have 20 req/min limit. Please wait a moment and try again.');
      }
      throw new Error(errorData.error || `HTTP Error ${resp?.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let fullText = '';
    let messageAdded = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            const responseTime = Date.now() - startTime;
            if (!messageAdded) {
              store.addMessage({ role: 'bot', type: 'text', text: fullText, responseTime });
              messageAdded = true;
            } else {
              const currentState = useAppStore.getState();
              const activeId = currentState.activeConversationId;
              const updated = currentState.conversations.map(c => {
                if (c.id !== activeId) return c;
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: fullText, responseTime };
                return { ...c, messages: msgs };
              });
              useAppStore.setState({ conversations: updated });
              localStorage.setItem('tat_convos', JSON.stringify(updated));
            }
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    if (!messageAdded) {
      store.addMessage({ role: 'bot', type: 'text', text: 'No response from API.' });
    }

    // Send notification when AI is done and user is away
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const preview = fullText.slice(0, 80) + (fullText.length > 80 ? '...' : '');
      try {
        new Notification('🤖 AI Response Ready!', {
          body: preview || 'Your AI response is ready.',
          icon: '/pwa-192.png',
          tag: 'ai-response',
        });
      } catch {}
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      // User stopped
    } else {
      store.addMessage({ role: 'bot', type: 'text', text: `⚠️ **Error:** ${e.message}` });
    }
  } finally {
    abortController = null;
    store.setIsGenerating(false);
  }
}
