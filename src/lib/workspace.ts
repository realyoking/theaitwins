import { streamCompletion } from './completion';

export type DocKind = 'design' | 'slides' | 'doc' | 'sheet' | 'video' | 'code';

export interface WorkDoc {
  id: string;
  kind: DocKind;
  title: string;
  /** design: html · slides: html[] · doc: markdown · sheet: string[][] */
  content: any;
  updatedAt: number;
}

const KEY = 'tat_workspace_docs';

export function loadDocs(): WorkDoc[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveDocs(docs: WorkDoc[]) {
  localStorage.setItem(KEY, JSON.stringify(docs.slice(0, 60)));
}
export function upsertDoc(doc: WorkDoc) {
  const list = loadDocs();
  const i = list.findIndex((d) => d.id === doc.id);
  if (i >= 0) list[i] = doc; else list.unshift(doc);
  saveDocs(list);
  return list;
}
export function deleteDoc(id: string) {
  const list = loadDocs().filter((d) => d.id !== id);
  saveDocs(list);
  return list;
}

export const KIND_META: Record<DocKind, { label: string; blurb: string; accent: string }> = {
  design: { label: 'Design', blurb: 'Figma-style poster / graphic', accent: 'from-fuchsia-500 to-rose-500' },
  slides: { label: 'Slides', blurb: 'Presentation deck (PPT)', accent: 'from-amber-500 to-orange-500' },
  doc: { label: 'Document', blurb: 'Word-style rich document', accent: 'from-sky-500 to-blue-600' },
  sheet: { label: 'Spreadsheet', blurb: 'Excel-style data sheet', accent: 'from-emerald-500 to-teal-600' },
  video: { label: 'Video', blurb: 'AI movie: script, characters, captions', accent: 'from-red-500 to-pink-600' },
  code: { label: 'Code', blurb: 'Live HTML/CSS/JS app with preview', accent: 'from-violet-500 to-indigo-600' },
};

const SYSTEMS: Record<DocKind, string> = {
  design: `You are a world-class visual designer inside TheAiTwins AI Workspace.
Return ONE self-contained HTML document (inline CSS, Google Fonts allowed) that renders a single stunning 1080x1350 design canvas.
No explanations outside the code block. Output only:
\`\`\`html
...
\`\`\``,
  slides: `You are a top presentation designer. Return a JSON array of slides. Each slide is a self-contained HTML string sized 1280x720 with inline CSS, cohesive theme across slides.
Return ONLY:
\`\`\`json
["<div style=...>slide1</div>", "<div ...>slide2</div>"]
\`\`\``,
  doc: `You are an expert business writer. Return a complete, well-structured document in Markdown (headings, bold, lists, tables).
Return ONLY the markdown inside:
\`\`\`markdown
...
\`\`\``,
  sheet: `You are a spreadsheet expert. Return realistic tabular data as JSON: an array of rows, each row an array of cell strings, first row = headers.
Return ONLY:
\`\`\`json
[["Header A","Header B"],["a","b"]]
\`\`\``,
  code: `You are a senior front-end engineer. Return ONE self-contained HTML document (inline CSS + JS, CDN allowed) that is a complete, working, beautiful app.
No explanations outside the code block. Output only:
\`\`\`html
...
\`\`\``,
  video: `You are a film director. Return ONLY JSON describing a short video:
\`\`\`json
{"title":"...","scenes":[{"caption":"...","imagePrompt":"...","seconds":3}]}
\`\`\``,
};

function extractBlock(text: string, lang?: string): string {
  const re = new RegExp('```(?:' + (lang || '[a-z]*') + ')?\\s*\\n([\\s\\S]*?)```', 'i');
  const m = text.match(re);
  return (m ? m[1] : text).trim();
}

export async function generateDoc(
  kind: DocKind,
  prompt: string,
  onDelta?: (chunk: string, full: string) => void,
): Promise<{ title: string; content: any }> {
  let full = '';
  await streamCompletion(SYSTEMS[kind], [{ role: 'user', content: prompt }], (d) => {
    full += d;
    onDelta?.(d, full);
  });

  if (kind === 'design' || kind === 'code') return { title: prompt.slice(0, 40), content: extractBlock(full, 'html') };
  if (kind === 'doc') return { title: prompt.slice(0, 40), content: extractBlock(full, 'markdown') };
  try {
    const parsed = JSON.parse(extractBlock(full, 'json'));
    return { title: prompt.slice(0, 40), content: parsed };
  } catch {
    return { title: prompt.slice(0, 40), content: kind === 'slides' ? [`<div style="padding:60px;font-family:sans-serif">${full}</div>`] : [['Output'], [full.slice(0, 400)]] };
  }
}

/* ---------------- exports ---------------- */

function download(name: string, data: BlobPart, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function mdToHtml(md: string) {
  return md
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^\- (.*)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>');
}

export function exportDoc(doc: WorkDoc) {
  const safe = (doc.title || 'export').replace(/[^\w\- ]+/g, '').slice(0, 40) || 'export';
  if (doc.kind === 'design' || doc.kind === 'code') {
    download(`${safe}.html`, doc.content, 'text/html');
  } else if (doc.kind === 'video') {
    const url = doc.content?.videoUrl;
    if (!url) return;
    fetch(url)
      .then((r) => r.blob())
      .then((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `${safe}.webm`;
        a.click();
      });
  } else if (doc.kind === 'doc') {
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${safe}</title></head><body style="font-family:Calibri,sans-serif"><p>${mdToHtml(String(doc.content))}</p></body></html>`;
    download(`${safe}.doc`, html, 'application/msword');
  } else if (doc.kind === 'sheet') {
    const rows: string[][] = doc.content || [];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    download(`${safe}.csv`, csv, 'text/csv');
  } else {
    const slides: string[] = doc.content || [];
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safe}</title>
<style>body{margin:0;background:#111;font-family:system-ui}
.slide{width:1280px;height:720px;margin:24px auto;background:#fff;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.5)}
@media print{.slide{margin:0;page-break-after:always;box-shadow:none}}</style></head><body>
${slides.map((s) => `<div class="slide">${s}</div>`).join('\n')}
</body></html>`;
    download(`${safe}.html`, html, 'text/html');
  }
}

export { mdToHtml };
