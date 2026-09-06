/**
 * App Control — lets the AI actually operate the website on the user's behalf.
 * Dangerous operations require permission unless "always allow" is enabled.
 */
import { useAppStore } from './store';
import { getSkills, saveSkills } from './skills';
import { setGifProvider, type GifProvider } from './gifs';

const ALWAYS_KEY = 'tat_ai_always_allow';

export const isAlwaysAllow = () => localStorage.getItem(ALWAYS_KEY) === '1';
export const setAlwaysAllow = (v: boolean) => {
  localStorage.setItem(ALWAYS_KEY, v ? '1' : '0');
  window.dispatchEvent(new Event('tat:perm-changed'));
};

export interface ControlSpec {
  action: string;
  value?: any;
  target?: string;
  danger: boolean;
  describe: string;
  run: () => string;
}

const DANGEROUS = new Set(['clear_chats', 'delete_conversation', 'reset_settings', 'sign_out', 'clear_memories']);

/** Everything the AI is allowed to touch. */
export function buildControl(action: string, value?: any, target?: string): ControlSpec | null {
  const st = () => useAppStore.getState();
  const v = value;

  const map: Record<string, { describe: string; run: () => string }> = {
    set_theme: {
      describe: `Switch theme to ${v}`,
      run: () => { st().setTheme(v === 'light' ? 'light' : 'dark'); return `Theme set to ${v}.`; },
    },
    toggle_theme: { describe: 'Toggle light/dark theme', run: () => { st().toggleTheme(); return 'Theme toggled.'; } },
    set_font_size: {
      describe: `Set font size to ${v}`,
      run: () => { st().setFontSize(['sm', 'base', 'lg'].includes(v) ? v : 'base'); return `Font size: ${v}.`; },
    },
    set_wallpaper: { describe: `Set chat wallpaper`, run: () => { st().setWallpaper(String(v)); return 'Wallpaper updated.'; } },
    set_theme_preset: { describe: `Apply theme preset ${v}`, run: () => { st().setCustomThemeId(String(v)); return `Theme preset ${v} applied.`; } },
    set_language: { describe: `Set language to ${v}`, run: () => { st().setLanguage(String(v)); return `Language set to ${v}.`; } },
    set_model: { describe: `Switch persona to ${v}`, run: () => { st().setModel(v); return `Now talking to ${v}.`; } },
    set_effort: { describe: `Set reasoning effort to ${v}`, run: () => { st().setMode(v); return `Reasoning effort: ${v}.`; } },
    set_send_on_enter: { describe: `Send on Enter = ${v}`, run: () => { st().setSendOnEnter(!!v); return `Send-on-enter ${v ? 'on' : 'off'}.`; } },
    set_notifications: { describe: `Notifications = ${v}`, run: () => { st().setNotificationsEnabled(!!v); return `Notifications ${v ? 'on' : 'off'}.`; } },
    toggle_focus_mode: {
      describe: 'Toggle focus mode',
      run: () => { const s: any = st(); s.setFocusMode?.(!s.focusMode); return 'Focus mode toggled.'; },
    },
    toggle_sidebar: {
      describe: 'Toggle the sidebar',
      run: () => { const s: any = st(); s.setSidebarOpen?.(!s.sidebarOpen); return 'Sidebar toggled.'; },
    },
    new_chat: {
      describe: 'Start a new conversation',
      run: () => { const s: any = st(); (s.newConversation || s.createConversation)?.(); return 'New chat created.'; },
    },
    remember: {
      describe: `Remember: "${v}"`,
      run: () => { const s: any = st(); s.addMemory?.(String(v)); return 'Saved to memory.'; },
    },
    clear_memories: {
      describe: 'Erase all AI memories',
      run: () => { const s: any = st(); s.setMemories ? s.setMemories([]) : (s.memories || []).slice().forEach(() => s.removeMemory?.(0)); return 'Memories cleared.'; },
    },
    set_skill: {
      describe: `${v ? 'Enable' : 'Disable'} skill "${target}"`,
      run: () => {
        const list = getSkills().map((s) =>
          s.id === target || s.name.toLowerCase() === String(target).toLowerCase() ? { ...s, enabled: !!v } : s,
        );
        saveSkills(list);
        return `Skill "${target}" ${v ? 'enabled' : 'disabled'}.`;
      },
    },
    set_gif_provider: {
      describe: `Use ${v} for GIFs`,
      run: () => { setGifProvider((v === 'giphy' ? 'giphy' : 'tenor') as GifProvider); return `GIF source: ${v}.`; },
    },
    navigate: {
      describe: `Open ${v}`,
      run: () => { window.history.pushState({}, '', String(v)); window.dispatchEvent(new PopStateEvent('popstate')); return `Navigated to ${v}.`; },
    },
    clear_chats: {
      describe: 'Delete ALL conversations',
      run: () => { const s: any = st(); s.clearAllConversations?.() ?? s.clearAll?.(); return 'All chats deleted.'; },
    },
  };

  const entry = map[action];
  if (!entry) return null;
  return { action, value, target, danger: DANGEROUS.has(action), ...entry, run: entry.run };
}

/** Pending permission request bus. */
export type PendingPerm = { spec: ControlSpec; resolve: (ok: boolean) => void };
let pending: PendingPerm | null = null;
export const getPending = () => pending;

export function requestPermission(spec: ControlSpec): Promise<boolean> {
  if (!spec.danger || isAlwaysAllow()) return Promise.resolve(true);
  return new Promise((resolve) => {
    pending = {
      spec,
      resolve: (ok) => { pending = null; window.dispatchEvent(new Event('tat:perm-request')); resolve(ok); },
    };
    window.dispatchEvent(new Event('tat:perm-request'));
  });
}

export async function runControl(action: string, value?: any, target?: string): Promise<string> {
  const spec = buildControl(action, value, target);
  if (!spec) throw new Error(`Unknown app action: ${action}`);
  const ok = await requestPermission(spec);
  if (!ok) return `Permission denied by user: ${spec.describe}`;
  return spec.run();
}

export const CONTROL_ACTIONS = [
  'set_theme', 'toggle_theme', 'set_font_size', 'set_wallpaper', 'set_theme_preset', 'set_language',
  'set_model', 'set_effort', 'set_send_on_enter', 'set_notifications', 'toggle_focus_mode',
  'toggle_sidebar', 'new_chat', 'remember', 'clear_memories', 'set_skill', 'set_gif_provider',
  'navigate', 'clear_chats',
];
