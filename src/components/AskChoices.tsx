import { useState } from 'react';
import { HelpCircle, Check, Send } from 'lucide-react';
import type { AskDirective } from '@/lib/ai-tools';

interface Props {
  ask: AskDirective;
  onAnswer: (answer: string) => void;
}

const AskChoices = ({ ask, onAnswer }: Props) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [done, setDone] = useState(false);

  const choose = (opt: string) => {
    if (done) return;
    if (ask.multi) {
      setPicked((p) => (p.includes(opt) ? p.filter((x) => x !== opt) : [...p, opt]));
    } else {
      setDone(true);
      onAnswer(opt);
    }
  };

  const submit = () => {
    const answer = [...picked, custom.trim()].filter(Boolean).join(', ');
    if (!answer) return;
    setDone(true);
    onAnswer(answer);
  };

  return (
    <div className="my-3 w-full rounded-2xl border border-primary/25 bg-primary/[0.06] p-3 shadow-soft">
      <div className="flex items-start gap-2 mb-2.5">
        <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[13px] font-semibold leading-snug">{ask.question}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ask.options.map((opt) => {
          const active = picked.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              disabled={done}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all disabled:opacity-50 ${
                active
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-card hover:bg-accent border-border/70 text-foreground'
              }`}
            >
              {active && <Check className="w-3 h-3" />}
              {opt}
            </button>
          );
        })}
      </div>
      {!done && (
        <div className="flex items-center gap-1.5 mt-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder={ask.multi ? 'Add your own…' : 'Or type your own answer…'}
            className="flex-1 px-3 py-1.5 text-[12px] bg-muted/70 border border-border/60 rounded-full outline-none focus:ring-1 ring-ring/30"
          />
          <button onClick={submit} className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            disabled={!custom.trim() && picked.length === 0}>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {done && <p className="text-[10px] text-muted-foreground mt-2">Answer sent ✓</p>}
    </div>
  );
};

export default AskChoices;
