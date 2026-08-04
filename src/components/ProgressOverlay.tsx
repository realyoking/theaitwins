import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { onProgress, getProgress, type ProgressState } from '@/lib/progress';

/** Fixed top time-bar showing live % of long jobs (video, exports, agents). */
const ProgressOverlay = () => {
  const [state, setState] = useState<ProgressState>(getProgress());
  useEffect(() => onProgress(setState), []);

  if (!state.active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="h-1 w-full bg-muted/60 overflow-hidden">
        <div
          className="h-full bg-gradient-primary transition-[width] duration-300 ease-out shadow-glow"
          style={{ width: `${state.percent}%` }}
        />
      </div>
      <div className="flex justify-center">
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur border border-border/60 shadow-lg">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          <span className="text-[11px] font-medium text-foreground">{state.label}</span>
          <span className="text-[11px] font-bold text-primary tabular-nums">{state.percent}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressOverlay;
