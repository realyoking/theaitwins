import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, RotateCcw, Copy, Check, Sparkles } from 'lucide-react';
import { useAppStore, THEME_PRESETS } from '@/lib/store';

interface ThemeStudioProps {
  open: boolean;
  onClose: () => void;
}

const RANDOM_THEMES = [
  { name: 'Neon Tokyo', bg: '260 40% 3%', fg: '300 100% 95%', primary: '320 100% 60%', card: '260 40% 6%', muted: '260 30% 12%', accent: '180 100% 50%' },
  { name: 'Emerald Night', bg: '160 30% 3%', fg: '150 20% 92%', primary: '160 80% 45%', card: '160 30% 6%', muted: '160 20% 12%', accent: '40 90% 55%' },
  { name: 'Blood Moon', bg: '0 30% 4%', fg: '0 10% 90%', primary: '0 80% 50%', card: '0 30% 7%', muted: '0 20% 13%', accent: '30 90% 55%' },
  { name: 'Arctic', bg: '210 30% 6%', fg: '200 20% 93%', primary: '200 90% 55%', card: '210 30% 9%', muted: '210 20% 15%', accent: '170 80% 50%' },
  { name: 'Lavender Dreams', bg: '280 25% 5%', fg: '280 15% 92%', primary: '280 60% 65%', card: '280 25% 8%', muted: '280 15% 14%', accent: '200 70% 55%' },
  { name: 'Gold Rush', bg: '40 20% 4%', fg: '40 15% 92%', primary: '40 85% 50%', card: '40 20% 7%', muted: '40 15% 13%', accent: '20 80% 55%' },
];

const hslToHex = (hsl: string) => {
  const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

type CustomTheme = {
  bg: string; fg: string; primary: string; card: string; muted: string; accent: string;
};

const ThemeStudio = ({ open, onClose }: ThemeStudioProps) => {
  const { customThemeId, setCustomThemeId } = useAppStore();
  const [custom, setCustom] = useState<CustomTheme>({
    bg: '0 0% 4%', fg: '0 0% 95%', primary: '0 0% 98%', card: '0 0% 7%', muted: '0 0% 15%', accent: '38 92% 50%',
  });
  const [copied, setCopied] = useState(false);
  const [themeName, setThemeName] = useState('My Theme');
  const [savedCustomThemes, setSavedCustomThemes] = useState<Array<CustomTheme & { name: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('tat_custom_themes') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (open) {
      const preset = THEME_PRESETS.find(t => t.id === customThemeId);
      if (preset) {
        setCustom({ bg: preset.bg, fg: preset.fg, primary: preset.primary, card: preset.card, muted: preset.muted, accent: '38 92% 50%' });
      }
    }
  }, [open]);

  const applyTheme = (theme: CustomTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--background', theme.bg);
    root.style.setProperty('--foreground', theme.fg);
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--card', theme.card);
    root.style.setProperty('--muted', theme.muted);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--popover', theme.card);
    root.style.setProperty('--sidebar-background', theme.card);
  };

  const handleColorChange = (key: keyof CustomTheme, hex: string) => {
    const hsl = hexToHsl(hex);
    const next = { ...custom, [key]: hsl };
    setCustom(next);
    applyTheme(next);
  };

  const handleRandomize = () => {
    const random = RANDOM_THEMES[Math.floor(Math.random() * RANDOM_THEMES.length)];
    const theme = { bg: random.bg, fg: random.fg, primary: random.primary, card: random.card, muted: random.muted, accent: random.accent };
    setCustom(theme);
    setThemeName(random.name);
    applyTheme(theme);
  };

  const handleSaveCustom = () => {
    const newThemes = [...savedCustomThemes, { ...custom, name: themeName }];
    setSavedCustomThemes(newThemes);
    localStorage.setItem('tat_custom_themes', JSON.stringify(newThemes));
  };

  const handleDeleteCustom = (index: number) => {
    const newThemes = savedCustomThemes.filter((_, i) => i !== index);
    setSavedCustomThemes(newThemes);
    localStorage.setItem('tat_custom_themes', JSON.stringify(newThemes));
  };

  const handleCopyCSS = () => {
    const css = `:root {\n  --background: ${custom.bg};\n  --foreground: ${custom.fg};\n  --primary: ${custom.primary};\n  --card: ${custom.card};\n  --muted: ${custom.muted};\n  --accent: ${custom.accent};\n}`;
    navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorField = (label: string, key: keyof CustomTheme) => (
    <div className="flex items-center gap-3">
      <label className="text-[10px] font-bold text-muted-foreground uppercase w-20">{label}</label>
      <div className="relative">
        <input type="color" value={hslToHex(custom[key])} onChange={(e) => handleColorChange(key, e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent" />
      </div>
      <span className="text-[9px] font-mono text-muted-foreground">{custom[key]}</span>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card p-6 rounded-3xl shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Palette className="w-5 h-5" /> Theme Studio</h2>
            <p className="text-xs text-muted-foreground mb-5">Design your perfect theme with live preview</p>

            {/* Preview card */}
            <div className="rounded-2xl p-4 mb-5 border border-border" style={{ background: `hsl(${custom.bg})`, color: `hsl(${custom.fg})` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `hsl(${custom.primary})`, color: `hsl(${custom.bg})` }}>A</div>
                <div>
                  <div className="text-sm font-bold">Preview</div>
                  <div className="text-[10px]" style={{ color: `hsl(${custom.muted.split(' ')[0]} ${custom.muted.split(' ')[1]} 65%)` }}>This is how your theme looks</div>
                </div>
              </div>
              <div className="rounded-xl p-3 mb-2" style={{ background: `hsl(${custom.card})` }}>
                <div className="text-xs">Chat message preview</div>
              </div>
              <div className="rounded-xl p-2 text-center text-xs font-bold" style={{ background: `hsl(${custom.primary})`, color: `hsl(${custom.bg})` }}>Button</div>
            </div>

            {/* Color pickers */}
            <div className="space-y-3 mb-5">
              {colorField('Background', 'bg')}
              {colorField('Foreground', 'fg')}
              {colorField('Primary', 'primary')}
              {colorField('Card', 'card')}
              {colorField('Muted', 'muted')}
              {colorField('Accent', 'accent')}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-5">
              <button onClick={handleRandomize} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-xl text-xs font-bold hover:bg-accent transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Randomize
              </button>
              <button onClick={handleCopyCSS} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-muted rounded-xl text-xs font-bold hover:bg-accent transition-colors">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>

            {/* Save */}
            <div className="flex gap-2 mb-5">
              <input value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="Theme name"
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs outline-none border border-transparent focus:border-muted-foreground/30" />
              <button onClick={handleSaveCustom} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Save</button>
            </div>

            {/* Saved custom themes */}
            {savedCustomThemes.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Saved Themes</span>
                <div className="grid grid-cols-3 gap-2">
                  {savedCustomThemes.map((t, i) => (
                    <div key={i} className="relative group">
                      <button onClick={() => { setCustom(t); applyTheme(t); }}
                        className="w-full p-2 rounded-xl border border-border hover:border-muted-foreground/30 transition-all">
                        <div className="w-full h-6 rounded-lg mb-1 flex items-center justify-end pr-1" style={{ background: `hsl(${t.bg})` }}>
                          <div className="w-3 h-3 rounded-full" style={{ background: `hsl(${t.primary})` }} />
                        </div>
                        <span className="text-[9px] font-bold truncate block">{t.name}</span>
                      </button>
                      <button onClick={() => handleDeleteCustom(i)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Presets */}
            <div className="mt-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Presets</span>
              <div className="grid grid-cols-4 gap-2">
                {THEME_PRESETS.map(t => (
                  <button key={t.id} onClick={() => { setCustomThemeId(t.id); const theme = { bg: t.bg, fg: t.fg, primary: t.primary, card: t.card, muted: t.muted, accent: '38 92% 50%' }; setCustom(theme); applyTheme(theme); }}
                    className={`p-2 rounded-xl border text-center transition-all ${customThemeId === t.id ? 'ring-2 ring-ring border-transparent' : 'border-border hover:border-muted-foreground/30'}`}>
                    <div className="w-full h-5 rounded-lg mb-1" style={{ background: `hsl(${t.bg})` }}>
                      <div className="w-2.5 h-2.5 rounded-full ml-auto mr-0.5 mt-0.5" style={{ background: `hsl(${t.primary})` }} />
                    </div>
                    <span className="text-[8px] font-bold">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ThemeStudio;
