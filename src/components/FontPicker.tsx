import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Check } from 'lucide-react';

const GOOGLE_FONTS = [
  { name: 'Inter', category: 'Sans-serif' },
  { name: 'JetBrains Mono', category: 'Monospace' },
  { name: 'Fira Code', category: 'Monospace' },
  { name: 'Space Grotesk', category: 'Sans-serif' },
  { name: 'Space Mono', category: 'Monospace' },
  { name: 'Outfit', category: 'Sans-serif' },
  { name: 'Sora', category: 'Sans-serif' },
  { name: 'DM Sans', category: 'Sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'Sans-serif' },
  { name: 'Clash Display', category: 'Display' },
  { name: 'IBM Plex Sans', category: 'Sans-serif' },
  { name: 'IBM Plex Mono', category: 'Monospace' },
  { name: 'Roboto Mono', category: 'Monospace' },
  { name: 'Source Code Pro', category: 'Monospace' },
  { name: 'Playfair Display', category: 'Serif' },
  { name: 'Lora', category: 'Serif' },
  { name: 'Merriweather', category: 'Serif' },
  { name: 'Crimson Pro', category: 'Serif' },
  { name: 'Manrope', category: 'Sans-serif' },
  { name: 'Geist', category: 'Sans-serif' },
  { name: 'Satoshi', category: 'Sans-serif' },
  { name: 'General Sans', category: 'Sans-serif' },
  { name: 'Instrument Sans', category: 'Sans-serif' },
  { name: 'Rubik', category: 'Sans-serif' },
];

interface FontPickerProps {
  open: boolean;
  onClose: () => void;
  currentFont: string;
  onSelectFont: (font: string) => void;
}

const FontPicker = ({ open, onClose, currentFont, onSelectFont }: FontPickerProps) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      // Load all fonts for preview
      GOOGLE_FONTS.forEach(f => {
        if (!loadedFonts.has(f.name)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${f.name.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
          document.head.appendChild(link);
          setLoadedFonts(prev => new Set(prev).add(f.name));
        }
      });
    }
  }, [open]);

  const categories = ['All', ...new Set(GOOGLE_FONTS.map(f => f.category))];
  const filtered = GOOGLE_FONTS.filter(f => {
    if (filter !== 'All' && f.category !== filter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (fontName: string) => {
    // Load the font
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);

    // Apply to body
    document.body.style.fontFamily = `'${fontName}', system-ui, sans-serif`;
    onSelectFont(fontName);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card p-6 rounded-3xl shadow-2xl border border-border relative max-h-[85vh] overflow-hidden flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Type className="w-5 h-5" /> Custom Fonts</h2>
            <p className="text-xs text-muted-foreground mb-4">Choose a font for your entire UI</p>

            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fonts..."
              className="w-full px-3 py-2 bg-muted rounded-lg text-xs outline-none border border-transparent focus:border-muted-foreground/30 mb-3" />

            <div className="flex gap-1 mb-3 overflow-x-auto custom-scrollbar pb-1">
              {categories.map(c => (
                <button key={c} onClick={() => setFilter(c)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${filter === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {c}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {filtered.map(font => (
                <button key={font.name} onClick={() => handleSelect(font.name)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-colors ${
                    currentFont === font.name ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: `'${font.name}', sans-serif` }}>{font.name}</div>
                    <div className="text-[10px] text-muted-foreground">{font.category}</div>
                    <div className="text-xs mt-1" style={{ fontFamily: `'${font.name}', sans-serif` }}>
                      The quick brown fox jumps over the lazy dog
                    </div>
                  </div>
                  {currentFont === font.name && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FontPicker;
