import { motion } from 'framer-motion';
import { Ghost, Cpu } from 'lucide-react';
import type { AIModel } from '@/lib/store';
import { useAppStore } from '@/lib/store';
import { effortDef } from '@/lib/reasoning';

const TypingIndicator = ({ model }: { model: AIModel }) => {
  const Icon = model === 'anson67' ? Ghost : Cpu;
  const mode = useAppStore((s) => s.mode);
  const label = effortDef(mode as any).thinkingLabel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 w-full mb-6"
    >
      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs mt-1 bg-primary text-primary-foreground">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 mt-1">
        <span className="shine-text text-xs font-bold">{label}</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full inline-block animate-pulse-dot"
            style={{ animationDelay: `${-0.32 + i * 0.16}s` }} />
        ))}
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
