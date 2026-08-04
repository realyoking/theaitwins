import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Sparkles, Plus, Trash2, Download, Send, Loader2, LayoutGrid, X,
  PenTool, Presentation, FileText, Table2, Search, Copy, Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ModelPicker from '@/components/ModelPicker';
import AiCursor from '@/components/AiCursor';
import { startProgress, setProgress, endProgress } from '@/lib/progress';
import {
  loadDocs, upsertDoc, deleteDoc, generateDoc, exportDoc, mdToHtml, KIND_META,
  type WorkDoc, type DocKind,
} from '@/lib/workspace';

const KIND_ICON: Record<DocKind, any> = { design: PenTool, slides: Presentation, doc: FileText, sheet: Table2 };
const KINDS: DocKind[] = ['design', 'slides', 'doc', 'sheet'];

const IDEAS: Record<DocKind, string[]> = {
  design: ['Poster for a coffee brand launch', 'Instagram post for a gaming tournament', 'Minimal album cover'],
  slides: ['Pitch deck for an AI startup, 6 slides', 'Quarterly results deck', 'Product launch keynote'],
  doc: ['Business plan for a bubble tea shop', 'Project proposal with timeline', 'Weekly report template'],
  sheet: ['Monthly budget with 12 rows', 'Sales pipeline tracker', 'Inventory sheet for a store'],
};

const Workspace = () => {
  const [docs, setDocs] = useState<WorkDoc[]>(loadDocs());
  const [active, setActive] = useState<WorkDoc | null>(null);
  const [kind, setKind] = useState<DocKind>('design');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [slide, setSlide] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => { if (active) upsertDoc(active) && setDocs(loadDocs()); }, [active]);

  const run = async (text?: string, k?: DocKind) => {
    const p = (text ?? prompt).trim();
    const useKind = k ?? kind;
    if (!p || busy) return;
    setBusy(true);
    setPrompt('');
    setLog((l) => [...l, `🧑 ${p}`, `🤖 Planning a ${KIND_META[useKind].label.toLowerCase()}…`]);
    startProgress(`Agent building ${KIND_META[useKind].label.toLowerCase()}…`);
    let ticks = 0;
    const timer = setInterval(() => { ticks++; setProgress(Math.min(90, 6 + ticks * 4), 'Agent working…'); }, 500);
    try {
      const { title, content } = await generateDoc(useKind, p);
      const doc: WorkDoc = {
        id: active && active.kind === useKind ? active.id : `w${Date.now().toString(36)}`,
        kind: useKind, title: active?.title && active.kind === useKind ? active.title : title,
        content, updatedAt: Date.now(),
      };
      upsertDoc(doc);
      setDocs(loadDocs());
      setActive(doc);
      setSlide(0);
      setLog((l) => [...l, `✅ ${KIND_META[useKind].label} ready — "${doc.title}"`]);
      endProgress('Done');
    } catch (e: any) {
      endProgress('Failed');
      setLog((l) => [...l, `⚠️ ${e.message}`]);
      toast.error(e.message);
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    setDocs(deleteDoc(id));
    if (active?.id === id) setActive(null);
  };

  /* ---------------- canvas renderer ---------------- */
  const canvas = () => {
    if (!active) {
      return (
        <div className="h-full grid place-items-center text-center px-6">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary grid place-items-center mx-auto mb-4 shadow-glow">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Ask the agent to create something</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Designs, slide decks, documents and spreadsheets.</p>
            <div className="grid gap-2 max-w-sm mx-auto">
              {IDEAS[kind].map((i) => (
                <button key={i} onClick={() => run(i)} className="px-3 py-2.5 bg-muted/70 hover:bg-accent border border-border/60 rounded-xl text-xs font-medium text-left">
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (active.kind === 'design') {
      return (
        <div className="h-full overflow-auto custom-scrollbar grid place-items-center p-6">
          <div className="w-[420px] h-[525px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-border">
            <iframe srcDoc={active.content} sandbox="" title="design" className="w-[1080px] h-[1350px] origin-top-left border-none" style={{ transform: 'scale(0.3889)' }} />
          </div>
        </div>
      );
    }

    if (active.kind === 'slides') {
      const slides: string[] = active.content || [];
      return (
        <div className="h-full flex flex-col p-4 gap-3 min-h-0">
          <div className="flex-1 min-h-0 grid place-items-center">
            <div className="w-full max-w-[720px] aspect-video bg-white rounded-xl overflow-hidden shadow-2xl border border-border relative">
              <iframe srcDoc={slides[slide] || ''} sandbox="" title="slide"
                className="w-[1280px] h-[720px] origin-top-left border-none" style={{ transform: 'scale(0.5625)' }} />
            </div>
          </div>
          <div className="shrink-0 flex gap-2 overflow-x-auto no-scrollbar">
            {slides.map((s, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className={`shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 bg-white ${i === slide ? 'border-primary' : 'border-border/60'}`}>
                <iframe srcDoc={s} sandbox="" title={`t${i}`} className="w-[1280px] h-[720px] origin-top-left border-none pointer-events-none" style={{ transform: 'scale(0.075)' }} />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (active.kind === 'doc') {
      return (
        <div className="h-full overflow-auto custom-scrollbar p-4 md:p-8 flex justify-center">
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-2xl p-8 md:p-12 prose-sm"
            dangerouslySetInnerHTML={{ __html: `<p>${mdToHtml(String(active.content))}</p>` }} />
        </div>
      );
    }

    const rows: string[][] = active.content || [];
    return (
      <div className="h-full overflow-auto custom-scrollbar p-4">
        <div className="inline-block min-w-full rounded-xl overflow-hidden border border-border bg-card">
          <table className="text-xs">
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={ri === 0 ? 'bg-muted font-bold' : 'odd:bg-muted/20'}>
                  {r.map((c, ci) => (
                    <td key={ci} className="border border-border/60 px-3 py-1.5 whitespace-nowrap">
                      <input
                        value={String(c ?? '')}
                        onChange={(e) => {
                          const next = rows.map((row) => [...row]);
                          next[ri][ci] = e.target.value;
                          setActive({ ...active, content: next, updatedAt: Date.now() });
                        }}
                        className="bg-transparent outline-none w-full min-w-[80px]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <header className="shrink-0 h-12 md:h-14 flex items-center gap-2 px-2 md:px-4 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <Link to="/" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="w-7 h-7 rounded-lg bg-gradient-primary grid place-items-center"><Wand2 className="w-4 h-4 text-primary-foreground" /></div>
        <h1 className="font-bold text-sm tracking-tight">AI Workspace</h1>
        {active && (
          <input value={active.title} onChange={(e) => setActive({ ...active, title: e.target.value })}
            className="ml-2 text-xs font-bold bg-transparent outline-none w-24 sm:w-56 truncate border-b border-transparent focus:border-border" />
        )}
        <div className="ml-auto flex items-center gap-1">
          {active && (
            <>
              <button onClick={() => exportDoc(active)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="Export"><Download className="w-4 h-4" /></button>
              <button onClick={() => { navigator.clipboard.writeText(typeof active.content === 'string' ? active.content : JSON.stringify(active.content, null, 2)); toast.success('Copied'); }}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="Copy"><Copy className="w-4 h-4" /></button>
              <button onClick={() => setActive(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="Home"><LayoutGrid className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* agent panel */}
        <aside className="hidden md:flex flex-col w-[340px] lg:w-[380px] shrink-0 border-r border-border/60 min-h-0">
          <div className="p-3 border-b border-border/60">
            <div className="grid grid-cols-4 gap-1.5">
              {KINDS.map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <button key={k} onClick={() => setKind(k)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-bold transition-colors ${kind === k ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground'}`}>
                    <Icon className="w-4 h-4" /> {KIND_META[k].label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{KIND_META[kind].blurb}</p>
          </div>

          <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {log.length === 0 && <p className="text-[11px] text-muted-foreground">The agent narrates its work here.</p>}
            {log.map((l, i) => (
              <div key={i} className="text-[12px] leading-relaxed px-3 py-2 rounded-xl bg-muted/60 border border-border/60">{l}</div>
            ))}
            {busy && <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> agent working…</div>}
          </div>

          <div className="shrink-0 p-3 border-t border-border/60 space-y-2">
            <ModelPicker />
            <div className="flex items-end gap-1 bg-muted/70 border border-border/60 rounded-2xl p-1">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={1}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }}
                placeholder={`Describe the ${KIND_META[kind].label.toLowerCase()}…`}
                className="flex-1 bg-transparent outline-none resize-none px-3 py-2 text-sm max-h-32 custom-scrollbar" />
              <button onClick={() => run()} disabled={busy || !prompt.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-30 shrink-0">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </aside>

        {/* canvas / home */}
        <main className="flex-1 min-w-0 min-h-0 relative bg-surface-sunken">
          <AiCursor active={busy} />
          {active ? canvas() : (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Workspace home</h2>
                <p className="text-sm text-muted-foreground mt-1">Your saved designs, decks, docs and sheets — created by the agent.</p>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {KINDS.map((k) => {
                    const Icon = KIND_ICON[k];
                    return (
                      <button key={k} onClick={() => { setKind(k); setActive(null); }}
                        className={`p-3 rounded-2xl border border-border/60 bg-card text-left hover:shadow-glow transition-shadow ${kind === k ? 'ring-1 ring-primary/40' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${KIND_META[k].accent} grid place-items-center mb-2`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-xs font-bold">New {KIND_META[k].label}</div>
                        <div className="text-[10px] text-muted-foreground">{KIND_META[k].blurb}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-2 bg-muted/60 border border-border/60 rounded-xl px-3 py-2 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" className="bg-transparent outline-none text-sm flex-1" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-24">
                  {filtered.length === 0 && <p className="text-xs text-muted-foreground">No files yet — ask the agent below.</p>}
                  {filtered.map((d) => {
                    const Icon = KIND_ICON[d.kind];
                    return (
                      <div key={d.id} className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-glow transition-shadow">
                        <button onClick={() => { setActive(d); setKind(d.kind); setSlide(0); }} className="block w-full text-left">
                          <div className="h-28 bg-surface-sunken border-b border-border/60 grid place-items-center overflow-hidden">
                            {d.kind === 'design' || d.kind === 'slides' ? (
                              <iframe srcDoc={d.kind === 'slides' ? (d.content?.[0] || '') : d.content} sandbox="" title={d.id}
                                className="w-[1280px] h-[720px] origin-top-left border-none pointer-events-none bg-white" style={{ transform: 'scale(0.22)' }} />
                            ) : (
                              <Icon className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="p-3">
                            <div className="text-sm font-bold truncate">{d.title || 'Untitled'}</div>
                            <div className="text-[10px] text-muted-foreground">{KIND_META[d.kind].label} · {new Date(d.updatedAt).toLocaleString()}</div>
                          </div>
                        </button>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => exportDoc(d)} className="p-1.5 rounded-lg bg-card/90 border border-border/60"><Download className="w-3 h-3" /></button>
                          <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg bg-card/90 border border-border/60 text-destructive"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* mobile agent composer */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 p-2 bg-background/90 backdrop-blur border-t border-border/60 space-y-2">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {KINDS.map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <button key={k} onClick={() => setKind(k)}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${kind === k ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/60 border-border/60 text-muted-foreground'}`}>
                    <Icon className="w-3 h-3" /> {KIND_META[k].label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-end gap-1 bg-muted/70 border border-border/60 rounded-2xl p-1">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={1}
                placeholder={`Describe the ${KIND_META[kind].label.toLowerCase()}…`}
                className="flex-1 bg-transparent outline-none resize-none px-3 py-2 text-sm max-h-24" />
              <button onClick={() => run()} disabled={busy || !prompt.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-30 shrink-0">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Workspace;
