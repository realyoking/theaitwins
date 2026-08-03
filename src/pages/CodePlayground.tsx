import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Code2, Eye, Monitor, Smartphone, Download, Sparkles, MessageSquare, RotateCcw, Save, History, Globe, Copy, Plus, Trash2, Image as ImageIco } from 'lucide-react';
import { Link } from 'react-router-dom';
import { streamCompletion } from '@/lib/completion';
import ModelPicker from '@/components/ModelPicker';
import SkillsModal from '@/components/SkillsModal';
import { skillsPromptBlock } from '@/lib/skills';
import { assetsPromptBlock, resolveAssetRefs, allAssets } from '@/lib/media';
import { generateImage, parseDirectives } from '@/lib/ai-tools';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Msg { role: 'user' | 'assistant'; content: string }
interface Project { id: string; title: string; code: string; messages: Msg[]; updatedAt: number; remoteId?: string; published?: boolean }

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
const saveProjects = (p: Project[]) => localStorage.setItem(PKEY, JSON.stringify(p.slice(0, 40)));

function extractHtml(text: string): string | null {
  const fence = text.match(/```(?:html|HTML)?\s*\n([\s\S]*?)(?:```|$)/);
  if (fence && fence[1].trim()) return fence[1].trim();
  if (text.includes('<!DOCTYPE') || text.includes('<html')) return text.trim();
  return null;
}

const CodePlayground = () => {
  const [projects, setProjects] = useState<Project[]>(loadProjects());
  const [projectId, setProjectId] = useState<string>(() => loadProjects()[0]?.id || `p${Date.now().toString(36)}`);
  const [title, setTitle] = useState('Untitled');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(STARTER);
  const [rightTab, setRightTab] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mobilePane, setMobilePane] = useState<'chat' | 'workbench'>('chat');
  const [runKey, setRunKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProjects().find((x) => x.id === projectId);
    if (p) { setTitle(p.title); setCode(p.code); setMessages(p.messages || []); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const persist = (patch: Partial<Project> = {}) => {
    const list = loadProjects();
    const idx = list.findIndex((p) => p.id === projectId);
    const next: Project = {
      id: projectId, title, code, messages, updatedAt: Date.now(),
      ...(idx >= 0 ? list[idx] : {}), ...{ title, code, messages, updatedAt: Date.now() }, ...patch,
    };
    if (idx >= 0) list[idx] = next; else list.unshift(next);
    saveProjects(list);
    setProjects(list);
    return next;
  };

  const newProject = () => {
    persist();
    const id = `p${Date.now().toString(36)}`;
    setProjectId(id); setTitle('Untitled'); setCode(STARTER); setMessages([]); setPublicUrl(null);
    setShowHistory(false);
  };

  const openProject = (p: Project) => {
    persist();
    setProjectId(p.id); setTitle(p.title); setCode(p.code); setMessages(p.messages || []);
    setPublicUrl(p.remoteId && p.published ? `${window.location.origin}/p/${p.remoteId}` : null);
    setShowHistory(false); setRunKey((k) => k + 1);
  };

  const removeProject = (id: string) => {
    const list = loadProjects().filter((p) => p.id !== id);
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

    let full = '';
    try {
      await streamCompletion(
        baseSystem(),
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

      // run any tools the model asked for (image generation), then re-resolve refs
      const { actions } = parseDirectives(full);
      for (const a of actions.slice(0, 2)) {
        if (a.tool === 'generate_image') {
          setMessages((m) => [...m, { role: 'assistant', content: `🎨 Generating image: ${a.prompt}` }]);
          try { await generateImage(String(a.prompt || 'an image')); } catch (e: any) { toast.error(e.message); }
        }
      }

      let html = extractHtml(full);
      if (html) {
        html = resolveAssetRefs(html);
        // if the model asked for an image but forgot the ref, inject the newest one
        const latest = allAssets().find((x) => x.kind === 'image');
        if (latest && html.includes('ASSET:')) html = html.replace(/ASSET:[a-z0-9]+/gi, latest.url);
        setCode(html); setRunKey((k) => k + 1); setRightTab('preview'); setMobilePane('workbench');
        if (title === 'Untitled') setTitle(text.slice(0, 40));
      }
      setTimeout(() => persist(), 50);
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
    a.download = `${title || 'playground'}.html`;
    a.click();
  };

  const chatPane = (
    <div className="flex flex-col h-full w-full min-h-0 bg-background">
      <div ref={feedRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-4">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Build with AI</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-5">HTML · CSS · JavaScript — described in plain words.</p>
            <div className="grid gap-2 w-full max-w-xs">
              {['A pricing page with 3 tiers', 'Animated login form', 'Snake game in canvas', 'Landing page with a generated hero image'].map((q) => (
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

  const workbench = (
    <div className="flex flex-col h-full w-full min-h-0 bg-surface-sunken border-l border-border/60">
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
            <div className="hidden sm:flex bg-muted p-0.5 rounded-lg mr-1">
              <button onClick={() => setDevice('desktop')} className={`p-1 rounded ${device === 'desktop' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Monitor className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDevice('mobile')} className={`p-1 rounded ${device === 'mobile' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Smartphone className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <button onClick={() => setRunKey((k) => k + 1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Re-run">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => { persist(); toast.success('Saved'); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Save">
            <Save className="w-4 h-4" />
          </button>
          <button onClick={publish} disabled={publishing} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Publish">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          </button>
          <button onClick={download} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="Download">
            <Download className="w-4 h-4" />
          </button>
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
      <header className="shrink-0 h-12 md:h-14 flex items-center justify-between gap-2 px-2 md:px-4 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-7 h-7 rounded-lg bg-gradient-primary grid place-items-center shrink-0">
            <Code2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => persist()}
            className="font-bold text-sm tracking-tight bg-transparent outline-none min-w-0 w-24 sm:w-48 truncate" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowHistory(true)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="History">
            <History className="w-4 h-4" />
          </button>
          <button onClick={newProject} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="New project">
            <Plus className="w-4 h-4" />
          </button>
          <div className="md:hidden flex bg-muted p-0.5 rounded-lg ml-1">
            <button onClick={() => setMobilePane('chat')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold ${mobilePane === 'chat' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setMobilePane('workbench')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold ${mobilePane === 'workbench' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
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

      {showSkills && <SkillsModal onClose={() => setShowSkills(false)} />}

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setShowHistory(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-md max-h-[80dvh] overflow-y-auto custom-scrollbar bg-card border border-border rounded-t-3xl md:rounded-3xl p-4 space-y-2">
            <h3 className="font-bold text-sm mb-2">Projects</h3>
            {projects.length === 0 && <p className="text-xs text-muted-foreground">Nothing saved yet.</p>}
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/40">
                <button onClick={() => openProject(p)} className="flex-1 text-left min-w-0">
                  <div className="text-xs font-bold truncate">{p.title || 'Untitled'}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleString()} · {p.messages?.length || 0} msgs {p.published ? '· published' : ''}
                  </div>
                </button>
                <button onClick={() => removeProject(p.id)} className="p-1 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={newProject} className="w-full py-2 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground">
              + New project
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodePlayground;
