import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { getSkills, saveSkills, upsertSkill, deleteSkill, type Skill } from '@/lib/skills';

const SkillsModal = ({ onClose }: { onClose: () => void }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [draft, setDraft] = useState<Skill | null>(null);

  useEffect(() => setSkills(getSkills()), []);

  const refresh = () => setSkills(getSkills());

  const toggle = (id: string) => {
    const next = skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSkills(next);
    saveSkills(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg max-h-[85dvh] overflow-y-auto custom-scrollbar bg-card border border-border rounded-t-3xl md:rounded-3xl shadow-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-primary grid place-items-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm">Skills</h2>
            <p className="text-[11px] text-muted-foreground">Instruction packs injected into every AI reply.</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          {skills.map((s) => (
            <div key={s.id} className="p-3 rounded-2xl border border-border/70 bg-muted/40">
              <div className="flex items-start gap-2">
                <button onClick={() => toggle(s.id)}
                  className={`mt-0.5 w-9 h-5 rounded-full shrink-0 transition-colors ${s.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`block w-4 h-4 bg-background rounded-full transition-transform ${s.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.description}</div>
                </div>
                <button onClick={() => setDraft(s)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-muted hover:bg-accent">Edit</button>
                {!s.builtin && (
                  <button onClick={() => { deleteSkill(s.id); refresh(); }} className="p-1 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setDraft({ id: `s${Date.now().toString(36)}`, name: '', description: '', instructions: '', enabled: true })}
          className="mt-3 w-full flex items-center justify-center gap-1 py-2.5 rounded-2xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50">
          <Plus className="w-3.5 h-3.5" /> New skill
        </button>

        {draft && (
          <div className="mt-4 p-3 rounded-2xl border border-border bg-background space-y-2">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Skill name" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-xs outline-none border border-border/60" />
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Short description" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-xs outline-none border border-border/60" />
            <textarea value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
              rows={4} placeholder="Instructions for the AI…"
              className="w-full bg-muted/60 rounded-xl px-3 py-2 text-xs outline-none border border-border/60 resize-none custom-scrollbar" />
            <div className="flex gap-2">
              <button onClick={() => { if (draft.name.trim()) { upsertSkill(draft); refresh(); } setDraft(null); }}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold">Save</button>
              <button onClick={() => setDraft(null)} className="px-3 py-1.5 rounded-xl bg-muted text-[11px] font-bold">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillsModal;
