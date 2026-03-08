import { useRef, useEffect } from 'react';
import { Ghost, Cpu, Menu, Code, Skull } from 'lucide-react';
import { useAppStore, useMessages, type AIModel } from '@/lib/store';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

const ChatArea = () => {
  const messages = useMessages();
  const { model, setModel, isGenerating, user, isCanvasOpen, setCanvasOpen, setCanvasCode, setSidebarOpen, autoScroll } = useAppStore();
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current && autoScroll) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isGenerating, autoScroll]);

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

  const getIcon = () => {
    if (model === 'anson67') return <Ghost className="w-8 h-8" />;
    if (model === 'chester') return <Skull className="w-8 h-8" />;
    return <Cpu className="w-8 h-8" />;
  };

  const getGreeting = () => {
    if (model === 'anson67') return { title: 'Sup. What do you want?', sub: 'I write perfect code, answer anything, and roast you.' };
    if (model === 'chester') return { title: '主人，有咩吩咐？', sub: 'Chester聽命於你。' };
    return { title: 'How can I assist you?', sub: 'Advanced reasoning, coding, and generation.' };
  };

  const greeting = getGreeting();

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background h-full relative">
      <header className="shrink-0 h-14 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-10 border-b border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            {modelBtn('anson67', 'Anson67')}
            {modelBtn('gemini', 'Gemini')}
            {modelBtn('chester', 'Chester')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
              {messages.length} msgs · {messages.reduce((a, m) => a + (m.text?.split(/\s+/).length || 0), 0)} words
            </span>
          )}
          <button onClick={() => setCanvasOpen(!isCanvasOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isCanvasOpen
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'}`}>
            <Code className="w-3.5 h-3.5" /> Canvas
          </button>
        </div>
      </header>

      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 md:px-20 py-6 custom-scrollbar scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-10">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
              {getIcon()}
            </div>
            <h2 className="text-2xl font-bold mb-2">{greeting.title}</h2>
            <p className="text-muted-foreground text-sm mb-10">{greeting.sub}</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {['Write me a poem', 'Explain quantum physics', 'Help me code', 'Tell me a joke'].map(q => (
                <button key={q} onClick={() => {
                  const input = document.querySelector('textarea') as HTMLTextAreaElement;
                  if (input) { input.value = q; input.dispatchEvent(new Event('input', { bubbles: true })); }
                }}
                  className="px-3 py-2.5 bg-muted hover:bg-accent rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} msgIndex={i} userInitial={user?.initial || 'U'} model={model} onRenderCode={handleRenderCode} />
          ))
        )}
        {isGenerating && <TypingIndicator model={model} />}
      </div>

      <ChatInput />
    </main>
  );
};

export default ChatArea;
