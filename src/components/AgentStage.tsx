import { useEffect, useState } from 'react';
import { Check, Loader2, Search, Image as ImageIcon, PenLine, Move, Film, Sparkles, X } from 'lucide-react';
import AiCursor from './AiCursor';
import { onAgent, getAgentState, type AgentState, type ActKind } from '@/lib/agent';

const ICON: Record<ActKind, any> = {
  think: Sparkles,
  search: Search,
  image: ImageIcon,
  write: PenLine,
  place: Move,
  render: Film,
  done: Check,
};

/** Live "agent at work" overlay: moving cursor + step checklist + %. */
const AgentStage = ({ inline = false }: { inline?: boolean }) => {
  const [s, setS] = useState<AgentState>(getAgentState());
  const [drift, setDrift] = useState({ x: 0, y: 0 });

  useEffect(() => onAgent(setS), []);
  useEffect(() => {
    if (!s.running) return;
    const t = setInterval(() => setDrift({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }), 900);
    return () => clearInterval(t);
  }, [s.running]);

  if (!s.running) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px]" />
      <AiCursor x={s.cursor.x + drift.x} y={s.cursor.y + drift.y} label={s.cursor.label} />

      <div
        className={`absolute ${inline ? 'bottom-3 left-3 right-3' : 'bottom-4 left-1/2 -translate-x-1/2 w-[min(420px,92%)]'} rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-3`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-xs font-bold flex-1 truncate">{s.cursor.label}</span>
          <span className="text-xs font-black text-primary tabular-nums">{s.percent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2.5">
          <div className="h-full bg-gradient-primary transition-[width] duration-500" style={{ width: `${s.percent}%` }} />
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
          {s.acts.map((a) => {
            const Icon = a.status === 'done' ? Check : a.status === 'error' ? X : ICON[a.kind];
            return (
              <div
                key={a.id}
                className={`flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg ${
                  a.status === 'active'
                    ? 'bg-primary/10 text-foreground font-semibold'
                    : a.status === 'done'
                      ? 'text-muted-foreground'
                      : a.status === 'error'
                        ? 'text-destructive'
                        : 'text-muted-foreground/60'
                }`}
              >
                {a.status === 'active' ? (
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                ) : (
                  <Icon className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgentStage;
