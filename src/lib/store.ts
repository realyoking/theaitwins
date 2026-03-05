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
};

export type AIModel = 'anson67' | 'gemini';
export type ChatMode = 'fast' | 'thinking' | 'pro';

interface AppState {
  user: UserProfile | null;
  messages: ChatMessage[];
  isPro: boolean;
  credits: number;
  lastReset: string;
  theme: 'dark' | 'light';
  model: AIModel;
  mode: ChatMode;
  isCanvasOpen: boolean;
  canvasCode: string;
  isGenerating: boolean;
  sysPromptOverride: string;
  language: string;
  sidebarOpen: boolean;

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
  
  setSysPromptOverride: (s: string) => void;
  setLanguage: (l: string) => void;
  checkDailyReset: () => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  getCreditCost: () => number;
}

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: loadFromLS('tat_user', null),
  messages: loadFromLS('tat_chat', []),
  isPro: loadFromLS('tat_pro', false),
  credits: parseInt(localStorage.getItem('tat_credits') || '100') || 100,
  lastReset: localStorage.getItem('tat_reset') || new Date().toDateString(),
  theme: (localStorage.getItem('tat_theme') as 'dark' | 'light') || 'dark',
  model: 'anson67',
  mode: 'fast',
  isCanvasOpen: false,
  canvasCode: '',
  isGenerating: false,
  sysPromptOverride: localStorage.getItem('tat_sysprompt') || '',
  language: localStorage.getItem('tat_lang') || 'en',
  sidebarOpen: false,

  setUser: (user) => { set({ user }); localStorage.setItem('tat_user', JSON.stringify(user)); },
  addMessage: (msg) => {
    const msgs = [...get().messages, msg];
    set({ messages: msgs });
    localStorage.setItem('tat_chat', JSON.stringify(msgs));
  },
  clearMessages: () => { set({ messages: [] }); localStorage.setItem('tat_chat', '[]'); },
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
  
  setSysPromptOverride: (s) => { set({ sysPromptOverride: s }); localStorage.setItem('tat_sysprompt', s); },
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
}));
