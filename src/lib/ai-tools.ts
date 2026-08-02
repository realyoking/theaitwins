/**
 * Shared AI capability layer:
 *  - App self-awareness prompt (what this website is / can do)
 *  - A provider-agnostic "tool calling" protocol built on fenced directive blocks,
 *    so it works with Lovable cloud models, BYOK endpoints AND on-device WebLLM.
 */
import { getSelectedModel } from '@/components/ModelPicker';
import { generateByokImage } from './byok';
import { runCode, detectLanguage } from './code-runner';

export const APP_CONTEXT = `
## WHERE YOU ARE
You are an AI running inside **TheAiTwins**, a premium AI web app (PWA). You are aware of the whole app and can guide the user around it.

App map (routes):
- \`/\` — Main chat. Personas (Anson67, Gemini, Chester, Bobby, Max), image attachments, voice chat, reactions, pinning, editing, message search, tabs/workspaces, wallpapers, themes, plugins, memory.
- \`/playground\` — Code Playground: Lovable-style split view. AI chat on the left, live Preview + editable Code on the right (single-file HTML/CSS/JS). Has chat history, snapshots, download, open-in-new-tab.
- \`/groups\`, \`/group/:id\` — Real-time group chats with mentions, presence and file sharing.
- \`/auth\`, \`/admin\` — Auth and admin panel.

Things the user can do that you should mention when relevant:
- Switch model from the model picker (Cloud models, BYOK = their own OpenAI-compatible endpoint, or Local on-device WebLLM).
- Type \`/draw <prompt>\` in chat to generate an image.
- Run code blocks (JS, TS, Python, Java) with the Run button, or Render HTML/React in the canvas.
- Every image and code block you produce can be previewed and downloaded.
`;

export const TOOL_PROTOCOL = `
## TOOLS (very important)
You can take real actions by emitting fenced directive blocks. They are parsed by the app and never shown raw to the user.

1) Ask the user a question with choices — USE THIS whenever the request is ambiguous or you need a decision instead of guessing:
\`\`\`ask
{"question":"Which style do you want?","options":["Minimal","Playful","Corporate"],"multi":false}
\`\`\`

2) Generate an image:
\`\`\`action
{"tool":"generate_image","prompt":"a neon cyberpunk cat, 4k"}
\`\`\`

3) Execute code and get the output back:
\`\`\`action
{"tool":"run_code","language":"python","code":"print(2+2)"}
\`\`\`

Rules:
- Emit at most 2 directive blocks per reply.
- Always write a short sentence of normal text before a directive block.
- JSON must be valid. Do not wrap directives in extra prose inside the block.
- Prefer \`ask\` over assuming. If the user's request is vague, ask ONE clear question with 2-4 options.
`;

export const FULL_SYSTEM_SUFFIX = `${APP_CONTEXT}\n${TOOL_PROTOCOL}`;

export interface AskDirective {
  question: string;
  options: string[];
  multi?: boolean;
}
export interface ActionDirective {
  tool: 'generate_image' | 'run_code' | string;
  [k: string]: any;
}

const BLOCK_RE = /```(ask|action)\s*\n?([\s\S]*?)```/g;

export interface ParsedDirectives {
  text: string;
  asks: AskDirective[];
  actions: ActionDirective[];
}

/** Strips directive blocks out of model output and returns them parsed. */
export function parseDirectives(raw: string): ParsedDirectives {
  const asks: AskDirective[] = [];
  const actions: ActionDirective[] = [];
  const text = raw.replace(BLOCK_RE, (_m, kind, body) => {
    try {
      const parsed = JSON.parse(String(body).trim());
      if (kind === 'ask' && parsed?.question) {
        asks.push({ question: parsed.question, options: parsed.options || [], multi: !!parsed.multi });
      } else if (kind === 'action' && parsed?.tool) {
        actions.push(parsed);
      }
    } catch {
      /* incomplete stream — drop */
    }
    return '';
  });
  return { text: text.trim(), asks, actions };
}

/** True while a directive block is still streaming in (so we can hide the raw JSON). */
export function stripPartialDirective(raw: string): string {
  const idx = raw.search(/```(ask|action)\s*(\n|$)/);
  if (idx === -1) return raw;
  const rest = raw.slice(idx);
  if (/```(ask|action)[\s\S]*?```/.test(rest)) return raw;
  return raw.slice(0, idx);
}

/** Generate an image through BYOK (if selected) or the cloud draw function. */
export async function generateImage(prompt: string): Promise<{ url: string; note?: string }> {
  const selected = getSelectedModel();

  if (selected.provider === 'byok') {
    const url = await generateByokImage(prompt);
    return { url };
  }

  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({} as any));
    throw new Error(e.error || `Image error ${resp.status}`);
  }
  const data = await resp.json();
  const url = data.images?.[0]?.image_url?.url;
  if (!url) throw new Error(data.text || 'No image returned.');
  return { url, note: data.text };
}

export interface ActionResult {
  tool: string;
  imageUrl?: string;
  output?: string;
  error?: string;
}

export async function executeAction(action: ActionDirective): Promise<ActionResult> {
  try {
    if (action.tool === 'generate_image') {
      const { url } = await generateImage(String(action.prompt || 'an image'));
      return { tool: action.tool, imageUrl: url };
    }
    if (action.tool === 'run_code') {
      const lang = detectLanguage(String(action.language || 'javascript'));
      if (!lang || lang === 'react') throw new Error('Unsupported language for execution');
      const res = await runCode(String(action.code || ''), lang);
      return { tool: action.tool, output: res.output || res.stderr || '(no output)' };
    }
    return { tool: action.tool, error: `Unknown tool: ${action.tool}` };
  } catch (e: any) {
    return { tool: action.tool, error: e.message };
  }
}

/** Download any image url (data: or remote) to disk. */
export async function downloadImage(url: string, filename = 'image.png') {
  try {
    const blob = url.startsWith('data:') ? await (await fetch(url)).blob() : await (await fetch(url)).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch {
    window.open(url, '_blank');
  }
}
