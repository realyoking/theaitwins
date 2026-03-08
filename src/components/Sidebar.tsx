import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Zap, Sun, Moon, X, Cpu, ChevronUp, MessageSquare, Pin, Trash2, Edit3, Search, MoreHorizontal, Copy, Download, Archive, Tag, BarChart3, Users, Gift, Shield, LogOut, Terminal } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenPricing: () => void;
  onOpenAnalytics: () => void;
}

const Sidebar = ({ onOpenSettings, onOpenPricing, onOpenAnalytics }: SidebarProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const {
    user, credits, isPro, conversations, activeConversationId,
    clearMessages, toggleTheme, theme, sidebarOpen, setSidebarOpen,
    setActiveConversation, renameConversation, deleteConversation,
    pinConversation, duplicateConversation, exportConversation,
    archiveConversation, addTagToConversation, removeTagFromConversation,
    searchQuery, setSearchQuery, showArchived, setShowArchived,
    allTags, filterTag, setFilterTag, streak, shareConversation
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      supabase.rpc('has_role', { _user_id: authUser.id, _role: 'admin' }).then(({ data }) => {
        setIsAdmin(!!data);
      });
    });
  }, []);

  if (!user) return null;

  const filtered = conversations.filter(c => {
    if (!showArchived && c.archived) return false;
    if (showArchived && !c.archived) return false;
    if (filterTag && !(c.tags || []).includes(filterTag)) return false;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pinned = filtered.filter(c => c.pinned).sort((a, b) => b.createdAt - a.createdAt);
  const unpinned = filtered.filter(c => !c.pinned).sort((a, b) => b.createdAt - a.createdAt);

  const startRename = (id: string, name: string) => { setEditingId(id); setEditName(name); setMenuOpenId(null); };
  const finishRename = () => { if (editingId && editName.trim()) renameConversation(editingId, editName.trim()); setEditingId(null); };

  const handleExport = (id: string) => { navigator.clipboard.writeText(exportConversation(id)); setMenuOpenId(null); };
  const handleShare = (id: string) => { shareConversation(id); setMenuOpenId(null); };

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
          <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
            onBlur={finishRename} onKeyDown={(e) => e.key === 'Enter' && finishRename()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent outline-none text-xs border-b border-primary" />
        ) : (
          <span className="truncate flex-1">{c.name}</span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {c.pinned && <Pin className="w-2.5 h-2.5 text-amber-accent" />}
          {c.archived && <Archive className="w-2.5 h-2.5 text-muted-foreground" />}
          {(c.tags || []).length > 0 && <Tag className="w-2.5 h-2.5 text-primary" />}
        </div>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {menuOpenId === c.id && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
          <button onClick={() => startRename(c.id, c.name)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Edit3 className="w-3 h-3" /> Rename
          </button>
          <button onClick={() => { pinConversation(c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Pin className="w-3 h-3" /> {c.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => { setShowTagPicker(showTagPicker === c.id ? null : c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Tag className="w-3 h-3" /> Tags
          </button>
          <button onClick={() => { duplicateConversation(c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Copy className="w-3 h-3" /> Duplicate
          </button>
          <button onClick={() => handleShare(c.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Users className="w-3 h-3" /> Share
          </button>
          <button onClick={() => handleExport(c.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Download className="w-3 h-3" /> Export
          </button>
          <button onClick={() => { archiveConversation(c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
            <Archive className="w-3 h-3" /> {c.archived ? 'Unarchive' : 'Archive'}
          </button>
          <div className="border-t border-border my-1" />
          <button onClick={() => { deleteConversation(c.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-accent">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}

      {/* Tag picker */}
      {showTagPicker === c.id && (
        <div className="ml-8 mt-1 mb-1 flex flex-wrap gap-1">
          {allTags.map(tag => {
            const active = (c.tags || []).includes(tag);
            return (
              <button key={tag} onClick={() => active ? removeTagFromConversation(c.id, tag) : addTagToConversation(c.id, tag)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                {tag}
              </button>
            );
          })}
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
            <NotificationBell />
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
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..." className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg text-xs outline-none border border-transparent focus:border-muted-foreground/30" />
          </div>

          {/* Tag filter */}
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFilterTag('')}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${!filterTag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              All
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${filterTag === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {tag}
              </button>
            ))}
          </div>

          {/* Archive toggle */}
          <div className="flex gap-1">
            <button onClick={() => setShowArchived(false)}
              className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${!showArchived ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              Active
            </button>
            <button onClick={() => setShowArchived(true)}
              className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 ${showArchived ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              <Archive className="w-3 h-3" /> Archived
            </button>
          </div>

          {/* Credits & Streak */}
          <div className="bg-muted p-3 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Daily Credits</span>
              <Zap className="w-3 h-3 text-amber-accent" />
            </div>
            <div className="text-xl font-black">{isPro ? '∞' : credits}</div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground font-medium">Resets daily</span>
              {streak > 0 && <span className="text-[9px] font-bold text-amber-accent">🔥 {streak} day streak</span>}
            </div>
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
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block mb-2">
              {showArchived ? 'Archived' : 'Chat History'}
            </span>
            <div className="space-y-0.5 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {unpinned.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-2">{showArchived ? 'No archived chats' : 'No chats yet'}</p>
              ) : (
                unpinned.map(renderConvo)
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block mb-2">Tools</span>
            <button onClick={() => navigate('/groups')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
              <Users className="w-4 h-4" /> Groups
            </button>
            <button onClick={() => navigate('/playground')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
              <Terminal className="w-4 h-4" /> Code Playground
            </button>
            <button onClick={onOpenAnalytics}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
            {isAdmin && (
              <button onClick={() => navigate('/admin')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
                <Shield className="w-4 h-4" /> Admin Panel
              </button>
            )}
            <button onClick={onOpenSettings}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-destructive hover:bg-accent rounded-lg transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          {/* Referral */}
          <div className="bg-muted p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-3.5 h-3.5 text-amber-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Refer a Friend</span>
            </div>
            <p className="text-[9px] text-muted-foreground mb-2">Share your code and both get 50 bonus credits!</p>
            <div className="flex gap-1">
              <div className="flex-1 bg-background rounded-lg px-2 py-1.5 text-[10px] font-mono truncate border border-border">
                {user.referralCode || user.name?.toUpperCase().slice(0, 4) + '2025'}
              </div>
              <button onClick={() => navigator.clipboard.writeText(user.referralCode || user.name?.toUpperCase().slice(0, 4) + '2025')}
                className="px-2 py-1.5 bg-primary text-primary-foreground rounded-lg text-[9px] font-bold">
                Copy
              </button>
            </div>
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
