import { Plus, Settings, Zap, Sun, Moon, X, Cpu, ChevronUp, MessageSquare } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenPricing: () => void;
}

const Sidebar = ({ onOpenSettings, onOpenPricing }: SidebarProps) => {
  const { user, credits, isPro, clearMessages, toggleTheme, theme, sidebarOpen, setSidebarOpen } = useAppStore();

  if (!user) return null;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`w-64 shrink-0 border-r border-border bg-sidebar flex flex-col transition-all duration-300 z-30
        ${sidebarOpen ? 'fixed inset-y-0 left-0' : 'hidden'} md:relative md:flex`}>
        <div className="h-14 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Cpu className="w-4 h-4" /> TheAiTwins
          </div>
          <div className="flex gap-1">
            <button onClick={toggleTheme} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          <button onClick={clearMessages}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] transition-transform">
            <Plus className="w-4 h-4" /> New Chat
          </button>

          {/* Credits */}
          <div className="bg-muted p-3 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Daily Credits</span>
              <Zap className="w-3 h-3 text-amber-accent" />
            </div>
            <div className="text-xl font-black">{isPro ? '∞' : credits}</div>
            <div className="text-[9px] text-muted-foreground mt-1 font-medium">Resets daily at 12:00 AM</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block mb-2">Tools</span>
            <button onClick={onOpenSettings}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
              <Settings className="w-4 h-4" /> Settings & API Key
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-border shrink-0 space-y-2">
          {!isPro && (
            <button onClick={onOpenPricing}
              className="w-full flex items-center justify-between p-2.5 bg-muted rounded-xl hover:bg-accent transition-colors group">
              <div className="flex items-center gap-2 text-xs font-bold"><Zap className="w-4 h-4 text-amber-accent" /> Upgrade Plan</div>
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            </button>
          )}
          <div className="flex items-center gap-3 p-2 hover:bg-accent rounded-xl cursor-pointer transition-colors" onClick={onOpenSettings}>
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold uppercase">
              {user.initial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">{user.name}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{isPro ? 'Pro Tier' : 'Free Tier'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
