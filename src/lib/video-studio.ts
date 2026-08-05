/**
 * AI Video Maker: prompt -> script -> character sheet -> scene keyframes ->
 * rendered video with captions. Everything runs client-side (canvas +
 * MediaRecorder) so it works with any model provider.
 */
import { streamCompletion } from './completion';
import { generateImage } from './ai-tools';
import { loadImage, addAsset } from './media';

export interface Scene {
  id: string;
  caption: string;
  imagePrompt: string;
  imageUrl?: string;
  seconds: number;
}

export interface VideoProject {
  title: string;
  logline: string;
  character?: { description: string; imageUrl?: string };
  scenes: Scene[];
  videoUrl?: string;
  captionsOn: boolean;
  music?: string;
}

const SCRIPT_SYSTEM = `You are a film director + storyboard artist.
Given an idea, return ONLY JSON:
{"title":"...","logline":"...","character":"one-sentence consistent description of the main character/subject (look, clothes, colors)","scenes":[{"caption":"on-screen caption, max 9 words","imagePrompt":"detailed cinematic image prompt, include the character description for consistency","seconds":3}]}
Use 4-6 scenes. No prose outside the JSON.`;

function extractJson(text: string) {
  const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
  const body = (m ? m[1] : text).trim();
  const s = body.indexOf('{');
  const e = body.lastIndexOf('}');
  return JSON.parse(body.slice(s === -1 ? 0 : s, e === -1 ? undefined : e + 1));
}

export async function writeScript(idea: string): Promise<VideoProject> {
  let full = '';
  await streamCompletion(SCRIPT_SYSTEM, [{ role: 'user', content: idea }], (d) => {
    full += d;
  });
  const j = extractJson(full);
  return {
    title: j.title || idea.slice(0, 40),
    logline: j.logline || '',
    character: { description: j.character || '' },
    captionsOn: true,
    scenes: (j.scenes || []).slice(0, 6).map((s: any, i: number) => ({
      id: `s${i}`,
      caption: String(s.caption || ''),
      imagePrompt: String(s.imagePrompt || idea),
      seconds: Math.max(2, Math.min(6, Number(s.seconds) || 3)),
    })),
  };
}

/** Renders the character reference sheet image. */
export async function makeCharacter(desc: string) {
  const { url } = await generateImage(
    `character reference sheet, full body, neutral background, consistent design: ${desc}`,
  );
  return url;
}

export async function makeSceneImage(scene: Scene, character?: string) {
  const { url } = await generateImage(
    `${scene.imagePrompt}${character ? ` — main subject: ${character}` : ''} — cinematic film still, 16:9`,
  );
  return url;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders the final movie: Ken-Burns motion, cross fades, burned-in captions. */
export async function renderMovie(
  project: VideoProject,
  onProgress?: (pct: number, label: string) => void,
): Promise<string> {
  const width = 1024;
  const height = 576;
  const scenes = project.scenes.filter((s) => s.imageUrl);
  if (!scenes.length) throw new Error('No scene images yet.');

  const images = await Promise.all(scenes.map((s) => loadImage(s.imageUrl!)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((res) => {
    rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' }));
  });
  rec.start();

  const durations = scenes.map((s) => s.seconds * 1000);
  const total = durations.reduce((a, b) => a + b, 0);
  const starts = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0));

  const drawCover = (img: HTMLImageElement, zoom: number, alpha: number, pan: number) => {
    const r = Math.max(width / img.width, height / img.height) * zoom;
    const w = img.width * r;
    const h = img.height * r;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (width - w) / 2 + pan, (height - h) / 2, w, h);
    ctx.globalAlpha = 1;
  };

  const drawCaption = (text: string, alpha: number) => {
    if (!project.captionsOn || !text) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const lines = wrapText(ctx, text, width * 0.8);
    const lh = 44;
    const boxH = lines.length * lh + 24;
    const y0 = height - boxH - 36;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(width * 0.06, y0, width * 0.88, boxH);
    ctx.fillStyle = '#fff';
    lines.forEach((l, i) => ctx.fillText(l, width / 2, y0 + 36 + i * lh));
    ctx.restore();
  };

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - start;
      if (t >= total) return resolve();
      let idx = 0;
      while (idx < starts.length - 1 && t >= starts[idx + 1]) idx++;
      const local = (t - starts[idx]) / durations[idx];
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      drawCover(images[idx], 1 + local * 0.14, 1, (idx % 2 ? -1 : 1) * local * 22);
      if (local > 0.78 && idx + 1 < images.length) {
        drawCover(images[idx + 1], 1, (local - 0.78) / 0.22, 0);
      }
      const capAlpha = Math.min(1, local * 6) * Math.min(1, (1 - local) * 6);
      drawCaption(scenes[idx].caption, capAlpha);
      onProgress?.(Math.round((t / total) * 100), `Rendering scene ${idx + 1}/${scenes.length}…`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  rec.stop();
  const blob = await done;
  const url = URL.createObjectURL(blob);
  addAsset('video', url, project.title);
  return url;
}
