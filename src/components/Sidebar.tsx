import { useState } from 'react';
import { Plus, Settings, Zap, Sun, Moon, X, Cpu, ChevronUp, MessageSquare, Pin, Trash2, Edit3, Search, MoreHorizontal, Copy, Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenPricing: () => void;
}

const Sidebar = ({ onOpenSettings, onOpenPricing }: SidebarProps) => {
  const {
    user, credits, isPro, conversations, activeConversationId,
    clearMessages, toggleTheme, theme, sidebarOpen, setSidebarOpen,
    setActiveConversation, renameConversation, deleteConversation,
    pinConversation, duplicateConversation, exportConversation, searchQuery, setSearchQuery
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  if (!user) return null;

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinned = filtered.filter(c => c.pinned).sort((a, b) => b.createdAt - a.createdAt);
  const unpinned = filtered.filter(c => !c.pinned).sort((a, b) => b.createdAt - a.createdAt);

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setMenuOpenId(null);
  };

  const finishRename = () => {
    if (editingId && editName.trim()) {
      renameConversation(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleExport = (id: string) => {
    const text = exportConversation(id);
    navigator.clipboard.writeText(text);
    setMenuOpenId(null);
  };

  const renderConvo = (c: typeof conversations[0]) => (
    <div key={c.id} className="group relative">
      <button
        onClick={() => { setActiveConversation(c.id); setSidebarOpen(false); }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors text-left ${
          c.id === activeConversationId ? 'bg-accent text-foreground font-bold' : 'text-muted-foreground hover:bg-accent/50'
        }`}
      >
        <MessageSquare className="w-3 h-3 shrink-0" />
        {editingId === c.id ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={finishRename}
            onKeyDown={(e) => e.key === 'Enter' && finishRename()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent outline-none text-xs border-b border-primary"
          />
        ) : (
          <span className="truncate flex-1">{c.name}</span>
        )}
        {c.pinned && <Pin className="w-2.5 h-2.5 text-amber-accent shrink-0" />}
      </button>

      {/* Context menu trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown menu */}
      {menuOpenId === c.id && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
          <button onClick={() => startRename(c.id, c.name)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Edit3 className="w-3 h-3" /> Rename
          </button>
          <button onClick={() => { pinConversation(c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Pin className="w-3 h-3" /> {c.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => { duplicateConversation(c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Copy className="w-3 h-3" /> Duplicate
          </button>
          <button onClick={() => handleExport(c.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Download className="w-3 h-3" /> Export
          </button>
          <div className="border-t border-border my-1" />
          <button onClick={() => { deleteConversation(c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-accent">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
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

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
          <button onClick={() => clearMessages()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] transition-transform">
            <Plus className="w-4 h-4" /> New Chat
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg text-xs outline-none border border-transparent focus:border-muted-foreground/30"
            />
          </div>

          {/* Credits */}
          <div className="bg-muted p-3 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Daily Credits</span>
              <Zap className="w-3 h-3 text-amber-accent" />
            </div>
            <div className="text-xl font-black">{isPro ? '∞' : credits}</div>
            <div className="text-[9px] text-muted-foreground mt-1 font-medium">Resets daily at 12:00 AM</div>
          </div>

          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block mb-2">📌 Pinned</span>
              <div className="space-y-0.5">{pinned.map(renderConvo)}</div>
            </div>
          )}

          {/* Chat History */}
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block mb-2">Chat History</span>
            <div className="space-y-0.5 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {unpinned.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-2">No chats yet</p>
              ) : (
                unpinned.map(renderConvo)
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block mb-2">Tools</span>
            <button onClick={onOpenSettings}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
              <Settings className="w-4 h-4" /> Settings
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
