/**
 * Media helpers: image downscaling (so vision requests are fast),
 * an asset registry (so the AI can re-use images/videos it made),
 * a video generator built from AI keyframes, and a tiny attach bus.
 */

/* ---------------- image downscale ---------------- */

export async function downscaleImage(dataUrl: string, max = 896, quality = 0.82): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale >= 1 && dataUrl.length < 400_000) return dataUrl;
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

/* ---------------- asset registry ---------------- */

export interface GeneratedAsset {
  id: string;
  kind: 'image' | 'video';
  url: string;
  prompt: string;
  createdAt: number;
}

const ASSET_KEY = 'tat_assets';

export function getAssets(): GeneratedAsset[] {
  try {
    return JSON.parse(localStorage.getItem(ASSET_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addAsset(kind: 'image' | 'video', url: string, prompt: string): GeneratedAsset {
  const asset: GeneratedAsset = { id: `a${Date.now().toString(36)}`, kind, url, prompt, createdAt: Date.now() };
  // blob: urls die on reload — keep them in memory only
  const list = [asset, ...getAssets()].filter((a) => !a.url.startsWith('blob:')).slice(0, 12);
  memoryAssets = [asset, ...memoryAssets].slice(0, 12);
  try {
    localStorage.setItem(ASSET_KEY, JSON.stringify(list));
  } catch {}
  return asset;
}

let memoryAssets: GeneratedAsset[] = [];

export function allAssets(): GeneratedAsset[] {
  const seen = new Set<string>();
  return [...memoryAssets, ...getAssets()].filter((a) => (seen.has(a.id) ? false : seen.add(a.id)));
}

/** Short description of recent assets for the system prompt. */
export function assetsPromptBlock(): string {
  const list = allAssets().slice(0, 6);
  if (!list.length) return '';
  return `\n## RECENT GENERATED ASSETS\nYou previously generated these. You may reference them by id, embed them in HTML (\`<img src="ASSET:<id>">\` or \`<video src="ASSET:<id>">\`) or re-use them:\n${list
    .map((a) => `- ${a.id} (${a.kind}): ${a.prompt.slice(0, 80)}`)
    .join('\n')}\n`;
}

/** Replaces ASSET:<id> placeholders in generated code with the real url. */
export function resolveAssetRefs(text: string): string {
  const list = allAssets();
  return text.replace(/ASSET:([a-z0-9]+)/gi, (m, id) => list.find((a) => a.id === id)?.url ?? m);
}

/* ---------------- attach bus ---------------- */

export type Attachment = { url: string; kind: 'image' | 'video' };

export function attachToComposer(url: string, kind: 'image' | 'video' = 'image') {
  window.dispatchEvent(new CustomEvent('tat:attach', { detail: { url, kind } }));
}

export function replyToMessage(quote: string) {
  window.dispatchEvent(new CustomEvent('tat:reply', { detail: quote }));
}

/* ---------------- video generation ---------------- */

/**
 * Builds a short video from AI keyframes: each frame gets a Ken-Burns push
 * and cross-fades into the next one. Recorded with MediaRecorder → webm.
 */
export async function renderKenBurnsVideo(
  frames: string[],
  opts: { seconds?: number; width?: number; height?: number } = {},
): Promise<string> {
  const width = opts.width ?? 960;
  const height = opts.height ?? 540;
  const perFrame = ((opts.seconds ?? 6) * 1000) / Math.max(1, frames.length);

  const images = await Promise.all(frames.map(loadImage));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });
  rec.start();

  const drawCover = (img: HTMLImageElement, zoom: number, alpha: number) => {
    const r = Math.max(width / img.width, height / img.height) * zoom;
    const w = img.width * r;
    const h = img.height * r;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    ctx.globalAlpha = 1;
  };

  const start = performance.now();
  const total = perFrame * images.length;

  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - start;
      if (t >= total) return resolve();
      const idx = Math.min(images.length - 1, Math.floor(t / perFrame));
      const local = (t - idx * perFrame) / perFrame;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      drawCover(images[idx], 1 + local * 0.12, 1);
      if (local > 0.75 && idx + 1 < images.length) {
        drawCover(images[idx + 1], 1, (local - 0.75) / 0.25);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  rec.stop();
  const blob = await done;
  return URL.createObjectURL(blob);
}

export async function downloadUrl(url: string, filename: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch {
    window.open(url, '_blank');
  }
}
