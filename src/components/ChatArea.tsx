import { useRef, useEffect, useState, useCallback } from 'react';
import { Ghost, Cpu, Menu, Code, Skull, Search, X, Maximize2, Minimize2, BookTemplate, Wand2, Layers } from 'lucide-react';
import { useAppStore, useMessages, type AIModel } from '@/lib/store';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import { WALLPAPERS } from '@/lib/store';
import { sendChatMessage } from '@/lib/chat-api';
import { executePlugin } from './PluginSystem';
import { EXTRA_WALLPAPERS } from './WallpaperPicker';
import WorkspaceTabs from './WorkspaceTabs';

const ChatArea = () => {
  const messages = useMessages();
  const {
    model, setModel, isGenerating, user, isCanvasOpen, setCanvasOpen, setCanvasCode,
    setSidebarOpen, autoScroll, chatSearchQuery, setChatSearchQuery, focusMode, setFocusMode,
    wallpaper, promptTemplates, addMessage, deductCredits, setIsGenerating, trackMessage, mode,
    plugins, workspaceTabs, activeTabId, addWorkspaceTab, removeWorkspaceTab, setActiveTab,
    activeConversationId, conversations, createConversation
  } = useAppStore();
  const feedRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (feedRef.current && autoScroll) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isGenerating, autoScroll]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k') { e.preventDefault(); setShowSearch(s => !s); }
        if (e.key === 'n') { e.preventDefault(); useAppStore.getState().clearMessages(); }
        if (e.key === 'b') { e.preventDefault(); setSidebarOpen(true); }
        if (e.key === 'f' && e.shiftKey) { e.preventDefault(); setFocusMode(!focusMode); }
        if (e.key === '/') { e.preventDefault(); setShowTemplates(t => !t); }
        if (e.key === 't') { e.preventDefault(); handleNewTab(); }
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowTemplates(false);
        setChatSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusMode]);

  const handleRenderCode = (code: string) => {
    setCanvasCode(code);
    if (!isCanvasOpen) setCanvasOpen(true);
  };

  const handleQuickAction = useCallback(async (action: string, text: string) => {
    const prompt = `${action}: ${text}`;
    if (!deductCredits()) return;
    addMessage({ role: 'user', text: prompt });
    setIsGenerating(true);
    trackMessage(model, mode);
    await sendChatMessage(prompt);
  }, [model, mode]);

  const handleUseTemplate = (templatePrompt: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = templatePrompt + ' ';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
    }
    setShowTemplates(false);
  };

  // Tab management
  const handleNewTab = () => {
    const id = createConversation();
    addWorkspaceTab(id);
  };

  const handleOpenInTab = () => {
    if (activeConversationId) {
      addWorkspaceTab(activeConversationId);
    }
  };

  const filteredMessages = chatSearchQuery
    ? messages.filter(m => m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  const pinnedMessages = messages.filter(m => m.pinned);

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

  // Merge wallpapers
  const allWallpapers = [...WALLPAPERS, ...EXTRA_WALLPAPERS];
  const wp = allWallpapers.find(w => w.id === wallpaper);
  const customWallpaperImage = localStorage.getItem('tat_custom_wallpaper');
  const wallpaperStyle = wallpaper === 'custom-image' && customWallpaperImage
    ? { backgroundImage: `url(${customWallpaperImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : wp?.css ? {
        backgroundImage: wp.css,
        backgroundSize: wp.id === 'dots' || wp.id === 'grid' ? '20px 20px'
          : wp.id === 'stars' ? '150px 100px'
          : wp.id === 'hexagons' ? '40px 70px'
          : undefined
      } : {};

  return (
    <main className={`flex-1 flex flex-col min-w-0 bg-background h-full relative ${focusMode ? 'fixed inset-0 z-50' : ''}`}>
      {/* Workspace Tabs */}
      <WorkspaceTabs
        tabs={workspaceTabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTab}
        onCloseTab={removeWorkspaceTab}
        onNewTab={handleNewTab}
      />

      {/* Header */}
      {!focusMode && (
        <header className="shrink-0 h-12 md:h-14 flex items-center justify-between px-2 md:px-4 bg-background/80 backdrop-blur-md z-10 border-b border-border/50">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
              {modelBtn('anson67', '👻')}
              {modelBtn('gemini', '🤖')}
              {modelBtn('chester', '💀')}
            </div>
            <span className="hidden md:inline text-[10px] text-muted-foreground font-medium">
              {model === 'anson67' ? 'Anson67' : model === 'gemini' ? 'Gemini' : 'Chester'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md hidden md:block">
                {messages.length} msgs
              </span>
            )}
            <button onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors" title="Search">
              <Search className="w-4 h-4" />
            </button>
            <button onClick={() => setShowTemplates(!showTemplates)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors hidden md:flex" title="Templates">
              <BookTemplate className="w-4 h-4" />
            </button>
            <button onClick={handleOpenInTab}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors hidden md:flex" title="Open in Tab">
              <Layers className="w-4 h-4" />
            </button>
            <button onClick={() => setFocusMode(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors hidden md:flex" title="Focus Mode">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setCanvasOpen(!isCanvasOpen)}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isCanvasOpen
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'}`}>
              <Code className="w-3.5 h-3.5" /> <span className="hidden md:inline">Canvas</span>
            </button>
          </div>
        </header>
      )}

      {/* Focus mode header */}
      {focusMode && (
        <div className="absolute top-4 right-4 z-50">
          <button onClick={() => setFocusMode(false)} className="p-2 bg-card border border-border rounded-xl shadow-lg text-muted-foreground hover:text-foreground">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="shrink-0 px-4 md:px-20 py-2 bg-card border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input autoFocus value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)}
            placeholder="Search messages..." className="flex-1 bg-transparent outline-none text-sm" />
          {chatSearchQuery && <span className="text-[10px] text-muted-foreground">{filteredMessages.length} results</span>}
          <button onClick={() => { setShowSearch(false); setChatSearchQuery(''); }} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Template picker */}
      {showTemplates && (
        <div className="shrink-0 px-4 md:px-20 py-3 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Prompt Templates</span>
            <button onClick={() => setShowTemplates(false)} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {promptTemplates.map(t => (
              <button key={t.id} onClick={() => handleUseTemplate(t.prompt)}
                className="shrink-0 px-3 py-2 bg-muted hover:bg-accent rounded-xl text-xs font-medium transition-colors border border-border">
                <Wand2 className="w-3 h-3 inline mr-1" />{t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && !chatSearchQuery && (
        <div className="shrink-0 px-4 md:px-20 py-2 bg-card/50 border-b border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">📌 Pinned</span>
          <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
            {pinnedMessages.map((m, i) => (
              <div key={i} className="text-xs text-muted-foreground truncate">{m.text?.slice(0, 80)}</div>
            ))}
          </div>
        </div>
      )}

      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 md:px-20 py-6 custom-scrollbar scroll-smooth" style={wallpaperStyle}>
        {filteredMessages.length === 0 && !chatSearchQuery ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-10">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
              {getIcon()}
            </div>
            <h2 className="text-2xl font-bold mb-2">{greeting.title}</h2>
            <p className="text-muted-foreground text-sm mb-10">{greeting.sub}</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {['Write me a poem', 'Explain quantum physics', 'Help me code', 'Tell me a joke'].map(q => (
                <button key={q} onClick={() => handleUseTemplate(q)}
                  className="px-3 py-2.5 bg-muted hover:bg-accent rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left">
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-8">⌨️ Ctrl+K search · Ctrl+N new chat · Ctrl+/ templates · Ctrl+T new tab</p>
          </div>
        ) : filteredMessages.length === 0 && chatSearchQuery ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No results for "{chatSearchQuery}"</div>
        ) : (
          filteredMessages.map((msg, i) => {
            const realIndex = chatSearchQuery ? messages.indexOf(msg) : i;
            return (
              <MessageBubble key={realIndex} msg={msg} msgIndex={realIndex} userInitial={user?.initial || 'U'} model={model}
                onRenderCode={handleRenderCode} onQuickAction={handleQuickAction} />
            );
          })
        )}
        {isGenerating && <TypingIndicator model={model} />}
      </div>

      <ChatInput />
    </main>
  );
};

export default ChatArea;
