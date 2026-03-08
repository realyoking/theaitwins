import { create } from 'zustand';

export type UserProfile = {
  name: string;
  initial: string;
  age: string;
  gender: string;
  hobbies: string;
};

export type ChatMessage = {
  role: 'user' | 'bot';
  text?: string;
  image?: string;
  type?: 'text' | 'image';
  url?: string;
  timestamp?: number;
  reactions?: string[];
};

export type Conversation = {
  id: string;
  name: string;
  messages: ChatMessage[];
  model: AIModel;
  createdAt: number;
  pinned?: boolean;
};

export type AIModel = 'anson67' | 'gemini' | 'chester';
export type ChatMode = 'fast' | 'thinking' | 'pro';

interface AppState {
  user: UserProfile | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  isPro: boolean;
  credits: number;
  lastReset: string;
  theme: 'dark' | 'light';
  model: AIModel;
  mode: ChatMode;
  isCanvasOpen: boolean;
  canvasCode: string;
  isGenerating: boolean;
  modelPrompts: Record<AIModel, string>;
  language: string;
  sidebarOpen: boolean;
  searchQuery: string;
  fontSize: 'sm' | 'base' | 'lg';
  sendOnEnter: boolean;
  showTimestamps: boolean;
  compactMode: boolean;
  soundEnabled: boolean;
  autoScroll: boolean;
  messageLimit: number;

  setUser: (user: UserProfile) => void;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  setModel: (m: AIModel) => void;
  setMode: (m: ChatMode) => void;
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setIsGenerating: (v: boolean) => void;
  setCanvasOpen: (v: boolean) => void;
  setCanvasCode: (c: string) => void;
  deductCredits: () => boolean;
  setSidebarOpen: (v: boolean) => void;
  setModelPrompt: (model: AIModel, prompt: string) => void;
  setLanguage: (l: string) => void;
  checkDailyReset: () => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  getCreditCost: () => number;
  toggleReaction: (msgIndex: number, emoji: string) => void;
  stopGenerating: () => void;

  // Conversation management
  createConversation: (model?: AIModel) => string;
  setActiveConversation: (id: string) => void;
  renameConversation: (id: string, name: string) => void;
  deleteConversation: (id: string) => void;
  pinConversation: (id: string) => void;
  duplicateConversation: (id: string) => void;
  exportConversation: (id: string) => string;

  // Settings
  setSearchQuery: (q: string) => void;
  setFontSize: (s: 'sm' | 'base' | 'lg') => void;
  setSendOnEnter: (v: boolean) => void;
  setShowTimestamps: (v: boolean) => void;
  setCompactMode: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setAutoScroll: (v: boolean) => void;
  setMessageLimit: (n: number) => void;
  addCredits: (n: number) => void;
}

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem('tat_convos', JSON.stringify(convos));
}

export const useAppStore = create<AppState>((set, get) => {
  const savedConvos = loadFromLS<Conversation[]>('tat_convos', []);
  const savedActiveId = localStorage.getItem('tat_active_convo') || null;

  const oldMessages = loadFromLS<ChatMessage[]>('tat_chat', []);
  let initialConvos = savedConvos;
  let initialActiveId = savedActiveId;

  if (oldMessages.length > 0 && savedConvos.length === 0) {
    const migrated: Conversation = {
      id: generateId(),
      name: oldMessages.find(m => m.role === 'user')?.text?.slice(0, 40) || 'Old Chat',
      messages: oldMessages,
      model: 'anson67',
      createdAt: Date.now(),
    };
    initialConvos = [migrated];
    initialActiveId = migrated.id;
    saveConversations(initialConvos);
    localStorage.setItem('tat_active_convo', migrated.id);
    localStorage.removeItem('tat_chat');
  }

  return {
    user: loadFromLS('tat_user', null),
    conversations: initialConvos,
    activeConversationId: initialActiveId,
    isPro: loadFromLS('tat_pro', false),
    credits: parseInt(localStorage.getItem('tat_credits') || '100') || 100,
    lastReset: localStorage.getItem('tat_reset') || new Date().toDateString(),
    theme: (localStorage.getItem('tat_theme') as 'dark' | 'light') || 'dark',
    model: 'anson67',
    mode: 'fast',
    isCanvasOpen: false,
    canvasCode: '',
    isGenerating: false,
    modelPrompts: loadFromLS('tat_model_prompts', { anson67: '', gemini: '', chester: '' }),
    language: localStorage.getItem('tat_lang') || 'en',
    sidebarOpen: false,
    searchQuery: '',
    fontSize: (localStorage.getItem('tat_fontsize') as any) || 'base',
    sendOnEnter: loadFromLS('tat_enter', true),
    showTimestamps: loadFromLS('tat_timestamps', false),
    compactMode: loadFromLS('tat_compact', false),
    soundEnabled: loadFromLS('tat_sound', true),
    autoScroll: loadFromLS('tat_autoscroll', true),
    messageLimit: parseInt(localStorage.getItem('tat_msglimit') || '50') || 50,

    setUser: (user) => { set({ user }); localStorage.setItem('tat_user', JSON.stringify(user)); },

    addMessage: (msg) => {
      const state = get();
      const msgWithTime = { ...msg, timestamp: Date.now() };
      let convoId = state.activeConversationId;
      let convos = state.conversations;

      if (!convoId || !convos.find(c => c.id === convoId)) {
        const id = generateId();
        const newConvo: Conversation = {
          id,
          name: msg.role === 'user' ? (msg.text?.slice(0, 40) || 'New Chat') : 'New Chat',
          messages: [],
          model: state.model,
          createdAt: Date.now(),
        };
        convos = [newConvo, ...convos];
        convoId = id;
        localStorage.setItem('tat_active_convo', id);
      }

      const updated = convos.map(c => {
        if (c.id !== convoId) return c;
        const newMsgs = [...c.messages, msgWithTime];
        const name = c.messages.length === 0 && msg.role === 'user' ? (msg.text?.slice(0, 40) || 'New Chat') : c.name;
        return { ...c, messages: newMsgs, name };
      });

      set({ conversations: updated, activeConversationId: convoId });
      saveConversations(updated);
    },

    clearMessages: () => {
      const id = generateId();
      const convo: Conversation = {
        id,
        name: 'New Chat',
        messages: [],
        model: get().model,
        createdAt: Date.now(),
      };
      const updated = [convo, ...get().conversations];
      set({ conversations: updated, activeConversationId: id });
      saveConversations(updated);
      localStorage.setItem('tat_active_convo', id);
    },

    setModel: (m) => set({ model: m }),
    setMode: (m) => set({ mode: m }),
    setTheme: (t) => {
      set({ theme: t });
      localStorage.setItem('tat_theme', t);
      document.documentElement.className = t;
    },
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
    setIsGenerating: (v) => set({ isGenerating: v }),
    setCanvasOpen: (v) => set({ isCanvasOpen: v }),
    setCanvasCode: (c) => set({ canvasCode: c }),
    setSidebarOpen: (v) => set({ sidebarOpen: v }),

    setModelPrompt: (model, prompt) => {
      const prompts = { ...get().modelPrompts, [model]: prompt };
      set({ modelPrompts: prompts });
      localStorage.setItem('tat_model_prompts', JSON.stringify(prompts));
    },
    setLanguage: (l) => { set({ language: l }); localStorage.setItem('tat_lang', l); },
    updateUser: (partial) => {
      const user = { ...get().user!, ...partial };
      if (partial.name) user.initial = partial.name.charAt(0).toUpperCase();
      set({ user });
      localStorage.setItem('tat_user', JSON.stringify(user));
    },
    getCreditCost: () => {
      const m = get().mode;
      return m === 'fast' ? 1 : m === 'thinking' ? 3 : 5;
    },
    deductCredits: () => {
      const { isPro, credits, getCreditCost } = get();
      const cost = getCreditCost();
      if (!isPro && credits < cost) return false;
      if (!isPro) {
        const next = credits - cost;
        set({ credits: next });
        localStorage.setItem('tat_credits', String(next));
      }
      return true;
    },
    checkDailyReset: () => {
      const today = new Date().toDateString();
      const { lastReset, isPro } = get();
      if (lastReset !== today) {
        const c = isPro ? 999999 : 100;
        set({ credits: c, lastReset: today });
        localStorage.setItem('tat_credits', String(c));
        localStorage.setItem('tat_reset', today);
      }
    },

    stopGenerating: () => {
      set({ isGenerating: false });
    },

    toggleReaction: (msgIndex, emoji) => {
      const state = get();
      const convo = state.conversations.find(c => c.id === state.activeConversationId);
      if (!convo) return;
      const updated = state.conversations.map(c => {
        if (c.id !== state.activeConversationId) return c;
        const msgs = [...c.messages];
        const msg = { ...msgs[msgIndex] };
        const reactions = msg.reactions || [];
        msg.reactions = reactions.includes(emoji) ? reactions.filter(r => r !== emoji) : [...reactions, emoji];
        msgs[msgIndex] = msg;
        return { ...c, messages: msgs };
      });
      set({ conversations: updated });
      saveConversations(updated);
    },

    // Conversation management
    createConversation: (model?: AIModel) => {
      const id = generateId();
      const convo: Conversation = {
        id,
        name: 'New Chat',
        messages: [],
        model: model || get().model,
        createdAt: Date.now(),
      };
      const updated = [convo, ...get().conversations];
      set({ conversations: updated, activeConversationId: id });
      saveConversations(updated);
      localStorage.setItem('tat_active_convo', id);
      return id;
    },

    setActiveConversation: (id) => {
      set({ activeConversationId: id });
      localStorage.setItem('tat_active_convo', id);
    },

    renameConversation: (id, name) => {
      const updated = get().conversations.map(c => c.id === id ? { ...c, name } : c);
      set({ conversations: updated });
      saveConversations(updated);
    },

    deleteConversation: (id) => {
      const filtered = get().conversations.filter(c => c.id !== id);
      const newActive = filtered.length > 0 ? filtered[0].id : null;
      set({ conversations: filtered, activeConversationId: newActive });
      saveConversations(filtered);
      if (newActive) localStorage.setItem('tat_active_convo', newActive);
    },

    pinConversation: (id) => {
      const updated = get().conversations.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
      set({ conversations: updated });
      saveConversations(updated);
    },

    duplicateConversation: (id) => {
      const orig = get().conversations.find(c => c.id === id);
      if (!orig) return;
      const newConvo: Conversation = { ...orig, id: generateId(), name: orig.name + ' (copy)', createdAt: Date.now() };
      const updated = [newConvo, ...get().conversations];
      set({ conversations: updated, activeConversationId: newConvo.id });
      saveConversations(updated);
    },

    exportConversation: (id) => {
      const convo = get().conversations.find(c => c.id === id);
      if (!convo) return '';
      return convo.messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.text || '[Image]'}`).join('\n\n');
    },

    setSearchQuery: (q) => set({ searchQuery: q }),
    setFontSize: (s) => { set({ fontSize: s }); localStorage.setItem('tat_fontsize', s); },
    setSendOnEnter: (v) => { set({ sendOnEnter: v }); localStorage.setItem('tat_enter', JSON.stringify(v)); },
    setShowTimestamps: (v) => { set({ showTimestamps: v }); localStorage.setItem('tat_timestamps', JSON.stringify(v)); },
    setCompactMode: (v) => { set({ compactMode: v }); localStorage.setItem('tat_compact', JSON.stringify(v)); },
    setSoundEnabled: (v) => { set({ soundEnabled: v }); localStorage.setItem('tat_sound', JSON.stringify(v)); },
    setAutoScroll: (v) => { set({ autoScroll: v }); localStorage.setItem('tat_autoscroll', JSON.stringify(v)); },
    setMessageLimit: (n) => { set({ messageLimit: n }); localStorage.setItem('tat_msglimit', String(n)); },
    addCredits: (n) => {
      const next = get().credits + n;
      set({ credits: next });
      localStorage.setItem('tat_credits', String(next));
    },
  };
});

// Selector to get current messages - use this in components
export const useMessages = () => useAppStore((state) => {
  const convo = state.conversations.find(c => c.id === state.activeConversationId);
  return convo?.messages || [];
});
