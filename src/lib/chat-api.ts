import { SYSTEM_PROMPTS } from './prompts';
import { useAppStore } from './store';
import { getSelectedModel } from '@/components/ModelPicker';
import { chatWebLLM, getLoadedModelId, loadWebLLMModel } from './webllm';
import { streamByokChat } from './byok';
import { buildSystemSuffix, parseDirectives, executeAction, generateImage, generateVideo } from './ai-tools';
import { downscaleImage } from './media';


const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

let abortController: AbortController | null = null;

export function abortChat() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

function replaceLastMessage(text: string) {
  const st = useAppStore.getState();
  const aid = st.activeConversationId;
  const updated = st.conversations.map(c => {
    if (c.id !== aid) return c;
    const ms = [...c.messages];
    ms[ms.length - 1] = { ...ms[ms.length - 1], text };
    return { ...c, messages: ms };
  });
  useAppStore.setState({ conversations: updated });
}

function popLastMessage() {
  const st = useAppStore.getState();
  const aid = st.activeConversationId;
  const updated = st.conversations.map(c =>
    c.id !== aid ? c : { ...c, messages: c.messages.slice(0, -1) },
  );
  useAppStore.setState({ conversations: updated });
}

/** Runs any tool directives the model emitted and appends their results. */
async function runToolDirectives(fullText: string) {
  const store = useAppStore.getState();
  const { actions } = parseDirectives(fullText);
  for (const action of actions.slice(0, 2)) {
    if (action.tool === 'generate_image') {
      store.addMessage({ role: 'bot', type: 'text', text: `🎨 Generating image: _${action.prompt}_` });
    }
    if (action.tool === 'generate_video') {
      store.addMessage({ role: 'bot', type: 'text', text: `🎬 Generating video: _${action.prompt}_` });
    }
    const res = await executeAction(action, (msg) => replaceLastMessage(`🎬 ${msg}`));
    if (action.tool === 'generate_image' || action.tool === 'generate_video') popLastMessage();
    if (res.error) {
      store.addMessage({ role: 'bot', type: 'text', text: `⚠️ Tool \`${res.tool}\` failed: ${res.error}` });
    } else if (res.imageUrl) {
      store.addMessage({ role: 'bot', type: 'image', text: String(action.prompt || ''), url: res.imageUrl, image: res.imageUrl } as any);
    } else if (res.videoUrl) {
      store.addMessage({ role: 'bot', type: 'video', text: String(action.prompt || ''), url: res.videoUrl } as any);
    } else if (res.gifUrl) {
      store.addMessage({ role: 'bot', type: 'gif', text: res.gifTitle || String(action.query || ''), url: res.gifUrl } as any);
    } else if (typeof res.output === 'string' && res.output.startsWith('__WORKSPACE__')) {
      const [id, kind, label] = res.output.replace('__WORKSPACE__', '').split('|');
      store.addMessage({
        role: 'bot',
        type: 'text',
        text: `✅ Your **${kind}** is ready in the AI Workspace — _${label}_\n\n[▶ Open in AI Workspace](/workspace?doc=${id})`,
      });
    } else if (res.output !== undefined) {
      store.addMessage({ role: 'bot', type: 'text', text: `**Output**\n\n\`\`\`\n${res.output}\n\`\`\`` });
    }
  }
}

export async function sendChatMessage(userText: string, imageData?: string | null) {
  const store = useAppStore.getState();
  const { model, mode, user, modelPrompts, language, memories, notificationsEnabled } = store;

  const lower = userText.toLowerCase();

  if (lower.startsWith('/draw')) {
    const drawPrompt = userText.slice(5).trim() || 'A beautiful landscape';
    try {
      const { url, note } = await generateImage(drawPrompt);
      store.addMessage({ role: 'bot', type: 'image', text: note || `Generated: "${drawPrompt}"`, url, image: url } as any);
    } catch (e: any) {
      store.addMessage({ role: 'bot', type: 'text', text: `⚠️ **Draw Error:** ${e.message}` });
    }
    store.setIsGenerating(false);
    return;
  }

  if (lower.startsWith('/video')) {
    const vPrompt = userText.slice(6).trim() || 'A cinematic landscape';
  if (lower.startsWith('/gif')) {
    const gq = userText.slice(4).trim() || 'reaction';
    try {
      const { pickGif, rememberGif } = await import('./gifs');
      const item = await pickGif(gq);
      rememberGif(item);
      store.addMessage({ role: 'bot', type: 'gif', text: item.title || gq, url: item.url } as any);
    } catch (e: any) {
      store.addMessage({ role: 'bot', type: 'text', text: `⚠️ **GIF Error:** ${e.message}` });
    }
    store.setIsGenerating(false);
    return;
  }

  if (lower.startsWith('/video')) {
    const vPrompt = userText.slice(6).trim() || 'A cinematic landscape';
    store.addMessage({ role: 'bot', type: 'text', text: '🎬 Starting video…' });
    try {
      const url = await generateVideo(vPrompt, 3, (m) => replaceLastMessage(`🎬 ${m}`));
      popLastMessage();
      store.addMessage({ role: 'bot', type: 'video', text: `Generated video: "${vPrompt}"`, url } as any);
    } catch (e: any) {
      popLastMessage();
      store.addMessage({ role: 'bot', type: 'text', text: `⚠️ **Video Error:** ${e.message}` });
    }
    store.setIsGenerating(false);
    return;
  }



  abortController = new AbortController();
  const startTime = Date.now();

  try {
    const selectedModel = getSelectedModel();
    const { globalPrompts } = store;
    let finalSysPrompt = modelPrompts[model] || globalPrompts[model] || SYSTEM_PROMPTS[model] || SYSTEM_PROMPTS.gemini;
    finalSysPrompt += `\n\nUSER PROFILE:\nName: ${user!.name}\nAge: ${user!.age}\nGender: ${user!.gender}\nHobbies: ${user!.hobbies}\nLanguage Pref: ${language}\nUse this context to personalize responses.`;
    finalSysPrompt += `\n${buildSystemSuffix()}`;


    // Add memories
    if (memories.length > 0) {
      finalSysPrompt += `\n\nAI MEMORY - Facts about the user:\n${memories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\nUse these facts to better assist the user.`;
    }

    if (mode === 'fast') finalSysPrompt += '\nMODE: FAST. Be concise, direct, and short.';
    if (mode === 'thinking') finalSysPrompt += '\nMODE: THINKING. Think step-by-step logically before answering.';
    if (mode === 'pro') finalSysPrompt += '\nMODE: PRO. Provide an extremely exhaustive, expert-level response.';

    if (imageData) {
      finalSysPrompt += '\nThe user attached an image. Analyze it thoroughly and respond about what you see.';
    }

    const state = useAppStore.getState();
    const convo = state.conversations.find(c => c.id === state.activeConversationId);
    const msgs = convo?.messages || [];

    const slice = msgs.slice(-12);
    const history = slice.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text || '[Image]',
    })) as any[];

    // Only the newest user image is sent (downscaled) — sending every historical
    // image made vision requests huge and appear to hang.
    if (imageData) {
      const small = await downscaleImage(imageData);
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'user') { history[i].imageData = small; break; }
      }
    }


    // === WebLLM path (on-device) ===
    if (selectedModel.provider === 'webllm') {
      // Ensure model is loaded
      if (getLoadedModelId() !== selectedModel.modelId) {
        store.addMessage({ role: 'bot', type: 'text', text: '⏳ Loading model in browser...' });
        const ok = await loadWebLLMModel(selectedModel.modelId);
        // Remove loading message
        const st2 = useAppStore.getState();
        const aid2 = st2.activeConversationId;
        const upd2 = st2.conversations.map(c => {
          if (c.id !== aid2) return c;
          return { ...c, messages: c.messages.filter((_, i) => i !== c.messages.length - 1) };
        });
        useAppStore.setState({ conversations: upd2 });
        if (!ok) {
          store.addMessage({ role: 'bot', type: 'text', text: '⚠️ Failed to load WebLLM model. Try a cloud model instead.' });
          store.setIsGenerating(false);
          return;
        }
      }

      const webllmMessages = [
        { role: 'system', content: finalSysPrompt },
        ...history.map((m: any) => ({ role: m.role, content: m.content })),
      ];

      let fullText = '';
      let messageAdded = false;
      const startTimeLocal = Date.now();

      await chatWebLLM(
        webllmMessages,
        (delta) => {
          fullText += delta;
          const responseTime = Date.now() - startTimeLocal;
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
        },
        () => {},
        abortController.signal
      );

      if (!messageAdded) {
        store.addMessage({ role: 'bot', type: 'text', text: 'No response from local model.' });
      }
      await runToolDirectives(fullText);
      store.setIsGenerating(false);
      return;

    }

    // === BYOK path (user's own OpenAI-compatible endpoint) ===
    if (selectedModel.provider === 'byok') {
      let fullText = '';
      let messageAdded = false;
      await streamByokChat(
        [{ role: 'system', content: finalSysPrompt }, ...history.map((m: any) => ({ role: m.role, content: m.content }))],
        selectedModel.modelId,
        (delta) => {
          fullText += delta;
          const responseTime = Date.now() - startTime;
          if (!messageAdded) {
            store.addMessage({ role: 'bot', type: 'text', text: fullText, responseTime });
            messageAdded = true;
          } else {
            const cs = useAppStore.getState();
            const activeId = cs.activeConversationId;
            const updated = cs.conversations.map(c => {
              if (c.id !== activeId) return c;
              const ms = [...c.messages];
              ms[ms.length - 1] = { ...ms[ms.length - 1], text: fullText, responseTime };
              return { ...c, messages: ms };
            });
            useAppStore.setState({ conversations: updated });
            localStorage.setItem('tat_convos', JSON.stringify(updated));
          }
        },
        abortController.signal,
      );
      if (!messageAdded) store.addMessage({ role: 'bot', type: 'text', text: 'No response from your endpoint.' });
      await runToolDirectives(fullText);
      store.setIsGenerating(false);
      return;

    }

    // === Cloud (Lovable AI) path ===

    let resp: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history, systemPrompt: finalSysPrompt, mode, model: selectedModel.modelId }),
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

    await runToolDirectives(fullText);



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
