/**
 * Shared AI capability layer:
 *  - App self-awareness prompt (what this website is / can do)
 *  - A provider-agnostic "tool calling" protocol built on fenced directive blocks,
 *    so it works with Lovable cloud models, BYOK endpoints AND on-device WebLLM.
 */
import { getSelectedModel } from '@/components/ModelPicker';
import { generateByokImage } from './byok';
import { runCode, detectLanguage } from './code-runner';
import { addAsset, allAssets, assetsPromptBlock, renderKenBurnsVideo, downloadUrl } from './media';
import { skillsPromptBlock } from './skills';
import { useAppStore } from './store';
import { startProgress, setProgress, endProgress, creepProgress, getProgress } from './progress';
import { upsertDoc, generateDoc, type DocKind } from './workspace';
import { pickGif, rememberGif, type GifMedia } from './gifs';
import { writeScript, makeSceneImage, renderMovie } from './video-studio';
import { runControl, CONTROL_ACTIONS } from './app-control';

export const APP_CONTEXT = `
## WHERE YOU ARE
You are an AI running inside **TheAiTwins**, a premium AI web app (PWA). You are aware of the whole app and can guide the user around it.

App map (routes):
- \`/\` — Main chat. Personas (Anson67, Gemini, Chester, Bobby, Max), image attachments, voice chat, reactions, pinning, replies, editing, message search, tabs/workspaces, wallpapers, themes, plugins, skills, memory.
- \`/playground\` — Code Playground: Lovable-style split view. AI chat on the left, live Preview + editable Code on the right (single-file HTML/CSS/JS). Has chat history, saved projects, publishing/sharing, snapshots and download.
- \`/p/:id\` — Public page for a published playground project.
- \`/groups\`, \`/group/:id\` — Real-time group chats with mentions, presence and file sharing.
- \`/auth\`, \`/admin\` — Auth and admin panel.

Things the user can do that you should mention when relevant:
- Switch model from the model picker (Cloud models, BYOK = their own OpenAI-compatible endpoint, or Local on-device WebLLM).
- Type \`/image <prompt>\` for a photoreal/illustrated image, \`/draw <prompt>\` for a hand-drawn or pixel-art style drawing, \`/video <prompt>\` for a short generated video, \`/gif <query>\` for a GIF.
- Open Settings for theme, wallpaper, fonts, notifications, effort and the "AI can change my app" permission switch. You can change all of these yourself with the app_control tool.
- Reply to a specific message so you know exactly which one they mean.
- Set any generated image as the chat background/wallpaper, remix it, or download it.
- Run code blocks (JS, TS, Python, Java) with the Run button, or Render HTML/React in the canvas.
`;

export const TOOL_PROTOCOL = `
## TOOLS (very important)
You can take real actions by emitting fenced directive blocks. They are parsed by the app and never shown raw to the user.

1) Ask the user a question with choices — USE THIS whenever the request is ambiguous:
\`\`\`ask
{"question":"Which style do you want?","options":["Minimal","Playful","Corporate"],"multi":false}
\`\`\`

2) Generate an image:
\`\`\`action
{"tool":"generate_image","prompt":"a neon cyberpunk cat, 4k"}
\`\`\`

3) Generate a short video (built from AI keyframes):
\`\`\`action
{"tool":"generate_video","prompt":"a rocket launching at sunrise","frames":3}
\`\`\`

4) Execute code and get the output back:
\`\`\`action
{"tool":"run_code","language":"python","code":"print(2+2)"}
\`\`\`

5) Set the chat background to a generated image:
\`\`\`action
{"tool":"set_wallpaper","assetId":"a1abc"}
\`\`\`

6) Build something in the AI Workspace (presentation, poster, document, spreadsheet, AI video, or a code app). USE THIS whenever the user asks for a PPT/deck, poster/design, report/document, spreadsheet, video or a web app:
\`\`\`action
{"tool":"create_doc","kind":"slides","prompt":"6-slide pitch deck for an AI coffee startup"}
\`\`\`
kind is one of: design | slides | doc | sheet | video | code.

7) Send a real GIF / sticker / short clip (KLIPY library — great for reactions and jokes):
\`\`\`action
{"tool":"send_gif","query":"mind blown","media":"gifs"}
\`\`\`
media is one of: gifs | stickers | clips | emojis. Use this when the user asks for a GIF/sticker, or when a reaction GIF makes the reply more fun.

8) Operate the app for the user (you can change ANY setting the user could change themselves):
\`\`\`action
{"tool":"app_control","action":"set_theme","value":"light"}
\`\`\`
Available actions: ${CONTROL_ACTIONS.join(', ')}.
Examples: {"tool":"app_control","action":"set_font_size","value":"lg"} ·
{"tool":"app_control","action":"set_effort","value":"ultra"} ·
{"tool":"app_control","action":"set_skill","target":"web-designer","value":true} ·
{"tool":"app_control","action":"navigate","value":"/playground"} ·
{"tool":"app_control","action":"remember","value":"User loves dark UI"}.
Destructive actions (clear_chats, clear_memories, reset_settings, sign_out) pop a permission dialog unless the user turned on "always allow" in Settings — that is expected, just tell them to confirm.

Rules:
- Emit at most 2 directive blocks per reply.
- Always write a short sentence of normal text before a directive block.
- JSON must be valid. Do not wrap directives in extra prose inside the block.
- When you write HTML that should show a generated image or video, use \`ASSET:<id>\` as the src — the app swaps it for the real URL.
- Prefer \`ask\` over assuming. If the request is vague, ask ONE clear question with 2-4 options.
`;

/** Full suffix, recomputed each call so skills + assets stay fresh. */
export function buildSystemSuffix(): string {
  return `${APP_CONTEXT}\n${TOOL_PROTOCOL}\n${skillsPromptBlock()}\n${assetsPromptBlock()}`;
}

export const FULL_SYSTEM_SUFFIX = `${APP_CONTEXT}\n${TOOL_PROTOCOL}`;

export interface AskDirective {
  question: string;
  options: string[];
  multi?: boolean;
}
export interface ActionDirective {
  tool: 'generate_image' | 'generate_video' | 'run_code' | 'set_wallpaper' | string;
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
  const owns = !getProgress().active;
  if (owns) {
    startProgress('Generating image…');
    var stop = creepProgress(88);
  }
  try {
    if (selected.provider === 'byok') {
      const url = await generateByokImage(prompt);
      addAsset('image', url, prompt);
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
    addAsset('image', url, prompt);
    return { url, note: data.text };
  } finally {
    if (owns) {
      stop?.();
      endProgress('Image ready');
    }
  }
}

/** Generates a short video: N AI keyframes → Ken Burns / cross-fade render. */
export async function generateVideo(
  prompt: string,
  frames = 3,
  onProgress?: (msg: string) => void,
): Promise<string> {
  const shots = [
    `${prompt} — cinematic wide establishing shot, film still`,
    `${prompt} — medium shot, dramatic lighting, film still`,
    `${prompt} — close up detail, shallow depth of field, film still`,
    `${prompt} — final hero shot, golden hour, film still`,
  ].slice(0, Math.max(2, Math.min(4, frames)));

  startProgress('Starting video render…');
  try {
    const urls: string[] = [];
    for (let i = 0; i < shots.length; i++) {
      setProgress((i / (shots.length + 1)) * 100, `Rendering keyframe ${i + 1}/${shots.length}…`);
      onProgress?.(`Rendering keyframe ${i + 1}/${shots.length}…`);
      const { url } = await generateImage(shots[i]);
      urls.push(url);
    }
    setProgress((shots.length / (shots.length + 1)) * 100, 'Compositing video…');
    onProgress?.('Compositing video…');
    const videoUrl = await renderKenBurnsVideo(urls, { seconds: 2 * urls.length });
    addAsset('video', videoUrl, prompt);
    endProgress('Video ready');
    return videoUrl;
  } catch (e) {
    endProgress('Failed');
    throw e;
  }
}

export interface ActionResult {
  tool: string;
  imageUrl?: string;
  videoUrl?: string;
  gifUrl?: string;
  gifTitle?: string;
  output?: string;
  error?: string;
}

export async function executeAction(
  action: ActionDirective,
  onProgress?: (msg: string) => void,
): Promise<ActionResult> {
  try {
    if (action.tool === 'generate_image') {
      const { url } = await generateImage(String(action.prompt || 'an image'));
      return { tool: action.tool, imageUrl: url };
    }
    if (action.tool === 'generate_video') {
      const url = await generateVideo(String(action.prompt || 'a short clip'), Number(action.frames) || 3, onProgress);
      return { tool: action.tool, videoUrl: url };
    }
    if (action.tool === 'set_wallpaper') {
      const asset = allAssets().find((a) => a.id === action.assetId) || allAssets()[0];
      if (!asset) throw new Error('No generated image available yet.');
      useAppStore.getState().setWallpaper(asset.url);
      return { tool: action.tool, output: 'Background updated.' };
    }
    if (action.tool === 'create_doc') {
      const kind = (['design', 'slides', 'doc', 'sheet', 'video', 'code'].includes(String(action.kind))
        ? action.kind
        : 'doc') as DocKind;
      const p = String(action.prompt || 'a new document');
      const id = `w${Date.now().toString(36)}`;
      startProgress(`Building ${kind} in AI Workspace…`);
      const stop = creepProgress(85);
      try {
        if (kind === 'video') {
          const project = await writeScript(p);
          setProgress(35, 'Storyboarding scenes…');
          for (let i = 0; i < project.scenes.length; i++) {
            setProgress(35 + (i / project.scenes.length) * 40, `Scene ${i + 1}/${project.scenes.length}…`);
            try {
              project.scenes[i].imageUrl = await makeSceneImage(project.scenes[i], project.character?.description);
            } catch {}
          }
          project.videoUrl = await renderMovie(project, (pct, l) => setProgress(75 + pct * 0.2, l));
          upsertDoc({ id, kind, title: project.title, content: project, updatedAt: Date.now() });
        } else {
          const { title, content } = await generateDoc(kind, p);
          upsertDoc({ id, kind, title, content, updatedAt: Date.now() });
        }
      } finally {
        stop();
        endProgress('Ready in Workspace');
      }
      return {
        tool: action.tool,
        output: `__WORKSPACE__${id}|${kind}|${p.slice(0, 60)}`,
      };
    }
    if (action.tool === 'send_gif') {
      const media = (['gifs', 'stickers', 'clips', 'emojis'].includes(String(action.media))
        ? action.media
        : 'gifs') as GifMedia;
      const item = await pickGif(String(action.query || action.prompt || 'reaction'), media);
      rememberGif(item);
      return { tool: action.tool, gifUrl: item.url, gifTitle: item.title };
    }
    if (action.tool === 'app_control') {
      const out = await runControl(String(action.action || ''), action.value, action.target);
      return { tool: action.tool, output: out };
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
  await downloadUrl(url, filename);
}
