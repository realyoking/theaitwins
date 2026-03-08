import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Upload, Sparkles } from 'lucide-react';
import { useAppStore, WALLPAPERS } from '@/lib/store';

const EXTRA_WALLPAPERS = [
  { id: 'stars', name: 'Stars', css: 'radial-gradient(2px 2px at 20px 30px, hsl(var(--foreground)/0.15), transparent), radial-gradient(2px 2px at 40px 70px, hsl(var(--foreground)/0.1), transparent), radial-gradient(1px 1px at 90px 40px, hsl(var(--foreground)/0.12), transparent), radial-gradient(1px 1px at 130px 80px, hsl(var(--foreground)/0.08), transparent)' },
  { id: 'waves', name: 'Waves', css: 'repeating-linear-gradient(45deg, transparent, transparent 35px, hsl(var(--primary)/0.03) 35px, hsl(var(--primary)/0.03) 70px)' },
  { id: 'diagonal', name: 'Diagonal', css: 'repeating-linear-gradient(-45deg, hsl(var(--border)/0.3) 0px, hsl(var(--border)/0.3) 1px, transparent 1px, transparent 15px)' },
  { id: 'circles', name: 'Circles', css: 'radial-gradient(circle at 25% 25%, hsl(var(--primary)/0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(var(--primary)/0.05) 0%, transparent 50%)' },
  { id: 'gradient3', name: 'Sunset', css: 'linear-gradient(180deg, hsla(20,80%,40%,0.06) 0%, transparent 40%, hsla(280,60%,40%,0.06) 100%)' },
  { id: 'gradient4', name: 'Ocean', css: 'linear-gradient(135deg, hsla(200,80%,40%,0.08) 0%, hsla(160,60%,30%,0.05) 50%, hsla(220,70%,40%,0.08) 100%)' },
  { id: 'hexagons', name: 'Hexagons', css: 'linear-gradient(60deg, hsl(var(--border)/0.2) 25%, transparent 25.5%, transparent 75%, hsl(var(--border)/0.2) 75%), linear-gradient(120deg, hsl(var(--border)/0.2) 25%, transparent 25.5%, transparent 75%, hsl(var(--border)/0.2) 75%)' },
  { id: 'mesh', name: 'Mesh', css: 'radial-gradient(at 40% 20%, hsla(270,70%,50%,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(190,70%,50%,0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(340,70%,50%,0.08) 0px, transparent 50%)' },
];

interface WallpaperPickerProps {
  open: boolean;
  onClose: () => void;
}

const WallpaperPicker = ({ open, onClose }: WallpaperPickerProps) => {
  const { wallpaper, setWallpaper } = useAppStore();
  const [customImage, setCustomImage] = useState<string | null>(() => localStorage.getItem('tat_custom_wallpaper'));
  const fileRef = useRef<HTMLInputElement>(null);

  const allWallpapers = [...WALLPAPERS, ...EXTRA_WALLPAPERS];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setCustomImage(dataUrl);
        localStorage.setItem('tat_custom_wallpaper', dataUrl);
        setWallpaper('custom-image');
      };
      reader.readAsDataURL(file);
    }
  };

  const getWallpaperStyle = (id: string, css: string) => {
    if (id === 'custom-image' && customImage) {
      return { backgroundImage: `url(${customImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (!css) return {};
    return {
      backgroundImage: css,
      backgroundSize: id === 'dots' || id === 'grid' ? '20px 20px'
        : id === 'stars' ? '150px 100px'
        : id === 'hexagons' ? '40px 70px'
        : undefined
    };
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card p-6 rounded-3xl shadow-2xl border border-border relative max-h-[85vh] overflow-y-auto custom-scrollbar">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Image className="w-5 h-5" /> Chat Wallpapers</h2>
            <p className="text-xs text-muted-foreground mb-5">Choose a background pattern for your chat</p>

            {/* Custom upload */}
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-muted rounded-xl text-xs font-bold hover:bg-accent transition-colors mb-4 border border-dashed border-border">
              <Upload className="w-4 h-4" /> Upload Custom Wallpaper
            </button>
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

            {/* Custom image preview */}
            {customImage && (
              <div className="mb-4">
                <button onClick={() => setWallpaper('custom-image')}
                  className={`w-full h-20 rounded-xl border overflow-hidden transition-all ${wallpaper === 'custom-image' ? 'ring-2 ring-ring border-transparent' : 'border-border'}`}
                  style={{ backgroundImage: `url(${customImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <span className="text-xs font-bold bg-card/80 px-2 py-1 rounded">Custom Image</span>
                </button>
              </div>
            )}

            {/* Patterns */}
            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Patterns</span>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {allWallpapers.map(w => (
                <button key={w.id} onClick={() => setWallpaper(w.id)}
                  className={`h-16 rounded-xl border text-center transition-all flex items-center justify-center ${
                    wallpaper === w.id ? 'ring-2 ring-ring border-transparent' : 'border-border hover:border-muted-foreground/30'}`}
                  style={getWallpaperStyle(w.id, w.css)}>
                  <span className="text-[9px] font-bold bg-card/80 px-1.5 py-0.5 rounded">{w.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Export extra wallpapers for ChatArea
export { EXTRA_WALLPAPERS };
export default WallpaperPicker;
