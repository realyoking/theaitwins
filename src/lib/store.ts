import { create } from 'zustand';

export type UserProfile = {
  name: string;
  initial: string;
  age: string;
  gender: string;
  hobbies: string;
  referralCode?: string;
  referredBy?: string;
};

export type ChatMessage = {
  role: 'user' | 'bot';
  text?: string;
  image?: string;
  type?: 'text' | 'image' | 'video';
  url?: string;
  replyTo?: string;
  timestamp?: number;
  reactions?: string[];
  pinned?: boolean;
  edited?: boolean;
  responseTime?: number;
};

export type Conversation = {
  id: string;
  name: string;
  messages: ChatMessage[];
  model: AIModel;
  createdAt: number;
  pinned?: boolean;
  archived?: boolean;
  tags?: string[];
  shared?: boolean;
};

export type AIModel = 'anson67' | 'gemini' | 'chester' | 'bobby' | 'max';
export type ChatMode = 'fast' | 'thinking' | 'pro';

export type CustomPersona = {
  id: string;
  name: string;
  icon: string;
  prompt: string;
};

export type PromptTemplate = {
  id: string;
  name: string;
  prompt: string;
  category: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  bg: string;
  fg: string;
  primary: string;
  card: string;
  muted: string;
};

export type AnalyticsData = {
  totalMessages: number;
  totalConversations: number;
  creditsUsed: number;
  modelUsage: Record<string, number>;
  modeUsage: Record<string, number>;
  dailyMessages: Record<string, number>;
};

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
  globalPrompts: Record<string, string>;
  modelIcons: Record<string, string>;
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

  // New feature state
  chatSearchQuery: string;
  focusMode: boolean;
  wallpaper: string;
  customThemeId: string;
  autoDarkMode: boolean;
  personas: CustomPersona[];
  promptTemplates: PromptTemplate[];
  analytics: AnalyticsData;
  showArchived: boolean;
  allTags: string[];
  filterTag: string;
  streak: number;
  lastActiveDate: string;
  notificationsEnabled: boolean;
  notificationMode: 'every' | 'inactive' | 'never';
  ttsEnabled: boolean;
  ttsVoice: string;
  memories: string[];
  customFont: string;
  plugins: import('@/components/PluginSystem').Plugin[];
  workspaceTabs: import('@/components/WorkspaceTabs').WorkspaceTab[];
  activeTabId: string;

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
  loadGlobalPrompts: () => void;
  setModelIcon: (model: string, icon: string) => void;
  setLanguage: (l: string) => void;
  checkDailyReset: () => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  getCreditCost: () => number;
  toggleReaction: (msgIndex: number, emoji: string) => void;
  stopGenerating: () => void;

  // Message actions
  pinMessage: (msgIndex: number) => void;
  editMessage: (msgIndex: number, newText: string) => void;
  deleteMessage: (msgIndex: number) => void;

  // Conversation management
  createConversation: (model?: AIModel) => string;
  setActiveConversation: (id: string) => void;
  renameConversation: (id: string, name: string) => void;
  deleteConversation: (id: string) => void;
  pinConversation: (id: string) => void;
  duplicateConversation: (id: string) => void;
  exportConversation: (id: string) => string;
  archiveConversation: (id: string) => void;
  addTagToConversation: (id: string, tag: string) => void;
  removeTagFromConversation: (id: string, tag: string) => void;
  shareConversation: (id: string) => string;

  // Settings
  setSearchQuery: (q: string) => void;
  setChatSearchQuery: (q: string) => void;
  setFontSize: (s: 'sm' | 'base' | 'lg') => void;
  setSendOnEnter: (v: boolean) => void;
  setShowTimestamps: (v: boolean) => void;
  setCompactMode: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setAutoScroll: (v: boolean) => void;
  setMessageLimit: (n: number) => void;
  addCredits: (n: number) => void;
  setFocusMode: (v: boolean) => void;
  setWallpaper: (w: string) => void;
  setCustomThemeId: (id: string) => void;
  setAutoDarkMode: (v: boolean) => void;
  setShowArchived: (v: boolean) => void;
  setFilterTag: (t: string) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNotificationMode: (m: 'every' | 'inactive' | 'never') => void;
  setTtsEnabled: (v: boolean) => void;
  setTtsVoice: (v: string) => void;

  // Personas & Templates
  addPersona: (p: CustomPersona) => void;
  removePersona: (id: string) => void;
  addPromptTemplate: (t: PromptTemplate) => void;
  removePromptTemplate: (id: string) => void;

  // Analytics
  trackMessage: (model: AIModel, mode: ChatMode) => void;
  addMemory: (m: string) => void;
  removeMemory: (i: number) => void;

  // Font
  setCustomFont: (f: string) => void;

  // Plugins
  setPlugins: (p: import('@/components/PluginSystem').Plugin[]) => void;

  // Workspace tabs
  addWorkspaceTab: (conversationId: string) => void;
  removeWorkspaceTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Streak
  checkStreak: () => void;

  // Cloud sync
  syncToCloud: () => void;
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

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function saveConversations(convos: Conversation[]) {
  localStorage.setItem('tat_convos', JSON.stringify(convos));
  // Debounced cloud sync
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    try { useAppStore.getState().syncToCloud(); } catch {}
  }, 5000);
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  { id: '1', name: 'Summarize', prompt: 'Summarize the following text concisely:', category: 'Writing' },
  { id: '2', name: 'Translate to English', prompt: 'Translate the following to English:', category: 'Language' },
  { id: '3', name: 'Explain Simply', prompt: 'Explain this in simple terms a 10 year old would understand:', category: 'Learning' },
  { id: '4', name: 'Debug Code', prompt: 'Find and fix bugs in this code:', category: 'Coding' },
  { id: '5', name: 'Write Email', prompt: 'Write a professional email about:', category: 'Writing' },
  { id: '6', name: 'Brainstorm Ideas', prompt: 'Give me 10 creative ideas for:', category: 'Creative' },
  { id: '7', name: 'Pros & Cons', prompt: 'List the pros and cons of:', category: 'Analysis' },
  { id: '8', name: 'Extract To-Dos', prompt: 'Extract all action items and to-dos from this text as a checklist:', category: 'Productivity' },
];

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'default-dark', name: 'Midnight', bg: '0 0% 4%', fg: '0 0% 95%', primary: '0 0% 98%', card: '0 0% 7%', muted: '0 0% 15%' },
  { id: 'ocean', name: 'Ocean', bg: '220 25% 6%', fg: '210 40% 95%', primary: '210 100% 60%', card: '220 25% 9%', muted: '220 20% 15%' },
  { id: 'forest', name: 'Forest', bg: '150 20% 5%', fg: '140 30% 95%', primary: '140 60% 50%', card: '150 20% 8%', muted: '150 15% 15%' },
  { id: 'sunset', name: 'Sunset', bg: '15 20% 5%', fg: '30 40% 95%', primary: '25 95% 55%', card: '15 20% 8%', muted: '15 15% 15%' },
  { id: 'purple', name: 'Amethyst', bg: '270 20% 5%', fg: '270 30% 95%', primary: '270 70% 60%', card: '270 20% 8%', muted: '270 15% 15%' },
  { id: 'rose', name: 'Rose', bg: '340 20% 5%', fg: '340 30% 95%', primary: '340 80% 60%', card: '340 20% 8%', muted: '340 15% 15%' },
  { id: 'cyber', name: 'Cyberpunk', bg: '260 30% 4%', fg: '180 100% 70%', primary: '300 100% 60%', card: '260 30% 7%', muted: '260 20% 14%' },
  { id: 'mono', name: 'Monochrome', bg: '0 0% 3%', fg: '0 0% 80%', primary: '0 0% 70%', card: '0 0% 6%', muted: '0 0% 12%' },
];

export const WALLPAPERS = [
  { id: 'none', name: 'None', css: '' },
  { id: 'dots', name: 'Dots', css: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)' },
  { id: 'grid', name: 'Grid', css: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)' },
  { id: 'gradient1', name: 'Aurora', css: 'radial-gradient(ellipse at 20% 50%, hsla(270,60%,30%,0.15), transparent 50%), radial-gradient(ellipse at 80% 50%, hsla(200,60%,30%,0.15), transparent 50%)' },
  { id: 'gradient2', name: 'Glow', css: 'radial-gradient(ellipse at 50% 0%, hsla(var(--primary),0.08), transparent 70%)' },
  { id: 'noise', name: 'Subtle', css: 'linear-gradient(135deg, hsla(var(--primary),0.03) 0%, transparent 50%, hsla(var(--primary),0.03) 100%)' },
];

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
    modelPrompts: loadFromLS('tat_model_prompts', { anson67: '', gemini: '', chester: '', bobby: '', max: '' }),
    globalPrompts: {},
    modelIcons: loadFromLS('tat_model_icons', {}),
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

    // New features
    chatSearchQuery: '',
    focusMode: false,
    wallpaper: localStorage.getItem('tat_wallpaper') || 'none',
    customThemeId: localStorage.getItem('tat_custom_theme') || 'default-dark',
    autoDarkMode: loadFromLS('tat_autodark', false),
    personas: loadFromLS('tat_personas', []),
    promptTemplates: loadFromLS('tat_templates', DEFAULT_TEMPLATES),
    analytics: loadFromLS('tat_analytics', { totalMessages: 0, totalConversations: 0, creditsUsed: 0, modelUsage: {}, modeUsage: {}, dailyMessages: {} }),
    showArchived: false,
    allTags: loadFromLS('tat_tags', ['Work', 'Personal', 'Coding', 'Research', 'Fun']),
    filterTag: '',
    streak: parseInt(localStorage.getItem('tat_streak') || '0'),
    lastActiveDate: localStorage.getItem('tat_last_active') || '',
    notificationsEnabled: loadFromLS('tat_notif', false),
    notificationMode: (localStorage.getItem('tat_notif_mode') as any) || 'inactive',
    ttsEnabled: loadFromLS('tat_tts', false),
    ttsVoice: localStorage.getItem('tat_tts_voice') || '',
    memories: loadFromLS('tat_memories', []),
    customFont: localStorage.getItem('tat_font') || 'Inter',
    plugins: loadFromLS('tat_plugins', [
      { id: 'calculator', name: 'Calculator', description: 'Evaluate math expressions. Type /calc 2+2', icon: '🧮', enabled: false, type: 'builtin' },
      { id: 'translator', name: 'Quick Translate', description: 'Translate text. Type /translate [lang] [text]', icon: '🌐', enabled: false, type: 'builtin' },
      { id: 'timestamp', name: 'Timestamp', description: 'Insert date/time. Type /now', icon: '🕐', enabled: false, type: 'builtin' },
      { id: 'wordcount', name: 'Word Counter', description: 'Count words. Type /count [text]', icon: '📊', enabled: false, type: 'builtin' },
      { id: 'lorem', name: 'Lorem Generator', description: 'Placeholder text. Type /lorem [words]', icon: '📝', enabled: false, type: 'builtin' },
      { id: 'color', name: 'Color Picker', description: 'Convert colors. Type /color #ff0000', icon: '🎨', enabled: false, type: 'builtin' },
      { id: 'uuid', name: 'UUID Generator', description: 'Generate UUIDs. Type /uuid', icon: '🔑', enabled: false, type: 'builtin' },
      { id: 'base64', name: 'Base64 Encoder', description: 'Encode base64. Type /base64 [text]', icon: '🔐', enabled: false, type: 'builtin' },
    ]),
    workspaceTabs: [],
    activeTabId: '',

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

      // Fire notification for bot messages
      if (msg.role === 'bot' && state.notificationsEnabled && state.notificationMode !== 'never') {
        const shouldNotify = state.notificationMode === 'every' || (state.notificationMode === 'inactive' && document.hidden);
        if (shouldNotify) {
          const title = 'TheAiTwins';
          const body = msg.text?.slice(0, 120) || 'New response';
          
          // Local notification (when tab is open)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/pwa-192.png', tag: 'anson-msg-' + Date.now() });
          }
          
          // Web Push notification (works even when PWA is closed) - async fire-and-forget
          import('@/lib/push-notifications').then(({ sendPushToUser }) => {
            import('@/integrations/supabase/client').then(({ supabase }) => {
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user?.id) {
                  sendPushToUser(session.user.id, title, body, '/');
                }
              });
            });
          }).catch(() => {});
        }
      }
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
    loadGlobalPrompts: () => {
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.from('admin_settings').select('key, value').like('key', 'prompt_%').then(({ data }) => {
          if (data) {
            const gp: Record<string, string> = {};
            data.forEach(row => { gp[row.key.replace('prompt_', '')] = row.value; });
            set({ globalPrompts: gp });
          }
        });
      });
    },
    setModelIcon: (model, icon) => {
      const icons = { ...get().modelIcons, [model]: icon };
      set({ modelIcons: icons });
      localStorage.setItem('tat_model_icons', JSON.stringify(icons));
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

    stopGenerating: () => set({ isGenerating: false }),

    toggleReaction: (msgIndex, emoji) => {
      const state = get();
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

    pinMessage: (msgIndex) => {
      const state = get();
      const updated = state.conversations.map(c => {
        if (c.id !== state.activeConversationId) return c;
        const msgs = [...c.messages];
        msgs[msgIndex] = { ...msgs[msgIndex], pinned: !msgs[msgIndex].pinned };
        return { ...c, messages: msgs };
      });
      set({ conversations: updated });
      saveConversations(updated);
    },

    editMessage: (msgIndex, newText) => {
      const state = get();
      const updated = state.conversations.map(c => {
        if (c.id !== state.activeConversationId) return c;
        const msgs = [...c.messages];
        msgs[msgIndex] = { ...msgs[msgIndex], text: newText, edited: true };
        return { ...c, messages: msgs };
      });
      set({ conversations: updated });
      saveConversations(updated);
    },

    deleteMessage: (msgIndex) => {
      const state = get();
      const updated = state.conversations.map(c => {
        if (c.id !== state.activeConversationId) return c;
        const msgs = c.messages.filter((_, i) => i !== msgIndex);
        return { ...c, messages: msgs };
      });
      set({ conversations: updated });
      saveConversations(updated);
    },

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

    archiveConversation: (id) => {
      const updated = get().conversations.map(c => c.id === id ? { ...c, archived: !c.archived } : c);
      set({ conversations: updated });
      saveConversations(updated);
    },

    addTagToConversation: (id, tag) => {
      const updated = get().conversations.map(c => {
        if (c.id !== id) return c;
        const tags = [...(c.tags || [])];
        if (!tags.includes(tag)) tags.push(tag);
        return { ...c, tags };
      });
      const allTags = get().allTags;
      if (!allTags.includes(tag)) {
        const newTags = [...allTags, tag];
        set({ allTags: newTags });
        localStorage.setItem('tat_tags', JSON.stringify(newTags));
      }
      set({ conversations: updated });
      saveConversations(updated);
    },

    removeTagFromConversation: (id, tag) => {
      const updated = get().conversations.map(c => {
        if (c.id !== id) return c;
        return { ...c, tags: (c.tags || []).filter(t => t !== tag) };
      });
      set({ conversations: updated });
      saveConversations(updated);
    },

    shareConversation: (id) => {
      const convo = get().conversations.find(c => c.id === id);
      if (!convo) return '';
      const data = btoa(encodeURIComponent(JSON.stringify({ name: convo.name, messages: convo.messages.map(m => ({ role: m.role, text: m.text })) })));
      const url = `${window.location.origin}?shared=${data.slice(0, 100)}`;
      navigator.clipboard.writeText(get().exportConversation(id));
      return url;
    },

    setSearchQuery: (q) => set({ searchQuery: q }),
    setChatSearchQuery: (q) => set({ chatSearchQuery: q }),
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
    setFocusMode: (v) => set({ focusMode: v }),
    setWallpaper: (w) => { set({ wallpaper: w }); localStorage.setItem('tat_wallpaper', w); },
    setCustomThemeId: (id) => {
      set({ customThemeId: id });
      localStorage.setItem('tat_custom_theme', id);
      const theme = THEME_PRESETS.find(t => t.id === id);
      if (theme) {
        const root = document.documentElement;
        root.style.setProperty('--background', theme.bg);
        root.style.setProperty('--foreground', theme.fg);
        root.style.setProperty('--primary', theme.primary);
        root.style.setProperty('--card', theme.card);
        root.style.setProperty('--muted', theme.muted);
      }
    },
    setAutoDarkMode: (v) => { set({ autoDarkMode: v }); localStorage.setItem('tat_autodark', JSON.stringify(v)); },
    setShowArchived: (v) => set({ showArchived: v }),
    setFilterTag: (t) => set({ filterTag: t }),
    setNotificationsEnabled: (v) => { set({ notificationsEnabled: v }); localStorage.setItem('tat_notif', JSON.stringify(v)); },
    setNotificationMode: (m) => { set({ notificationMode: m }); localStorage.setItem('tat_notif_mode', m); },
    setTtsEnabled: (v) => { set({ ttsEnabled: v }); localStorage.setItem('tat_tts', JSON.stringify(v)); },
    setTtsVoice: (v) => { set({ ttsVoice: v }); localStorage.setItem('tat_tts_voice', v); },

    addPersona: (p) => {
      const next = [...get().personas, p];
      set({ personas: next });
      localStorage.setItem('tat_personas', JSON.stringify(next));
    },
    removePersona: (id) => {
      const next = get().personas.filter(p => p.id !== id);
      set({ personas: next });
      localStorage.setItem('tat_personas', JSON.stringify(next));
    },
    addPromptTemplate: (t) => {
      const next = [...get().promptTemplates, t];
      set({ promptTemplates: next });
      localStorage.setItem('tat_templates', JSON.stringify(next));
    },
    removePromptTemplate: (id) => {
      const next = get().promptTemplates.filter(t => t.id !== id);
      set({ promptTemplates: next });
      localStorage.setItem('tat_templates', JSON.stringify(next));
    },

    trackMessage: (model, mode) => {
      const a = { ...get().analytics };
      a.totalMessages++;
      a.modelUsage[model] = (a.modelUsage[model] || 0) + 1;
      a.modeUsage[mode] = (a.modeUsage[mode] || 0) + 1;
      const today = new Date().toISOString().slice(0, 10);
      a.dailyMessages[today] = (a.dailyMessages[today] || 0) + 1;
      a.creditsUsed += get().getCreditCost();
      set({ analytics: a });
      localStorage.setItem('tat_analytics', JSON.stringify(a));
    },

    addMemory: (m) => {
      const next = [...get().memories, m];
      set({ memories: next });
      localStorage.setItem('tat_memories', JSON.stringify(next));
    },
    removeMemory: (i) => {
      const next = get().memories.filter((_, idx) => idx !== i);
      set({ memories: next });
      localStorage.setItem('tat_memories', JSON.stringify(next));
    },

    setCustomFont: (f) => {
      set({ customFont: f });
      localStorage.setItem('tat_font', f);
      document.body.style.fontFamily = `'${f}', system-ui, sans-serif`;
    },

    setPlugins: (p) => {
      set({ plugins: p });
      localStorage.setItem('tat_plugins', JSON.stringify(p));
    },

    addWorkspaceTab: (conversationId) => {
      const state = get();
      const convo = state.conversations.find(c => c.id === conversationId);
      // Check if tab already exists
      const existing = state.workspaceTabs.find(t => t.conversationId === conversationId);
      if (existing) {
        set({ activeTabId: existing.id, activeConversationId: conversationId });
        return;
      }
      const tab = { id: generateId(), conversationId, name: convo?.name || 'New Tab' };
      const tabs = [...state.workspaceTabs, tab];
      set({ workspaceTabs: tabs, activeTabId: tab.id, activeConversationId: conversationId });
      localStorage.setItem('tat_tabs', JSON.stringify(tabs));
    },

    removeWorkspaceTab: (tabId) => {
      const state = get();
      const tabs = state.workspaceTabs.filter(t => t.id !== tabId);
      let activeTabId = state.activeTabId;
      if (activeTabId === tabId && tabs.length > 0) {
        activeTabId = tabs[tabs.length - 1].id;
        const convoId = tabs[tabs.length - 1].conversationId;
        set({ activeConversationId: convoId });
        localStorage.setItem('tat_active_convo', convoId);
      }
      set({ workspaceTabs: tabs, activeTabId });
      localStorage.setItem('tat_tabs', JSON.stringify(tabs));
    },

    setActiveTab: (tabId) => {
      const state = get();
      const tab = state.workspaceTabs.find(t => t.id === tabId);
      if (tab) {
        set({ activeTabId: tabId, activeConversationId: tab.conversationId });
        localStorage.setItem('tat_active_convo', tab.conversationId);
      }
    },

    checkStreak: () => {
      const today = new Date().toDateString();
      const { lastActiveDate, streak } = get();
      if (lastActiveDate === today) return;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = lastActiveDate === yesterday ? streak + 1 : 1;
      set({ streak: newStreak, lastActiveDate: today });
      localStorage.setItem('tat_streak', String(newStreak));
      localStorage.setItem('tat_last_active', today);
    },

    syncToCloud: () => {
      // Debounced sync of conversations and settings to cloud
      const state = get();
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user) return;
          const userId = session.user.id;

          // Sync conversations
          for (const convo of state.conversations) {
            supabase.from('user_conversations').upsert({
              user_id: userId,
              conversation_id: convo.id,
              name: convo.name,
              model: convo.model,
              messages: convo.messages as any,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,conversation_id' }).then(() => {});
          }

          // Sync settings
          supabase.from('user_app_settings').upsert({
            user_id: userId,
            settings: {
              theme: state.theme,
              fontSize: state.fontSize,
              sendOnEnter: state.sendOnEnter,
              showTimestamps: state.showTimestamps,
              compactMode: state.compactMode,
              soundEnabled: state.soundEnabled,
              autoScroll: state.autoScroll,
              wallpaper: state.wallpaper,
              customThemeId: state.customThemeId,
              customFont: state.customFont,
              notificationsEnabled: state.notificationsEnabled,
              notificationMode: state.notificationMode,
              ttsEnabled: state.ttsEnabled,
              focusMode: state.focusMode,
              language: state.language,
              memories: state.memories,
            },
            credits: state.credits,
            plan: state.isPro ? 'pro' : 'free',
            is_pro: state.isPro,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' }).then(() => {});
        });
      }).catch(() => {});
    },
  };
});

const EMPTY_MESSAGES: ChatMessage[] = [];

export const useMessages = () => useAppStore((state) => {
  const convo = state.conversations.find(c => c.id === state.activeConversationId);
  return convo?.messages ?? EMPTY_MESSAGES;
});
