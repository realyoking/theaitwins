import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, MessageSquare, Plus, Wand2, Terminal, Users, Settings as SettingsIcon,
  Sun, Moon, BarChart3, Pin, CornerDownLeft,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Props {
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: any;
  run: () => void;
};

/** ⌘K / Ctrl+K palette: jump to any chat (searches message text) or run a quick action. */
const CommandPalette = ({ onOpenSettings, onOpenAnalytics }: Props) => {
  const navigate = useNavigate();
  const {
    conversations, setActiveConversation, clearMessages, toggleTheme, theme, pinConversation,
  } = useAppStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQ('');
        setCursor(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpenEvt = () => { setOpen(true); setQ(''); setCursor(0); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('tat:palette', onOpenEvt);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('tat:palette', onOpenEvt);
    };
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const actions: Item[] = useMemo(() => [
    { id: 'new', label: 'New chat', icon: Plus, run: () => clearMessages() },
    { id: 'ws', label: 'Open AI Workspace', icon: Wand2, run: () => navigate('/workspace') },
    { id: 'pg', label: 'Open Code Playground', icon: Terminal, run: () => navigate('/playground') },
    { id: 'gr', label: 'Open Groups', icon: Users, run: () => navigate('/groups') },
    { id: 'an', label: 'Open Analytics', icon: BarChart3, run: onOpenAnalytics },
    { id: 'st', label: 'Open Settings', icon: SettingsIcon, run: onOpenSettings },
    { id: 'th', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', icon: theme === 'dark' ? Sun : Moon, run: () => toggleTheme() },
  ], [theme, navigate, clearMessages, toggleTheme, onOpenAnalytics, onOpenSettings]);

  const results: Item[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const acts = needle ? actions.filter((a) => a.label.toLowerCase().includes(needle)) : actions;

    const chats: Item[] = conversations
      .map((c) => {
        const inTitle = c.name.toLowerCase().includes(needle);
        const hit = needle
          ? c.messages.find((m) => (m.text || '').toLowerCase().includes(needle))
          : undefined;
        if (needle && !inTitle && !hit) return null;
        return {
          id: `c-${c.id}`,
          label: c.name || 'Untitled chat',
          hint: hit?.text?.slice(0, 90) || `${c.messages.length} messages`,
          icon: c.pinned ? Pin : MessageSquare,
          run: () => { setActiveConversation(c.id); navigate('/'); },
        } as Item;
      })
      .filter(Boolean)
      .slice(0, 20) as Item[];

    return [...acts, ...chats];
  }, [q, actions, conversations, setActiveConversation, navigate]);

  useEffect(() => { setCursor(0); }, [q]);

  if (!open) return null;

  const choose = (item?: Item) => {
    if (!item) return;
    item.run();
    setOpen(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] bg-background/70 backdrop-blur-sm p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
              if (e.key === 'Enter') { e.preventDefault(); choose(results[cursor]); }
            }}
            placeholder="Search chats and actions…"
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
          <kbd className="text-[9px] font-bold text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto custom-scrollbar py-1">
          {results.length === 0 && (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">Nothing found.</p>
          )}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === cursor ? 'bg-accent' : ''}`}
              >
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold truncate">{item.label}</span>
                  {item.hint && <span className="block text-[10px] text-muted-foreground truncate">{item.hint}</span>}
                </span>
                {i === cursor && <CornerDownLeft className="w-3 h-3 text-muted-foreground" />}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-border/60 text-[10px] text-muted-foreground flex gap-3">
          <span>↑↓ navigate</span><span>↵ open</span><span>⌘K toggle</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommandPalette;
