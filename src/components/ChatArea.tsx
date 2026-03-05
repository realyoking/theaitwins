import { useRef, useEffect } from 'react';
import { Ghost, Cpu, Menu, Code } from 'lucide-react';
import { useAppStore, type AIModel } from '@/lib/store';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

const ChatArea = () => {
  const { messages, model, setModel, isGenerating, user, isCanvasOpen, setCanvasOpen, setCanvasCode, setSidebarOpen } = useAppStore();
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isGenerating]);

  const handleRenderCode = (code: string) => {
    setCanvasCode(code);
    if (!isCanvasOpen) setCanvasOpen(true);
  };

  const modelBtn = (m: AIModel, label: string) => (
    <button onClick={() => setModel(m)}
      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${model === m
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'}`}>
      {label}
    </button>
  );

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background h-full relative">
      {/* Top Nav */}
      <header className="shrink-0 h-14 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-10 border-b border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            {modelBtn('anson67', 'Anson67')}
            {modelBtn('gemini', 'Gemini')}
          </div>
        </div>
        <button onClick={() => setCanvasOpen(!isCanvasOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isCanvasOpen
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'}`}>
          <Code className="w-3.5 h-3.5" /> Canvas
        </button>
      </header>

      {/* Chat Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 md:px-20 py-6 custom-scrollbar scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-10">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
              {model === 'anson67' ? <Ghost className="w-8 h-8" /> : <Cpu className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {model === 'anson67' ? 'Sup. What do you want?' : 'How can I assist you?'}
            </h2>
            <p className="text-muted-foreground text-sm mb-10">
              {model === 'anson67' ? 'I write perfect code, answer anything, and roast you.' : 'Advanced reasoning, coding, and generation.'}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} userInitial={user?.initial || 'U'} model={model} onRenderCode={handleRenderCode} />
          ))
        )}
        {isGenerating && <TypingIndicator model={model} />}
      </div>

      <ChatInput />
    </main>
  );
};

export default ChatArea;
