import { useEffect, useState } from 'react';
import { MousePointer2 } from 'lucide-react';

/**
 * Canva/Figma-style collaborator cursor for the AI agent. Glides around the
 * container while the agent is working so the workspace feels "live".
 */
const AiCursor = ({ active, label = 'AI Agent' }: { active: boolean; label?: string }) => {
  const [pos, setPos] = useState({ x: 30, y: 30 });

  useEffect(() => {
    if (!active) return;
    const move = () => setPos({ x: 8 + Math.random() * 80, y: 12 + Math.random() * 70 });
    move();
    const t = setInterval(move, 1400);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute z-40 transition-all duration-[1300ms] ease-in-out"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <MousePointer2 className="w-5 h-5 text-primary fill-primary drop-shadow" />
      <div className="mt-0.5 ml-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold whitespace-nowrap shadow-glow">
        {label}
      </div>
    </div>
  );
};

export default AiCursor;
