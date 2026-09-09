import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Star, History, Sparkles } from 'lucide-react';
import {
  searchGifs, recentGifs, favoriteGifs, rememberGif, toggleFavoriteGif,
  GIF_SUGGESTIONS, prefetchGifs, type GifItem, type GifMedia,
} from '@/lib/gifs';

const TABS: { key: GifMedia | 'recent' | 'fav'; label: string }[] = [
  { key: 'gifs', label: 'GIFs' },
  { key: 'stickers', label: 'Stickers' },
  { key: 'clips', label: 'Clips' },
  { key: 'emojis', label: 'Emoji' },
  { key: 'recent', label: 'Recent' },
  { key: 'fav', label: 'Saved' },
];

interface Props {
  onPick: (item: GifItem) => void;
  onClose: () => void;
}

const GifPicker = ({ onPick, onClose }: Props) => {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('gifs');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favTick, setFavTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); prefetchGifs(['gifs', 'stickers', 'clips']); }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 160);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const local = tab === 'recent' || tab === 'fav';

  useEffect(() => {
    if (local) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchGifs(debounced, tab as GifMedia)
      .then((r) => !cancelled && setItems(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [debounced, tab, local]);

  const list = useMemo(() => {
    if (tab === 'recent') return recentGifs();
    if (tab === 'fav') return favoriteGifs();
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, items, favTick]);

  const choose = (item: GifItem) => {
    rememberGif(item);
    onPick(item);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-2xl h-[72vh] md:h-[70vh] flex flex-col rounded-t-3xl md:rounded-3xl bg-card border border-border shadow-elevated overflow-hidden"
      >
        <div className="p-3 border-b border-border/60 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-muted/70 rounded-2xl px-3 py-2 border border-border/60 focus-within:ring-2 ring-primary/25">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search GIFs…"
              className="flex-1 bg-transparent outline-none text-sm font-medium min-w-0"
            />
            {q && <button onClick={() => setQ('')}><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar border-b border-border/40">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                tab === t.key ? 'bg-gradient-primary text-primary-foreground shadow-glow' : 'bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.key === 'recent' && <History className="w-3 h-3" />}
              {t.key === 'fav' && <Star className="w-3 h-3" />}
              {t.label}
            </button>
          ))}
        </div>

        {!local && !q && (
          <div className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
            {GIF_SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setQ(s)}
                className="px-2.5 py-1 rounded-full bg-muted/60 border border-border/50 text-[10px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {loading && !list.length && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
              <Sparkles className="w-6 h-6 text-amber-accent" />
              <p className="text-sm font-bold">GIFs aren’t available yet</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}
          {!loading && !error && !list.length && (
            <p className="text-center text-xs text-muted-foreground pt-10">Nothing here yet.</p>
          )}
          <div className="columns-2 sm:columns-3 md:columns-4 gap-2 [column-fill:_balance]">
            <AnimatePresence initial={false}>
              {list.map((item) => (
                <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mb-2 break-inside-avoid relative group rounded-xl overflow-hidden border border-border/50 bg-muted/40">
                  <img
                    src={item.preview}
                    alt={item.title || 'GIF'}
                    loading="lazy"
                    onClick={() => choose(item)}
                    className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <button
                    onClick={() => { toggleFavoriteGif(item); setFavTick((n) => n + 1); }}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-background/70 backdrop-blur border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Save"
                  >
                    <Star className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground text-center">
          Powered by KLIPY · tip: type <span className="font-bold">/gif happy</span> in chat
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default GifPicker;
