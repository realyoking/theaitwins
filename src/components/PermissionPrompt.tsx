import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert } from 'lucide-react';
import { getPending, setAlwaysAllow, type PendingPerm } from '@/lib/app-control';

/** Asks the user before the AI performs a destructive app action. */
const PermissionPrompt = () => {
  const [pending, setPending] = useState<PendingPerm | null>(null);

  useEffect(() => {
    const sync = () => setPending(getPending());
    window.addEventListener('tat:perm-request', sync);
    return () => window.removeEventListener('tat:perm-request', sync);
  }, []);

  if (!pending) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-2xl bg-destructive/15 grid place-items-center">
            <ShieldAlert className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-black">Allow this action?</h3>
            <p className="text-[11px] text-muted-foreground">The AI wants to change your app.</p>
          </div>
        </div>
        <p className="text-xs font-bold bg-muted/60 border border-border/60 rounded-2xl p-3 mb-3">{pending.spec.describe}</p>
        <div className="flex gap-2">
          <button onClick={() => pending.resolve(false)} className="flex-1 py-2.5 rounded-2xl bg-muted text-xs font-bold">Deny</button>
          <button onClick={() => pending.resolve(true)} className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold">Allow once</button>
        </div>
        <button
          onClick={() => { setAlwaysAllow(true); pending.resolve(true); }}
          className="w-full mt-2 py-2 rounded-2xl border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground"
        >
          Always allow
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default PermissionPrompt;
