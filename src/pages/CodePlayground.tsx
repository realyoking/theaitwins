import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Send, Loader2, Code2, Eye, Monitor, Smartphone, Download, Sparkles, MessageSquare,
  RotateCcw, Globe, Copy, Plus, Trash2, LayoutGrid, KeyRound, Database, Check, Search, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { streamCompletion } from '@/lib/completion';
import ModelPicker from '@/components/ModelPicker';
import SkillsModal from '@/components/SkillsModal';
import { skillsPromptBlock } from '@/lib/skills';
import { assetsPromptBlock, resolveAssetRefs, allAssets } from '@/lib/media';
import { generateImage, parseDirectives } from '@/lib/ai-tools';
import { startProgress, setProgress, endProgress } from '@/lib/progress';
import {
  getAppKey, saveAppKey, getFakeDb, saveFakeDb, clearFakeDb, withRuntime, RUNTIME_PROMPT, type AppKeyConfig,
} from '@/lib/app-runtime';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Msg { role: 'user' | 'assistant'; content: string }
interface Project {
  id: string; title: string; code: string; messages: Msg[]; updatedAt: number;
  remoteId?: string; published?: boolean;
}

const baseSystem = () => `You are an elite frontend engineer working inside TheAiTwins Code Playground.
ALWAYS reply with ONE complete, self-contained HTML document inside a single \`\`\`html code block.
Use HTML + CSS + vanilla JavaScript only (the Tailwind CDN is allowed). No React, no build steps.
Make it beautiful, responsive and production-quality. Add one short sentence of explanation AFTER the code block.

If the request is ambiguous, ask first with:
\`\`\`ask
{"question":"...","options":["A","B"]}
\`\`\`
If the page needs an image, request one with:
\`\`\`action
{"tool":"generate_image","prompt":"..."}
\`\`\`
and use ASSET:<id> as the img src — the app swaps in the real URL.
${RUNTIME_PROMPT}
${skillsPromptBlock()}${assetsPromptBlock()}`;

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
    <h1>Hello, Playground</h1>
    <p>Ask the AI on the left to build something.</p>
  </div>
</body>
</html>`;

const PKEY = 'tat_playground_projects';
const loadProjects = (): Project[] => { try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); } catch { return []; } };
const saveProjects = (p: Project[]) => localStorage.setItem(PKEY, JSON.stringify(p.slice(0, 60)));

function extractHtml(text: string): string | null {
  const fence = text.match(/```(?:html|HTML)?\s*\n([\s\S]*?)(?:```|$)/);
  if (fence && fence[1].trim()) return fence[1].trim();
  if (text.includes('<!DOCTYPE') || text.includes('<html')) return text.trim();
  return null;
}

const TEMPLATES = [
  { name: 'Blank app', prompt: '' },
  { name: 'AI chatbot app', prompt: 'Build an AI chat app using ai.chat() with message bubbles and history saved in db.' },
  { name: 'Todo + database', prompt: 'A beautiful todo app that stores tasks with db.insert/db.all and supports filters.' },
  { name: 'AI notes summarizer', prompt: 'A notes app: notes saved in db, and a "Summarize with AI" button using ai.chat().' },
  { name: 'Landing page', prompt: 'A modern SaaS landing page with hero, features, pricing and footer.' },
  { name: 'Snake game', prompt: 'A polished snake game on canvas with score saved into db.' },
];

const CodePlayground = () => {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [projects, setProjects] = useState<Project[]>(loadProjects());
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState<string>(`p${Date.now().toString(36)}`);
  const [title, setTitle] = useState('Untitled');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(STARTER);
  const [rightTab, setRightTab] = useState<'preview' | 'code' | 'data'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mobilePane, setMobilePane] = useState<'chat' | 'workbench'>('chat');
  const [runKey, setRunKey] = useState(0);
  const [showSkills, setShowSkills] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [appKey, setAppKey] = useState<AppKeyConfig>(getAppKey());
  const [dbData, setDbData] = useState<Record<string, any[]>>({});
  const [publishing, setPublishing] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  /* ---- fake DB bridge from the preview iframe ---- */
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.data && e.data.__tatDb) {
        setDbData(e.data.__tatDb);
        saveFakeDb(projectId, e.data.__tatDb);
      }
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [projectId]);

  const persist = useCallback((patch: Partial<Project> = {}) => {
    const list = loadProjects();
    const idx = list.findIndex((p) => p.id === projectId);
    const base = idx >= 0 ? list[idx] : ({} as Project);
    const next: Project = { ...base, id: projectId, title, code, messages, updatedAt: Date.now(), ...patch };
    if (idx >= 0) list[idx] = next; else list.unshift(next);
    saveProjects(list);
    setProjects(list);
    setSavedAt(Date.now());
    return next;
  }, [projectId, title, code, messages]);

  /* ---- autosave after every update ---- */
  useEffect(() => {
    if (view !== 'editor') return;
    const t = setTimeout(() => persist(), 600);
    return () => clearTimeout(t);
  }, [code, messages, title, view, persist]);

  const newProject = (prompt?: string) => {
    const id = `p${Date.now().toString(36)}`;
    setProjectId(id); setTitle('Untitled'); setCode(STARTER); setMessages([]); setPublicUrl(null);
    setDbData({}); setInput(prompt || ''); setView('editor'); setMobilePane('chat'); setRunKey((k) => k + 1);
  };

  const openProject = (p: Project) => {
    setProjectId(p.id); setTitle(p.title); setCode(p.code); setMessages(p.messages || []);
    setDbData(getFakeDb(p.id));
    setPublicUrl(p.remoteId && p.published ? `${window.location.origin}/p/${p.remoteId}` : null);
    setView('editor'); setRunKey((k) => k + 1); setMobilePane('workbench');
  };

  const removeProject = (id: string) => {
    const list = loadProjects().filter((p) => p.id !== id);
    saveProjects(list); setProjects(list); clearFakeDb(id);
  };

  const duplicateProject = (p: Project) => {
    const copy: Project = { ...p, id: `p${Date.now().toString(36)}`, title: `${p.title} copy`, updatedAt: Date.now(), remoteId: undefined, published: false };
    const list = [copy, ...loadProjects()];
    saveProjects(list); setProjects(list);
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { toast.error('Sign in to publish'); return; }
      const existing = loadProjects().find((p) => p.id === projectId);
      let remoteId = existing?.remoteId;
      if (remoteId) {
        const { error } = await supabase.from('playground_projects')
          .update({ title, code, published: true, updated_at: new Date().toISOString() }).eq('id', remoteId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('playground_projects')
          .insert({ title, code, published: true, user_id: auth.user.id }).select('id').single();
        if (error) throw error;
        remoteId = data.id;
      }
      persist({ remoteId, published: true });
      const url = `${window.location.origin}/p/${remoteId}`;
      setPublicUrl(url);
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success('Published — link copied');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    setRightTab('code');
    startProgress('Thinking…');
    let ticks = 0;
    const timer = setInterval(() => { ticks++; setProgress(Math.min(88, 5 + ticks * 3), 'Generating app…'); }, 500);

    let full = '';
    try {
      await streamCompletion(
        baseSystem(),
        [...next.slice(-8), { role: 'user', content: `Current code:\n\`\`\`html\n${code}\n\`\`\`` }],
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

      const { actions } = parseDirectives(full);
      for (const a of actions.slice(0, 2)) {
        if (a.tool === 'generate_image') {
          setProgress(92, 'Generating image…');
          setMessages((m) => [...m, { role: 'assistant', content: `🎨 Generating image: ${a.prompt}` }]);
          try { await generateImage(String(a.prompt || 'an image')); } catch (e: any) { toast.error(e.message); }
        }
      }

      let html = extractHtml(full);
      if (html) {
        html = resolveAssetRefs(html);
        const latest = allAssets().find((x) => x.kind === 'image');
        if (latest && html.includes('ASSET:')) html = html.replace(/ASSET:[a-z0-9]+/gi, latest.url);
        setCode(html); setRunKey((k) => k + 1); setRightTab('preview'); setMobilePane('workbench');
        if (title === 'Untitled') setTitle(text.slice(0, 40));
      }
      endProgress('Ready');
    } catch (e: any) {
      endProgress('Failed');
      toast.error(e.message);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${e.message}` };
        return copy;
      });
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title || 'playground'}.html`;
    a.click();
  };

  /* ------------------------- DASHBOARD ------------------------- */
  if (view === 'dashboard') {
    const filtered = projects.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <header className="sticky top-0 z-20 h-14 flex items-center gap-2 px-3 md:px-6 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <Link to="/" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="w-7 h-7 rounded-lg bg-gradient-primary grid place-items-center"><Code2 className="w-4 h-4 text-primary-foreground" /></div>
          <h1 className="font-bold text-sm tracking-tight">Playground</h1>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowKeys(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" title="App keys"><KeyRound className="w-4 h-4" /></button>
            <button onClick={() => newProject()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-glow">
              <Plus className="w-3.5 h-3.5" /> New project
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Your projects</h2>
          <p className="text-sm text-muted-foreground mt-1">Everything autosaves. Build web apps with a fake database and your own AI key.</p>

          <div className="mt-5 flex items-center gap-2 bg-muted/60 border border-border/60 rounded-xl px-3 py-2 max-w-sm">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="bg-transparent outline-none text-sm flex-1" />
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => newProject(t.prompt)}
                className="shrink-0 px-3 py-2 rounded-xl border border-border/60 bg-muted/50 hover:bg-accent text-xs font-bold transition-colors">
                <Sparkles className="w-3 h-3 inline mr-1 text-amber-accent" />{t.name}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button onClick={() => newProject()}
              className="min-h-[150px] rounded-2xl border-2 border-dashed border-border hover:border-primary/60 grid place-items-center text-muted-foreground hover:text-primary transition-colors">
              <div className="text-center"><Plus className="w-6 h-6 mx-auto mb-1" /><span className="text-xs font-bold">Blank project</span></div>
            </button>

            {filtered.map((p) => (
              <div key={p.id} className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-glow transition-shadow">
                <button onClick={() => openProject(p)} className="block w-full text-left">
                  <div className="h-28 bg-surface-sunken overflow-hidden border-b border-border/60">
                    <iframe srcDoc={p.code} title={p.title} sandbox=""
                      className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-none bg-white" />
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-bold truncate">{p.title || 'Untitled'}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(p.updatedAt).toLocaleString()} · {p.messages?.length || 0} msgs {p.published ? '· 🌐 live' : ''}
                    </div>
                  </div>
                </button>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => duplicateProject(p)} className="p-1.5 rounded-lg bg-card/90 border border-border/60" title="Duplicate"><Copy className="w-3 h-3" /></button>
                  <button onClick={() => removeProject(p.id)} className="p-1.5 rounded-lg bg-card/90 border border-border/60 text-destructive" title="Delete"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showKeys && <KeyModal cfg={appKey} onSave={(c) => { setAppKey(c); saveAppKey(c); setShowKeys(false); toast.success('App key saved'); }} onClose={() => setShowKeys(false)} />}
      </div>
    );
  }

  /* ------------------------- EDITOR ------------------------- */
  const chatPane = (
    <div className="flex flex-col h-full w-full min-h-0 bg-background">
      <div ref={feedRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-4">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Build with AI</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-5">HTML · CSS · JS — with a fake database and your own AI key.</p>
            <div className="grid gap-2 w-full max-w-xs">
              {['An AI chatbot app using my key', 'Todo app saved in the database', 'Animated pricing page', 'Snake game in canvas'].map((q) => (
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
              m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted/70 border border-border/60 rounded-bl-md'
            }`}>
              {m.role === 'assistant' ? (() => {
                const p = parseDirectives(m.content);
                const body = p.text.replace(/```[\s\S]*?(```|$)/g, '\n📦 generated code → see the workbench\n').trim();
                return (
                  <>
                    {body || (busy ? 'Thinking…' : '')}
                    {p.asks.map((ask, k) => (
                      <div key={k} className="mt-2">
                        <div className="text-[12px] font-bold mb-1">{ask.question}</div>
                        <div className="flex flex-wrap gap-1">
                          {ask.options.map((o) => (
                            <button key={o} onClick={() => send(o)}
                              className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })() : m.content}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1"><Loader2 className="w-3 h-3 animate-spin" /> generating…</div>}
      </div>

      <div className="shrink-0 p-2 md:p-3 border-t border-border/60 bg-background">
        <div className="flex items-center gap-1.5 mb-2">
          <ModelPicker />
          <button onClick={() => setShowSkills(true)}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground bg-muted/70 px-2 py-1 rounded-full border border-border/60">
            <Sparkles className="w-3 h-3 text-amber-accent" /> Skills
          </button>
          <button onClick={() => setShowKeys(true)}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground bg-muted/70 px-2 py-1 rounded-full border border-border/60">
            <KeyRound className="w-3 h-3" /> {appKey.apiKey ? 'Key set' : 'App key'}
          </button>
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
          <button onClick={() => send()} disabled={busy || !input.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-30 shrink-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  const previewDoc = withRuntime(code, appKey, dbData);

  const workbench = (
    <div className="flex flex-col h-full w-full min-h-0 bg-surface-sunken border-l border-border/60">
      <div className="shrink-0 h-11 flex items-center gap-2 px-2 border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="flex bg-muted p-0.5 rounded-lg">
          {([['preview', Eye, 'Preview'], ['code', Code2, 'Code'], ['data', Database, 'Data']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setRightTab(id as any)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${rightTab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {rightTab === 'preview' && (
            <div className="hidden sm:flex bg-muted p-0.5 rounded-lg mr-1">
              <button onClick={() => setDevice('desktop')} className={`p-1 rounded ${device === 'desktop' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Monitor className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDevice('mobile')} className={`p-1 rounded ${device === 'mobile' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Smartphone className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <button onClick={() => setRunKey((k) => k + 1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Re-run"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={publish} disabled={publishing} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Publish">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          </button>
          <button onClick={download} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Download"><Download className="w-4 h-4" /></button>
        </div>
      </div>

      {publicUrl && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-primary/10 border-b border-border/60">
          <Globe className="w-3 h-3 text-primary" />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary truncate flex-1 underline">{publicUrl}</a>
          <button onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Copied'); }}><Copy className="w-3 h-3" /></button>
        </div>
      )}

      {rightTab === 'preview' ? (
        <div className="flex-1 min-h-0 flex justify-center items-start p-3 overflow-auto">
          <div className={device === 'mobile'
            ? 'w-[375px] h-[720px] shrink-0 rounded-[2rem] overflow-hidden border-[6px] border-border shadow-2xl bg-white'
            : 'w-full h-full rounded-xl overflow-hidden border border-border shadow-lg bg-white'}>
            <iframe key={runKey} srcDoc={previewDoc} className="w-full h-full border-none" sandbox="allow-scripts allow-modals allow-forms allow-popups" title="Preview" />
          </div>
        </div>
      ) : rightTab === 'code' ? (
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="flex-1 min-h-0 bg-background p-4 font-mono text-[12px] leading-relaxed resize-none outline-none custom-scrollbar"
        />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold">Simulated database</span>
            <button onClick={() => { clearFakeDb(projectId); setDbData({}); setRunKey((k) => k + 1); }}
              className="ml-auto text-[10px] font-bold px-2 py-1 rounded-lg bg-muted hover:bg-accent">Reset</button>
          </div>
          {Object.keys(dbData).length === 0 && <p className="text-xs text-muted-foreground">No tables yet. Apps create them with <code>db.insert('table', {'{...}'})</code>.</p>}
          {Object.entries(dbData).map(([table, rows]) => (
            <div key={table} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-3 py-2 text-[11px] font-bold bg-muted/50 border-b border-border/60">{table} <span className="text-muted-foreground">({rows.length})</span></div>
              <pre className="p-3 text-[10px] font-mono overflow-x-auto custom-scrollbar">{JSON.stringify(rows, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <header className="shrink-0 h-12 md:h-14 flex items-center justify-between gap-2 px-2 md:px-4 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => { persist(); setView('dashboard'); setProjects(loadProjects()); }}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="All projects">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-primary grid place-items-center shrink-0"><Code2 className="w-4 h-4 text-primary-foreground" /></div>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="font-bold text-sm tracking-tight bg-transparent outline-none min-w-0 w-24 sm:w-48 truncate" />
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
            <Check className="w-3 h-3 text-emerald-500" /> {savedAt ? 'Autosaved' : 'Saved'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="md:hidden flex bg-muted p-0.5 rounded-lg ml-1">
            <button onClick={() => setMobilePane('chat')} className={`px-2 py-1 rounded-md ${mobilePane === 'chat' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><MessageSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => setMobilePane('workbench')} className={`px-2 py-1 rounded-md ${mobilePane === 'workbench' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Eye className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-[380px] lg:w-[420px] shrink-0 min-h-0`}>
          {chatPane}
        </div>
        <div className={`${mobilePane === 'workbench' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-0`}>
          {workbench}
        </div>
      </div>

      {showSkills && <SkillsModal onClose={() => setShowSkills(false)} />}
      {showKeys && <KeyModal cfg={appKey} onSave={(c) => { setAppKey(c); saveAppKey(c); setShowKeys(false); setRunKey((k) => k + 1); toast.success('App key saved'); }} onClose={() => setShowKeys(false)} />}
    </div>
  );
};

/* ------------ BYOK key modal for generated apps ------------ */
const KeyModal = ({ cfg, onSave, onClose }: { cfg: AppKeyConfig; onSave: (c: AppKeyConfig) => void; onClose: () => void }) => {
  const [draft, setDraft] = useState<AppKeyConfig>(cfg);
  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-primary grid place-items-center"><KeyRound className="w-4 h-4 text-primary-foreground" /></div>
          <h2 className="font-bold text-sm">App AI key</h2>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">Used by apps you build — they call <code>ai.chat()</code> with this OpenAI-compatible key. Stored only on this device.</p>
        <div className="space-y-2">
          <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1"
            className="w-full bg-muted/60 rounded-xl px-3 py-2 text-xs outline-none border border-border/60" />
          <input value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="sk-..." type="password"
            className="w-full bg-muted/60 rounded-xl px-3 py-2 text-xs outline-none border border-border/60" />
          <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="gpt-4o-mini"
            className="w-full bg-muted/60 rounded-xl px-3 py-2 text-xs outline-none border border-border/60" />
        </div>
        <button onClick={() => onSave(draft)} className="mt-4 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold">Save key</button>
      </div>
    </div>
  );
};

export default CodePlayground;
