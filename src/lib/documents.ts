/**
 * Client-side document reading: turns an uploaded file into plain text the AI can read.
 * Supports PDF, DOCX, CSV/JSON/Markdown and any plain-text / source file.
 */

export interface AttachedDoc {
  id: string;
  name: string;
  size: number;
  kind: string;
  text: string;
  truncated: boolean;
}

const MAX_CHARS = 24000;

export const DOC_ACCEPT =
  '.pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.log,.xml,.yml,.yaml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.rb,.go,.rs,.sql,.sh';

function clip(raw: string) {
  const text = raw.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  return { text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
}

async function readPdf(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const total = Math.min(pdf.numPages, 40);
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(`--- page ${i} ---\n` + content.items.map((it: any) => it.str).join(' '));
  }
  return pages.join('\n\n');
}

async function readDocx(file: File): Promise<string> {
  const mammoth: any = await import('mammoth/mammoth.browser');
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value || '';
}

export async function readDocument(file: File): Promise<AttachedDoc> {
  const lower = file.name.toLowerCase();
  let raw = '';
  let kind = 'text';

  if (lower.endsWith('.pdf')) {
    kind = 'pdf';
    raw = await readPdf(file);
  } else if (lower.endsWith('.docx')) {
    kind = 'docx';
    raw = await readDocx(file);
  } else {
    kind = lower.split('.').pop() || 'text';
    raw = await file.text();
  }

  if (!raw.trim()) throw new Error(`Could not read any text from "${file.name}".`);

  const { text, truncated } = clip(raw);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: file.name,
    size: file.size,
    kind,
    text,
    truncated,
  };
}

/** Block appended to the user's message so the model can answer about the file. */
export function docPromptBlock(docs: AttachedDoc[]): string {
  if (!docs.length) return '';
  return docs
    .map(
      (d) =>
        `[Attached file: ${d.name} (${d.kind}, ${Math.round(d.size / 1024)} KB)${d.truncated ? ' — truncated' : ''}]\n"""\n${d.text}\n"""`,
    )
    .join('\n\n');
}

export function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
