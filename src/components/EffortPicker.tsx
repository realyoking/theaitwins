import { useEffect, useRef, useState } from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import { EFFORTS, effortIndex, type Effort } from '@/lib/reasoning';
import { useAppStore } from '@/lib/store';

/** Codex-style reasoning effort selector with an animated Ultra track. */
const EffortPicker = () => {
  const { mode, setMode } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const idx = effortIndex(mode as Effort);
  const def = EFFORTS[idx];
  const isUltra = def.id === 'ultra';
  const isSuper = def.id === 'super';

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pct = (idx / (EFFORTS.length - 1)) * 100;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/70 border border-border/60 text-[11px] font-bold shadow-sm max-w-[46vw]"
      >
        <Zap className={`w-3 h-3 shrink-0 ${isUltra ? 'text-fuchsia-400' : isSuper ? 'text-primary' : 'text-amber-accent'}`} />
        <span className="truncate">{def.label}</span>
        <span className={isUltra ? 'effort-ultra-text' : 'text-muted-foreground'}>{def.tier}</span>
        <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[min(320px,86vw)] rounded-3xl border border-border/70 bg-card/95 backdrop-blur-2xl shadow-2xl p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Reasoning effort</span>
            <span className="text-[10px] text-muted-foreground">{def.cost} credits</span>
          </div>

          {/* animated track */}
          <div className="relative h-9 rounded-full bg-muted/70 overflow-hidden border border-border/60">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-300 ${isUltra ? 'effort-track-ultra' : 'effort-track'}`}
              style={{ width: `calc(${pct}% + 18px)` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300"
              style={{ left: `calc(${pct}% - ${(pct / 100) * 24}px + 6px)` }}
            />
            <input
              type="range"
              min={0}
              max={EFFORTS.length - 1}
              step={1}
              value={idx}
              onChange={(e) => setMode(EFFORTS[Number(e.target.value)].id as any)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 mt-3">
            {EFFORTS.map((e) => (
              <button
                key={e.id}
                onClick={() => setMode(e.id as any)}
                className={`px-1.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                  e.id === def.id ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {e.tier}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{def.hint}</p>
        </div>
      )}
    </div>
  );
};

export default EffortPicker;
