const RUN_CODE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-code`;

export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'react';

export interface CodeResult {
  output: string;
  stderr: string;
  exitCode: number;
}

export function detectLanguage(langHint: string): SupportedLanguage | null {
  const l = langHint.toLowerCase().trim();
  if (['js', 'javascript'].includes(l)) return 'javascript';
  if (['ts', 'typescript'].includes(l)) return 'typescript';
  if (['py', 'python'].includes(l)) return 'python';
  if (['java'].includes(l)) return 'java';
  if (['jsx', 'tsx', 'react'].includes(l)) return 'react';
  return null;
}

export function getLanguageLabel(lang: SupportedLanguage): string {
  const labels: Record<SupportedLanguage, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    react: 'React',
  };
  return labels[lang];
}

export function getLanguageColor(lang: SupportedLanguage): string {
  const colors: Record<SupportedLanguage, string> = {
    javascript: 'hsl(50, 100%, 50%)',
    typescript: 'hsl(211, 60%, 48%)',
    python: 'hsl(207, 51%, 44%)',
    java: 'hsl(18, 80%, 50%)',
    react: 'hsl(193, 95%, 68%)',
  };
  return colors[lang];
}

export async function runCode(code: string, language: SupportedLanguage): Promise<CodeResult> {
  if (language === 'react') {
    // React is handled client-side via iframe
    throw new Error('React code runs in the preview canvas');
  }

  const resp = await fetch(RUN_CODE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ code, language }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Execution failed (${resp.status})`);
  }

  return resp.json();
}
