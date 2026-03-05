import { useState, useRef } from 'react';
import { Send, ImageIcon, X, Zap } from 'lucide-react';
import { useAppStore, type ChatMode } from '@/lib/store';
import { sendChatMessage } from '@/lib/chat-api';

const ChatInput = () => {
  const { mode, setMode, isGenerating, addMessage, deductCredits, setIsGenerating } = useAppStore();
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const costMap: Record<ChatMode, number> = { fast: 1, thinking: 3, pro: 5 };
  const modeLabels: Record<ChatMode, string> = { fast: '⚡ Fast', thinking: '🧠 Thinking', pro: '💎 Pro' };

  const handleSend = async () => {
    if ((!text.trim() && !imageData) || isGenerating) return;
    if (!deductCredits()) return; // show pricing modal could be added

    addMessage({ role: 'user', text: text.trim(), image: imageData || undefined });
    const userText = text.trim();
    setText('');
    setImageData(null);
    if (textareaRef.current) textareaRef.current.style.height = '20px';
    setIsGenerating(true);
    await sendChatMessage(userText, imageData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const r = new FileReader();
      r.onloadend = () => setImageData(r.result as string);
      r.readAsDataURL(f);
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = '20px';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  return (
    <div className="shrink-0 p-4 md:px-20 bg-background border-t border-border z-20">
      <div className="max-w-3xl mx-auto">
        {/* Mode selector */}
        <div className="flex justify-between items-end mb-2 px-1">
          <div className="flex bg-muted p-0.5 rounded-lg border border-border shadow-sm">
            {(['fast', 'thinking', 'pro'] as ChatMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${mode === m
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'}`}>
                {modeLabels[m]}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border flex items-center gap-1">
            Cost: {costMap[mode]} <Zap className="w-3 h-3 text-amber-accent" />
          </span>
        </div>

        {/* Image preview */}
        {imageData && (
          <div className="mb-2 relative inline-block">
            <img src={imageData} className="h-14 w-14 object-cover rounded-xl border border-border shadow-sm" alt="Preview" />
            <button onClick={() => { setImageData(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-1 shadow hover:scale-110 transition-transform">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="bg-muted/90 backdrop-blur-xl rounded-3xl border border-border/50 shadow-lg focus-within:ring-1 ring-ring/30 transition-all flex items-end p-1.5">
          <button onClick={() => fileRef.current?.click()}
            className="p-2 mb-0.5 ml-1 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors shrink-0">
            <ImageIcon className="w-5 h-5" />
          </button>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImage} />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
            onKeyDown={handleKeyDown}
            placeholder="Message TheAiTwins..."
            className="flex-1 bg-transparent border-none outline-none py-2.5 px-3 text-[15px] font-medium resize-none min-h-[20px] max-h-[150px] custom-scrollbar placeholder:text-muted-foreground/50"
            rows={1}
          />

          <button onClick={handleSend} disabled={isGenerating || (!text.trim() && !imageData)}
            className="p-2 mb-0.5 mr-0.5 bg-primary text-primary-foreground rounded-full hover:scale-105 disabled:opacity-20 disabled:hover:scale-100 transition-all shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
