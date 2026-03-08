import { useState } from 'react';
import { Play, Terminal, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { runCode, type SupportedLanguage, getLanguageLabel, getLanguageColor } from '@/lib/code-runner';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

const LANGUAGES: SupportedLanguage[] = ['javascript', 'typescript', 'python', 'java', 'react'];

const TEMPLATES: Record<SupportedLanguage, string> = {
  javascript: `// JavaScript\nconsole.log("Hello, World!");`,
  typescript: `// TypeScript\nconst greet = (name: string): string => \`Hello, \${name}!\`;\nconsole.log(greet("World"));`,
  python: `# Python\nprint("Hello, World!")`,
  java: `// Java\nSystem.out.println("Hello, World!");`,
  react: `<div className="p-8 text-center">\n  <h1 className="text-3xl font-bold text-blue-600">Hello React!</h1>\n  <p className="mt-2 text-gray-500">Edit this code and hit Run</p>\n</div>`,
};

const CodePlayground = () => {
  const { theme } = useAppStore();
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [code, setCode] = useState(TEMPLATES.javascript);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [reactPreview, setReactPreview] = useState('');

  const handleRun = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setOutput('');
    setReactPreview('');

    if (language === 'react') {
      setReactPreview(code);
      setIsRunning(false);
      return;
    }

    try {
      const result = await runCode(code, language);
      const out = result.output || result.stderr || '(no output)';
      setOutput(result.exitCode !== 0 ? `❌ Exit code: ${result.exitCode}\n${out}` : out);
    } catch (e: any) {
      setOutput(`⚠️ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setCode(TEMPLATES[lang]);
    setOutput('');
    setReactPreview('');
  };

  const reactSrcdoc = `<!DOCTYPE html>
<html class="${theme}">
<head><script src="https://cdn.tailwindcss.com"><\/script><script>tailwind.config={darkMode:'class'}<\/script></head>
<body class="bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-white min-h-screen">
<div class="p-4">${reactPreview}</div>
</body></html>`;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Terminal className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Code Playground</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setOutput(''); setReactPreview(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Run
          </button>
        </div>
      </div>

      {/* Language tabs */}
      <div className="flex gap-1 px-4 py-2 bg-card border-b border-border overflow-x-auto">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              language === lang
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: getLanguageColor(lang) }} />
            {getLanguageLabel(lang)}
          </button>
        ))}
      </div>

      {/* Editor + Output */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-border">
          <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50">
            Editor — {getLanguageLabel(language)}
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-background p-4 font-mono text-sm resize-none outline-none leading-relaxed"
            spellCheck={false}
            placeholder="Write your code here..."
          />
        </div>

        {/* Output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50">
            Output
          </div>
          {language === 'react' && reactPreview ? (
            <div className="flex-1">
              <iframe srcDoc={reactSrcdoc} className="w-full h-full border-none" sandbox="allow-scripts" title="React Preview" />
            </div>
          ) : (
            <pre className="flex-1 bg-background p-4 font-mono text-sm overflow-auto whitespace-pre-wrap text-foreground">
              {isRunning ? (
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Running...
                </span>
              ) : output || (
                <span className="text-muted-foreground">Click Run to execute your code</span>
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
