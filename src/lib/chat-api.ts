import { SYSTEM_PROMPTS } from './prompts';
import { useAppStore } from './store';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function sendChatMessage(userText: string, imageData?: string | null) {
  const store = useAppStore.getState();
  const { model, mode, user, messages, sysPromptOverride, language } = store;

  const isDraw = userText.toLowerCase().startsWith('/draw');

  if (isDraw) {
    store.addMessage({ role: 'bot', type: 'text', text: 'Image generation via /draw is not currently supported.' });
    store.setIsGenerating(false);
    return;
  }

  try {
    let finalSysPrompt = sysPromptOverride || SYSTEM_PROMPTS[model];
    finalSysPrompt += `\n\nUSER PROFILE:\nName: ${user!.name}\nAge: ${user!.age}\nGender: ${user!.gender}\nHobbies: ${user!.hobbies}\nLanguage Pref: ${language}\nUse this context to personalize responses.`;

    if (mode === 'fast') finalSysPrompt += '\nMODE: FAST. Be concise, direct, and short.';
    if (mode === 'thinking') finalSysPrompt += '\nMODE: THINKING. Think step-by-step logically before answering.';
    if (mode === 'pro') finalSysPrompt += '\nMODE: PRO. Provide an extremely exhaustive, expert-level response.';

    const history = [...messages].slice(-10).map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text || '[Image]',
    }));

    // First message carries the system prompt
    const payload = {
      messages: [
        { role: 'user', content: userText, systemPrompt: finalSysPrompt },
        ...history.slice(0, -1), // exclude last since it's the current user msg already added
      ],
      mode,
    };

    // Actually send: history + current message
    const chatMessages = [
      ...history,
      { role: 'user', content: userText, systemPrompt: finalSysPrompt },
    ];

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: chatMessages, mode }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Error ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    // Stream SSE tokens
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
            const msgs = useAppStore.getState().messages;
            if (!messageAdded) {
              store.addMessage({ role: 'bot', type: 'text', text: fullText });
              messageAdded = true;
            } else {
              // Update the last message
              const updated = [...msgs];
              updated[updated.length - 1] = { ...updated[updated.length - 1], text: fullText };
              useAppStore.setState({ messages: updated });
              localStorage.setItem('tat_chat', JSON.stringify(updated));
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
  } catch (e: any) {
    store.addMessage({ role: 'bot', type: 'text', text: `⚠️ **Error:** ${e.message}` });
  } finally {
    store.setIsGenerating(false);
  }
}
