import { MousePointer2 } from 'lucide-react';

/** A single labelled collaborator cursor positioned in % of its container. */
const AiCursor = ({
  active = true,
  label = 'AI Agent',
  x = 30,
  y = 30,
  color,
}: {
  active?: boolean;
  label?: string;
  x?: number;
  y?: number;
  color?: string;
}) => {
  if (!active) return null;
  return (
    <div
      className="pointer-events-none absolute z-40 transition-all duration-700 ease-out"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <MousePointer2
        className="w-5 h-5 drop-shadow"
        style={{ color: color || 'hsl(var(--primary))', fill: color || 'hsl(var(--primary))' }}
      />
      <div
        className="mt-0.5 ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-lg text-white"
        style={{ background: color || 'hsl(var(--primary))' }}
      >
        {label}
      </div>
    </div>
  );
};

export default AiCursor;
