import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Code2, Eye, Monitor, Smartphone, Download, Sparkles, MessageSquare, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { streamCompletion } from '@/lib/completion';
import ModelPicker from '@/components/ModelPicker';
import { toast } from 'sonner';

interface Msg { role: 'user' | 'assistant'; content: string }

const SYSTEM = `You are an elite frontend engineer. The user asks for web UIs.
ALWAYS reply with ONE complete, self-contained HTML document inside a single \`\`\`html code block.
Use HTML + CSS + vanilla JavaScript only (you may use the Tailwind CDN). No React, no build steps.
Make it beautiful, responsive and production-quality. Add one short sentence of explanation AFTER the code block.`;

const STARTER = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Playground</title>
<style>
  body { margin:0; font-family: system-ui, sans-serif; display:grid; place-items:center; height:100vh;
         background:linear-gradient(135deg,#0f172a,#1e293b); color:#f8fafc; }
  h1 { font-size:2rem; letter-spacing:-.02em; }
  p { opacity:.6 }
</style>
</head>
<body>
  <div style="text-align:center">
    <h1>Hello, Playground 👋</h1>
    <p>Ask the AI on the left to build something.</p>
  </div>
  <script>console.log('ready');<\/script>
</body>
</html>`;

function extractHtml(text: string): string | null {
  const fence = text.match(/```(?:html|HTML)?\s*\n([\s\S]*?)(?:```|$)/);
  if (fence && fence[1].trim()) return fence[1].trim();
  if (text.includes('<!DOCTYPE') || text.includes('<html')) return text.trim();
  return null;
}

const CodePlayground = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(STARTER);
  const [rightTab, setRightTab] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mobilePane, setMobilePane] = useState<'chat' | 'workbench'>('chat');
  const [runKey, setRunKey] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    setRightTab('code');

    let full = '';
    try {
      await streamCompletion(
        SYSTEM,
        [
          ...next.slice(-8),
          { role: 'user', content: `Current code:\n\`\`\`html\n${code}\n\`\`\`` },
        ],
        (delta) => {
          full += delta;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: full };
            return copy;
          });
          const html = extractHtml(full);
          if (html) setCode(html);
        },
      );
      const html = extractHtml(full);
      if (html) { setCode(html); setRunKey((k) => k + 1); setRightTab('preview'); setMobilePane('workbench'); }
    } catch (e: any) {
      toast.error(e.message);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${e.message}` };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'playground.html';
    a.click();
  };

  const chatPane = (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div ref={feedRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-4">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Build with AI</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-5">HTML · CSS · JavaScript — described in plain words.</p>
            <div className="grid gap-2 w-full max-w-xs">
              {['A pricing page with 3 tiers', 'Animated login form', 'Snake game in canvas', 'Glassmorphism dashboard'].map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="px-3 py-2.5 bg-muted/70 hover:bg-accent border border-border/60 rounded-xl text-xs font-medium text-left transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted/70 border border-border/60 rounded-bl-md'
            }`}>
              {m.role === 'assistant'
                ? (m.content.replace(/```[\s\S]*?(```|$)/g, '\n📦 _generated code → see the workbench_\n').trim() || (busy ? 'Thinking…' : ''))
                : m.content}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1"><Loader2 className="w-3 h-3 animate-spin" /> generating…</div>}
      </div>

      <div className="shrink-0 p-2 md:p-3 border-t border-border/60 bg-background">
        <div className="flex items-center gap-2 mb-2">
          <ModelPicker />
        </div>
        <div className="flex items-end gap-1 bg-muted/70 border border-border/60 rounded-2xl p-1 shadow-sm focus-within:ring-1 ring-ring/30">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Describe what to build or change..."
            className="flex-1 bg-transparent outline-none resize-none px-3 py-2 text-sm max-h-32 custom-scrollbar"
          />
          <button onClick={send} disabled={busy || !input.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-30 shrink-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  const workbench = (
    <div className="flex flex-col h-full min-h-0 bg-surface-sunken border-l border-border/60">
      <div className="shrink-0 h-11 flex items-center gap-2 px-2 border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="flex bg-muted p-0.5 rounded-lg">
          <button onClick={() => setRightTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${rightTab === 'preview' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button onClick={() => setRightTab('code')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${rightTab === 'code' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
            <Code2 className="w-3.5 h-3.5" /> Code
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {rightTab === 'preview' && (
            <div className="flex bg-muted p-0.5 rounded-lg mr-1">
              <button onClick={() => setDevice('desktop')} className={`p-1 rounded ${device === 'desktop' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Monitor className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDevice('mobile')} className={`p-1 rounded ${device === 'mobile' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Smartphone className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <button onClick={() => setRunKey((k) => k + 1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Re-run">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={download} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Download">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {rightTab === 'preview' ? (
        <div className="flex-1 min-h-0 flex justify-center items-start p-3 overflow-auto">
          <div className={device === 'mobile'
            ? 'w-[375px] h-[720px] shrink-0 rounded-[2rem] overflow-hidden border-[6px] border-border shadow-2xl bg-white'
            : 'w-full h-full rounded-xl overflow-hidden border border-border shadow-lg bg-white'}>
            <iframe key={runKey} srcDoc={code} className="w-full h-full border-none" sandbox="allow-scripts allow-modals" title="Preview" />
          </div>
        </div>
      ) : (
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="flex-1 min-h-0 bg-background p-4 font-mono text-[12px] leading-relaxed resize-none outline-none custom-scrollbar"
        />
      )}
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <header className="shrink-0 h-12 md:h-14 flex items-center justify-between px-2 md:px-4 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-7 h-7 rounded-lg bg-gradient-primary grid place-items-center shrink-0">
            <Code2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm tracking-tight truncate">Playground</span>
        </div>
        {/* Mobile pane switcher */}
        <div className="md:hidden flex bg-muted p-0.5 rounded-lg">
          <button onClick={() => setMobilePane('chat')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${mobilePane === 'chat' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
          <button onClick={() => setMobilePane('workbench')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${mobilePane === 'workbench' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
            <Eye className="w-3.5 h-3.5" /> Build
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-[38%] md:max-w-md min-h-0`}>
          {chatPane}
        </div>
        <div className={`${mobilePane === 'workbench' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-0`}>
          {workbench}
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
