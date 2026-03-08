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
    store.addMessage({ role: 'bot', type: 'text', text: 'Image generation via /draw is not currently supported.' });
    store.setIsGenerating(false);
    return;
  }

  abortController = new AbortController();
  const startTime = Date.now();

  try {
    let finalSysPrompt = modelPrompts[model] || SYSTEM_PROMPTS[model] || SYSTEM_PROMPTS.gemini;
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

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: history, systemPrompt: finalSysPrompt, mode }),
      signal: abortController.signal,
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Error ${resp.status}`);
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

    // Browser notification
    if (notificationsEnabled && document.hidden) {
      try {
        new Notification('TheAiTwins', { body: 'AI response ready!', icon: '/favicon.ico' });
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
