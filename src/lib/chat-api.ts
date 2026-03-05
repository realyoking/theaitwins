import { SYSTEM_PROMPTS } from './prompts';
import { useAppStore, type ChatMessage } from './store';

export async function sendChatMessage(userText: string, imageData?: string | null) {
  const store = useAppStore.getState();
  const { model, mode, user, messages, sysPromptOverride, language, apiKey } = store;

  if (!apiKey) {
    store.addMessage({ role: 'bot', type: 'text', text: '⚠️ **No API key configured.** Please go to Settings and add your Google Gemini API key.' });
    store.setIsGenerating(false);
    return;
  }

  const isDraw = userText.toLowerCase().startsWith('/draw');

  try {
    if (isDraw && store.isPro) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: { prompt: userText.replace('/draw', '') }, parameters: { sampleCount: 1 } }),
      });
      if (!res.ok) throw new Error('Image Generation Failed.');
      const data = await res.json();
      store.addMessage({ role: 'bot', type: 'image', url: `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}` });
    } else if (isDraw && !store.isPro) {
      store.addMessage({ role: 'bot', type: 'text', text: 'Image generation requires a Pro subscription. Upgrade now to use /draw.' });
    } else {
      let finalSysPrompt = sysPromptOverride || SYSTEM_PROMPTS[model];
      finalSysPrompt += `\n\nUSER PROFILE:\nName: ${user!.name}\nAge: ${user!.age}\nGender: ${user!.gender}\nHobbies: ${user!.hobbies}\nLanguage Pref: ${language}\nUse this context to personalize responses.`;

      if (mode === 'fast') finalSysPrompt += '\nMODE: FAST. Be concise, direct, and short.';
      if (mode === 'thinking') finalSysPrompt += '\nMODE: THINKING. Think step-by-step logically before answering.';
      if (mode === 'pro') finalSysPrompt += '\nMODE: PRO. Provide an extremely exhaustive, expert-level response.';

      const history = [...messages].slice(-10).map((m) => ({
        role: m.role === 'bot' ? 'model' : 'user',
        parts: [{ text: m.text || '[Image]' }],
      }));

      const payload = {
        contents: history,
        systemInstruction: { parts: [{ text: finalSysPrompt }] },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || `HTTP Error ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from API.';
      store.addMessage({ role: 'bot', type: 'text', text });
    }
  } catch (e: any) {
    store.addMessage({ role: 'bot', type: 'text', text: `⚠️ **API Error:** ${e.message}` });
  } finally {
    store.setIsGenerating(false);
  }
}
