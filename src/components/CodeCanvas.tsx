import { Monitor, Smartphone, Download, X, Play } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';

const CodeCanvas = () => {
  const { isCanvasOpen, setCanvasOpen, canvasCode, theme } = useAppStore();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (!isCanvasOpen) return null;

  const srcdoc = `<!DOCTYPE html>
<html class="${theme}">
<head><script src="https://cdn.tailwindcss.com"><\/script><script>tailwind.config={darkMode:'class'}<\/script></head>
<body class="bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-white">
${canvasCode.includes('<html') ? canvasCode : `<div class="p-4">${canvasCode}</div>`}
</body></html>`;

  const handleDownload = () => {
    const blob = new Blob([srcdoc], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'canvas-preview.html';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 md:static md:z-40 w-full md:w-1/2 bg-background border-l border-border shadow-2xl flex flex-col">
      <div className="h-14 border-b border-border flex items-center justify-between px-3 bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary text-primary-foreground rounded-md"><Play className="w-3 h-3 fill-current" /></div>
          <span className="text-xs font-bold">Preview Canvas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-muted rounded-md p-0.5 mr-2">
            <button onClick={() => setDevice('desktop')}
              className={`p-1 rounded transition-colors ${device === 'desktop' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setDevice('mobile')}
              className={`p-1 rounded transition-colors ${device === 'mobile' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={handleDownload} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setCanvasOpen(false)} className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-surface-sunken relative flex justify-center py-6">
        <div className={device === 'mobile'
          ? 'w-[375px] h-[812px] rounded-[2.5rem] shadow-xl overflow-hidden border-[6px] border-border ring-2 ring-border'
          : 'w-full h-full'}>
          <iframe srcDoc={srcdoc} className="w-full h-full border-none bg-background" sandbox="allow-scripts allow-same-origin" title="Canvas Preview" />
        </div>
      </div>
    </div>
  );
};

export default CodeCanvas;
