import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Sparkles, Trash2, Download, Send, Loader2, LayoutGrid, PenTool, Presentation,
  FileText, Table2, Search, Copy, Wand2, Film, Code2, Play, RefreshCw, Eye, Users, Type,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ModelPicker from '@/components/ModelPicker';
import AiCursor from '@/components/AiCursor';
import AgentStage from '@/components/AgentStage';
import { planActs, startAgent, endAgent, step, actProgress } from '@/lib/agent';
import { joinWorkspace, type Peer } from '@/lib/collab';
import { writeScript, makeCharacter, makeSceneImage, renderMovie, type VideoProject } from '@/lib/video-studio';
import {
  loadDocs, upsertDoc, deleteDoc, generateDoc, exportDoc, mdToHtml, KIND_META,
  type WorkDoc, type DocKind,
} from '@/lib/workspace';

const KIND_ICON: Record<DocKind, any> = {
  design: PenTool, slides: Presentation, doc: FileText, sheet: Table2, video: Film, code: Code2,
};
const KINDS: DocKind[] = ['design', 'slides', 'doc', 'sheet', 'video', 'code'];

const IDEAS: Record<DocKind, string[]> = {
  design: ['Poster for a coffee brand launch', 'Instagram post for a gaming tournament', 'Minimal album cover'],
  slides: ['Pitch deck for an AI startup, 6 slides', 'Quarterly results deck', 'Product launch keynote'],
  doc: ['Business plan for a bubble tea shop', 'Project proposal with timeline', 'Weekly report template'],
  sheet: ['Monthly budget with 12 rows', 'Sales pipeline tracker', 'Inventory sheet for a store'],
  video: ['A cat astronaut exploring Mars', 'Product ad for a smart water bottle', 'Travel reel about Hong Kong at night'],
  code: ['A neon snake game', 'Landing page for a fitness app', 'Pomodoro timer with charts'],
};

const meId = (() => {
  let v = localStorage.getItem('tat_peer_id');
  if (!v) { v = `p${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem('tat_peer_id', v); }
  return v;
})();

const Workspace = () => {
  const [params, setParams] = useSearchParams();
  const [docs, setDocs] = useState<WorkDoc[]>(loadDocs());
  const [active, setActive] = useState<WorkDoc | null>(null);
  const [kind, setKind] = useState<DocKind>('design');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filterKind, setFilterKind] = useState<DocKind | 'all'>('all');
  const [slide, setSlide] = useState(0);
  const [codeTab, setCodeTab] = useState<'preview' | 'code'>('preview');
  const [peers, setPeers] = useState<Peer[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const collab = useRef<ReturnType<typeof joinWorkspace> | null>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => { if (active) { upsertDoc(active); setDocs(loadDocs()); } }, [active]);

  /* ------- live collaboration presence ------- */
  useEffect(() => {
    const name = (() => { try { return JSON.parse(localStorage.getItem('tat_user') || '{}')?.name || 'Guest'; } catch { return 'Guest'; } })();
    collab.current = joinWorkspace('main', { id: meId, name }, setPeers);
    return () => { collab.current?.leave(); };
  }, []);

  const onMove = useCallback((e: React.MouseEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    collab.current?.move(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100, active?.id);
  }, [active?.id]);

  /* ------- deep link from chat: /workspace?doc=id ------- */
  useEffect(() => {
    const id = params.get('doc');
    if (!id) return;
    const d = loadDocs().find((x) => x.id === id);
    if (d) { setActive(d); setKind(d.kind); }
  }, [params]);

  const save = (doc: WorkDoc) => { upsertDoc(doc); setDocs(loadDocs()); setActive(doc); };

  /* ---------------- agent runs ---------------- */
  const runVideo = async (p: string, docId: string) => {
    const acts = planActs([
      { kind: 'think', label: 'Reading the brief' },
      { kind: 'write', label: 'Writing the script & shot list' },
      { kind: 'image', label: 'Designing the main character' },
      { kind: 'search', label: 'Sourcing scene visuals' },
      { kind: 'place', label: 'Placing shots on the timeline' },
      { kind: 'render', label: 'Rendering video with captions' },
    ]);
    startAgent(acts, 'Directing your video…');

    await step('a0', 'Reading the brief', async () => new Promise((r) => setTimeout(r, 600)));
    const project = await step('a1', 'Writing the script & shot list', () => writeScript(p));
    setLog((l) => [...l, `🎬 Script: ${project.title} — ${project.scenes.length} scenes`]);

    let doc: WorkDoc = { id: docId, kind: 'video', title: project.title, content: project, updatedAt: Date.now() };
    save(doc);

    try {
      const charUrl = await step('a2', 'Designing the main character', () => makeCharacter(project.character?.description || p));
      project.character = { description: project.character?.description || '', imageUrl: charUrl };
      doc = { ...doc, content: { ...project }, updatedAt: Date.now() };
      save(doc);
    } catch { /* character optional */ }

    await step('a3', 'Sourcing scene visuals', async (pr) => {
      for (let i = 0; i < project.scenes.length; i++) {
        pr(40 + (i / project.scenes.length) * 30, `Grabbing visual for scene ${i + 1}/${project.scenes.length}…`);
        try {
          project.scenes[i].imageUrl = await makeSceneImage(project.scenes[i], project.character?.description);
        } catch { /* skip */ }
        doc = { ...doc, content: { ...project, scenes: [...project.scenes] }, updatedAt: Date.now() };
        save(doc);
      }
    });

    await step('a4', 'Placing shots on the timeline', async () => new Promise((r) => setTimeout(r, 500)));
    const url = await step('a5', 'Rendering video with captions', (pr) =>
      renderMovie(project, (pct, label) => pr(70 + pct * 0.3, label)));
    project.videoUrl = url;
    doc = { ...doc, content: { ...project }, updatedAt: Date.now() };
    save(doc);
    setLog((l) => [...l, `✅ Video ready — "${project.title}"`]);
  };

  const runDoc = async (p: string, useKind: DocKind, docId: string) => {
    const acts = planActs([
      { kind: 'think', label: 'Understanding your request' },
      { kind: 'search', label: 'Gathering references & sources' },
      { kind: 'write', label: `Drafting the ${KIND_META[useKind].label.toLowerCase()}` },
      { kind: 'place', label: 'Laying out the canvas' },
      { kind: 'render', label: 'Polishing & finishing' },
    ]);
    startAgent(acts, `Building your ${KIND_META[useKind].label.toLowerCase()}…`);
    await step('a0', 'Understanding your request', async () => new Promise((r) => setTimeout(r, 500)));
    await step('a1', 'Gathering references & sources', async () => new Promise((r) => setTimeout(r, 700)));
    const { title, content } = await step('a2', `Drafting the ${KIND_META[useKind].label.toLowerCase()}`, async (pr) => {
      let ticks = 0;
      const t = setInterval(() => { ticks++; pr(Math.min(80, 40 + ticks * 3), 'Writing…'); }, 600);
      try { return await generateDoc(useKind, p); } finally { clearInterval(t); }
    });
    await step('a3', 'Laying out the canvas', async () => new Promise((r) => setTimeout(r, 400)));
    save({ id: docId, kind: useKind, title, content, updatedAt: Date.now() });
    await step('a4', 'Polishing & finishing', async () => new Promise((r) => setTimeout(r, 350)));
    setLog((l) => [...l, `✅ ${KIND_META[useKind].label} ready — "${title}"`]);
  };

  const run = async (text?: string, k?: DocKind) => {
    const p = (text ?? prompt).trim();
    const useKind = k ?? kind;
    if (!p || busy) return;
    setBusy(true);
    setPrompt('');
    setSlide(0);
    setLog((l) => [...l, `🧑 ${p}`]);

    // open the project canvas immediately so the user watches it being made
    const docId = `w${Date.now().toString(36)}`;
    const placeholder: WorkDoc = {
      id: docId, kind: useKind, title: p.slice(0, 40),
      content: useKind === 'video' ? { title: p.slice(0, 40), scenes: [], captionsOn: true } : useKind === 'sheet' ? [['']] : '',
      updatedAt: Date.now(),
    };
    save(placeholder);
    setKind(useKind);

    try {
      if (useKind === 'video') await runVideo(p, docId);
      else await runDoc(p, useKind, docId);
      endAgent('Done');
    } catch (e: any) {
      endAgent('Failed');
      setLog((l) => [...l, `⚠️ ${e.message}`]);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    setDocs(deleteDoc(id));
    if (active?.id === id) setActive(null);
  };

  /* ---------------- video editor ---------------- */
  const videoEditor = () => {
    const v: VideoProject = active!.content || { scenes: [], captionsOn: true };
    const update = (next: Partial<VideoProject>) =>
      save({ ...active!, content: { ...v, ...next }, updatedAt: Date.now() });

    const regen = async (i: number) => {
      try {
        startAgent(planActs([{ kind: 'image', label: `Re-shooting scene ${i + 1}` }]), 'Re-shooting scene…');
        const url = await step('a0', `Re-shooting scene ${i + 1}`, () => makeSceneImage(v.scenes[i], v.character?.description));
        const scenes = v.scenes.map((s, si) => (si === i ? { ...s, imageUrl: url } : s));
        update({ scenes });
        endAgent('Scene updated');
      } catch (e: any) { endAgent('Failed'); toast.error(e.message); }
    };

    const rerender = async () => {
      try {
        setBusy(true);
        startAgent(planActs([{ kind: 'render', label: 'Re-rendering the cut' }]), 'Re-rendering…');
        const url = await step('a0', 'Re-rendering the cut', (pr) => renderMovie(v, (pct, l) => pr(pct, l)));
        update({ videoUrl: url });
        endAgent('Video updated');
      } catch (e: any) { endAgent('Failed'); toast.error(e.message); } finally { setBusy(false); }
    };

    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-3 md:p-5 space-y-4 pb-28">
        <div className="max-w-3xl mx-auto w-full">
          <div className="rounded-2xl overflow-hidden bg-black border border-border shadow-2xl aspect-video grid place-items-center">
            {v.videoUrl ? (
              <video src={v.videoUrl} controls className="w-full h-full object-contain" />
            ) : (
              <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> waiting for render…</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button onClick={rerender} disabled={busy || !v.scenes?.some((s) => s.imageUrl)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40">
              <Play className="w-3.5 h-3.5" /> Render cut
            </button>
            <button onClick={() => update({ captionsOn: !v.captionsOn })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${v.captionsOn ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/60 border-border/60 text-muted-foreground'}`}>
              <Type className="w-3.5 h-3.5" /> Captions {v.captionsOn ? 'on' : 'off'}
            </button>
            {v.videoUrl && (
              <button onClick={() => exportDoc(active!)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/70 border border-border/60 text-xs font-bold">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}
            {v.character?.imageUrl && (
              <img src={v.character.imageUrl} alt="character" className="w-9 h-9 rounded-lg object-cover border border-border" title={v.character.description} />
            )}
          </div>

          <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground mt-5 mb-2">Timeline</h3>
          <div className="space-y-2">
            {(v.scenes || []).map((s, i) => (
              <div key={s.id || i} className="flex gap-3 p-2.5 rounded-2xl bg-card border border-border/60">
                <div className="w-28 shrink-0 aspect-video rounded-lg overflow-hidden bg-muted grid place-items-center">
                  {s.imageUrl ? <img src={s.imageUrl} alt={s.caption} className="w-full h-full object-cover" />
                    : <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input value={s.caption}
                    onChange={(e) => update({ scenes: v.scenes.map((x, xi) => (xi === i ? { ...x, caption: e.target.value } : x)) })}
                    className="w-full bg-muted/60 border border-border/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary" />
                  <textarea value={s.imagePrompt} rows={2}
                    onChange={(e) => update({ scenes: v.scenes.map((x, xi) => (xi === i ? { ...x, imagePrompt: e.target.value } : x)) })}
                    className="w-full bg-muted/40 border border-border/60 rounded-lg px-2 py-1 text-[11px] outline-none resize-none custom-scrollbar" />
                  <div className="flex items-center gap-2">
                    <input type="range" min={2} max={6} step={0.5} value={s.seconds}
                      onChange={(e) => update({ scenes: v.scenes.map((x, xi) => (xi === i ? { ...x, seconds: Number(e.target.value) } : x)) })}
                      className="flex-1 accent-primary" />
                    <span className="text-[10px] text-muted-foreground w-8">{s.seconds}s</span>
                    <button onClick={() => regen(i)} className="p-1.5 rounded-lg bg-muted/70 border border-border/60" title="Regenerate image">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button onClick={() => update({ scenes: v.scenes.filter((_, xi) => xi !== i) })} className="p-1.5 rounded-lg bg-muted/70 border border-border/60 text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ---------------- canvas renderer ---------------- */
  const canvas = () => {
    if (!active) return null;

    if (active.kind === 'video') return videoEditor();

    if (active.kind === 'code') {
      return (
        <div className="h-full flex flex-col min-h-0">
          <div className="shrink-0 flex gap-1 p-2 border-b border-border/60">
            {(['preview', 'code'] as const).map((t) => (
              <button key={t} onClick={() => setCodeTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${codeTab === t ? 'bg-primary/10 text-primary border border-primary/40' : 'text-muted-foreground hover:bg-muted'}`}>
                {t === 'preview' ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />} {t}
              </button>
            ))}
          </div>
          {codeTab === 'preview' ? (
            <iframe srcDoc={String(active.content || '')} title="app" sandbox="allow-scripts allow-modals allow-forms"
              className="flex-1 w-full bg-white border-none" />
          ) : (
            <textarea value={String(active.content || '')}
              onChange={(e) => setActive({ ...active, content: e.target.value, updatedAt: Date.now() })}
              spellCheck={false}
              className="flex-1 w-full bg-surface-sunken font-mono text-[12px] p-3 outline-none resize-none custom-scrollbar" />
          )}
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
                      <input value={String(c ?? '')}
                        onChange={(e) => {
                          const next = rows.map((row) => [...row]);
                          next[ri][ci] = e.target.value;
                          setActive({ ...active, content: next, updatedAt: Date.now() });
                        }}
                        className="bg-transparent outline-none w-full min-w-[80px]" />
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

  const filtered = docs
    .filter((d) => (filterKind === 'all' ? true : d.kind === filterKind))
    .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const duplicate = (d: WorkDoc) => {
    const copy: WorkDoc = { ...d, id: `w${Date.now().toString(36)}`, title: `${d.title} (copy)`, updatedAt: Date.now() };
    upsertDoc(copy);
    setDocs(loadDocs());
    toast.success('Duplicated');
  };

  const rename = (d: WorkDoc) => {
    const name = window.prompt('Rename file', d.title);
    if (!name) return;
    upsertDoc({ ...d, title: name, updatedAt: Date.now() });
    setDocs(loadDocs());
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <header className="shrink-0 h-12 md:h-14 flex items-center gap-2 px-2 md:px-4 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <Link to="/" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="w-7 h-7 rounded-lg bg-gradient-primary grid place-items-center"><Wand2 className="w-4 h-4 text-primary-foreground" /></div>
        <h1 className="font-bold text-sm tracking-tight hidden sm:block">AI Workspace</h1>
        {active && (
          <input value={active.title} onChange={(e) => setActive({ ...active, title: e.target.value })}
            className="ml-1 text-xs font-bold bg-transparent outline-none w-24 sm:w-56 truncate border-b border-transparent focus:border-border" />
        )}
        <div className="ml-auto flex items-center gap-1">
          {peers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 mr-1 px-2 py-1 rounded-full bg-muted/70 border border-border/60">
              <Users className="w-3 h-3 text-muted-foreground" />
              <div className="flex -space-x-1.5">
                {peers.slice(0, 4).map((p) => (
                  <div key={p.id} title={p.name} className="w-4 h-4 rounded-full border border-background text-[8px] font-black text-white grid place-items-center"
                    style={{ background: p.color }}>{(p.name || '?')[0].toUpperCase()}</div>
                ))}
              </div>
            </div>
          )}
          {active && (
            <>
              <button onClick={() => exportDoc(active)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="Export"><Download className="w-4 h-4" /></button>
              <button onClick={() => { navigator.clipboard.writeText(typeof active.content === 'string' ? active.content : JSON.stringify(active.content, null, 2)); toast.success('Copied'); }}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="Copy"><Copy className="w-4 h-4" /></button>
              <button onClick={() => { setActive(null); setParams({}); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" title="Home"><LayoutGrid className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* agent panel */}
        <aside className="hidden md:flex flex-col w-[340px] lg:w-[380px] shrink-0 border-r border-border/60 min-h-0">
          <div className="p-3 border-b border-border/60">
            <div className="grid grid-cols-3 gap-1.5">
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
        <main ref={stageRef} onMouseMove={onMove} className="flex-1 min-w-0 min-h-0 relative bg-surface-sunken">
          <AgentStage />
          {peers.map((p) => (
            <AiCursor key={p.id} x={p.x} y={p.y} label={p.name} color={p.color} />
          ))}

          {active ? canvas() : (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Workspace home</h2>
                <p className="text-sm text-muted-foreground mt-1">Designs, decks, docs, sheets, videos and code apps — all built by the agent.</p>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-2">
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

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {IDEAS[kind].map((i) => (
                    <button key={i} onClick={() => run(i)} className="px-3 py-2.5 bg-muted/70 hover:bg-accent border border-border/60 rounded-xl text-xs font-medium text-left">
                      <Sparkles className="w-3 h-3 inline mr-1.5 text-primary" />{i}
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-muted/60 border border-border/60 rounded-xl px-3 py-2 w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" className="bg-transparent outline-none text-sm flex-1" />
                  </div>
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {(['all', ...KINDS] as (DocKind | 'all')[]).map((k) => (
                      <button key={k} onClick={() => setFilterKind(k)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${filterKind === k ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground'}`}>
                        {k === 'all' ? 'All' : KIND_META[k].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-32">
                  {filtered.length === 0 && <p className="text-xs text-muted-foreground">No files yet — ask the agent below.</p>}
                  {filtered.map((d) => {
                    const Icon = KIND_ICON[d.kind];
                    return (
                      <div key={d.id} className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-glow transition-shadow">
                        <button onClick={() => { setActive(d); setKind(d.kind); setSlide(0); }} className="block w-full text-left">
                          <div className="h-28 bg-surface-sunken border-b border-border/60 grid place-items-center overflow-hidden">
                            {d.kind === 'video' ? (
                              d.content?.scenes?.[0]?.imageUrl
                                ? <img src={d.content.scenes[0].imageUrl} alt={d.title} className="w-full h-full object-cover" />
                                : <Film className="w-8 h-8 text-muted-foreground" />
                            ) : d.kind === 'design' || d.kind === 'slides' || d.kind === 'code' ? (
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
                        <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => rename(d)} title="Rename" className="p-1.5 rounded-lg bg-card/90 border border-border/60"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => duplicate(d)} title="Duplicate" className="p-1.5 rounded-lg bg-card/90 border border-border/60"><Copy className="w-3 h-3" /></button>
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
          <div className="md:hidden absolute bottom-0 left-0 right-0 p-2 bg-background/90 backdrop-blur border-t border-border/60 space-y-2 z-40">
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
