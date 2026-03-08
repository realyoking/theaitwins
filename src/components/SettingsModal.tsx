import { useState, useEffect, useCallback } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Trash2, Ghost, Cpu, Skull, Palette, Brain, Users, Bell, Volume2, Type, Image, Sparkles, Upload, Check, Copy } from 'lucide-react';
import { useAppStore, type AIModel, type CustomPersona, THEME_PRESETS, WALLPAPERS } from '@/lib/store';
import { SYSTEM_PROMPTS } from '@/lib/prompts';
import { EXTRA_WALLPAPERS } from './WallpaperPicker';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const tabs = ['Profile', 'Models', 'Chat', 'Appearance', 'Data'] as const;
type Tab = typeof tabs[number];

const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const {
    user, updateUser, modelPrompts, setModelPrompt, language, setLanguage,
    fontSize, setFontSize, sendOnEnter, setSendOnEnter,
    showTimestamps, setShowTimestamps, compactMode, setCompactMode,
    soundEnabled, setSoundEnabled, autoScroll, setAutoScroll,
    personas, addPersona, removePersona, customThemeId, setCustomThemeId,
    wallpaper, setWallpaper, autoDarkMode, setAutoDarkMode,
    notificationsEnabled, setNotificationsEnabled, ttsEnabled, setTtsEnabled,
    notificationMode, setNotificationMode,
    memories, addMemory, removeMemory,
  } = useAppStore();

  const [tab, setTab] = useState<Tab>('Profile');
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [hobbies, setHobbies] = useState(user?.hobbies || '');
  const [lang, setLang] = useState(language);
  const [editingModel, setEditingModel] = useState<AIModel>('anson67');
  const [promptText, setPromptText] = useState('');
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaPrompt, setNewPersonaPrompt] = useState('');
  const [newMemory, setNewMemory] = useState('');

  useEffect(() => {
    if (open && user) {
      setName(user.name); setAge(user.age); setGender(user.gender); setHobbies(user.hobbies); setLang(language);
    }
  }, [open]);

  useEffect(() => {
    setPromptText(modelPrompts[editingModel] || SYSTEM_PROMPTS[editingModel] || '');
  }, [editingModel, open]);

  // Auto dark mode
  useEffect(() => {
    if (autoDarkMode) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => useAppStore.getState().setTheme(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      useAppStore.getState().setTheme(mq.matches ? 'dark' : 'light');
      return () => mq.removeEventListener('change', handler);
    }
  }, [autoDarkMode]);

  const handleSaveProfile = () => { updateUser({ name, age, gender, hobbies }); setLanguage(lang); onClose(); };
  const handleSavePrompt = () => setModelPrompt(editingModel, promptText);
  const handleResetPrompt = () => { setPromptText(SYSTEM_PROMPTS[editingModel] || ''); setModelPrompt(editingModel, ''); };
  const handleResetAll = () => { if (confirm('Delete ALL data?')) { localStorage.clear(); window.location.reload(); } };

  const handleAddPersona = () => {
    if (newPersonaName.trim() && newPersonaPrompt.trim()) {
      addPersona({ id: Date.now().toString(), name: newPersonaName.trim(), icon: '🤖', prompt: newPersonaPrompt.trim() });
      setNewPersonaName(''); setNewPersonaPrompt('');
    }
  };

  const handleAddMemory = () => {
    if (newMemory.trim()) { addMemory(newMemory.trim()); setNewMemory(''); }
  };

  const handleExportPDF = () => {
    const state = useAppStore.getState();
    const convo = state.conversations.find(c => c.id === state.activeConversationId);
    if (!convo) return;
    const content = convo.messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.text || '[Image]'}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${convo.name}.txt`; a.click();
  };

  const { customFont, setCustomFont } = useAppStore();

  const inputClass = "w-full mt-1 px-3 py-2 bg-muted rounded-lg outline-none border border-transparent focus:border-muted-foreground/30 text-sm";
  const modelIcons: Record<AIModel, any> = { anson67: Ghost, gemini: Cpu, chester: Skull };
  const modelNames: Record<AIModel, string> = { anson67: 'Anson67', gemini: 'Gemini', chester: 'Chester' };

  const toggleItem = (label: string, value: boolean, setter: (v: boolean) => void) => (
    <div key={label} className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      <button onClick={() => setter(!value)}
        className={`w-10 h-6 rounded-full transition-colors relative ${value ? 'bg-primary' : 'bg-muted border border-border'}`}>
        <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-transform ${value ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  );

  const allWallpapers = [...WALLPAPERS, ...EXTRA_WALLPAPERS];
  const GOOGLE_FONTS_QUICK = ['Inter', 'JetBrains Mono', 'Space Grotesk', 'DM Sans', 'Outfit', 'Sora', 'Plus Jakarta Sans', 'Manrope', 'Playfair Display', 'Lora', 'Fira Code', 'Rubik'];

  const handleFontSelect = (fontName: string) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
    document.body.style.fontFamily = `'${fontName}', system-ui, sans-serif`;
    setCustomFont(fontName);
  };

  const AppearanceTab = () => (
    <div className="space-y-5">
      {/* Theme Presets */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-1">
          <Palette className="w-3 h-3" /> Theme
        </label>
        <div className="grid grid-cols-4 gap-2">
          {THEME_PRESETS.map(t => (
            <button key={t.id} onClick={() => setCustomThemeId(t.id)}
              className={`p-2 rounded-xl border text-center transition-all ${customThemeId === t.id ? 'ring-2 ring-ring border-transparent' : 'border-border hover:border-muted-foreground/30'}`}>
              <div className="w-full h-6 rounded-lg mb-1" style={{ background: `hsl(${t.bg})` }}>
                <div className="w-3 h-3 rounded-full ml-auto mr-1 mt-0.5" style={{ background: `hsl(${t.primary})` }} />
              </div>
              <span className="text-[9px] font-bold">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Picker */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-1">
          <Type className="w-3 h-3" /> Font — <span className="normal-case text-foreground">{customFont}</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {GOOGLE_FONTS_QUICK.map(f => (
            <button key={f} onClick={() => handleFontSelect(f)}
              className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all text-left ${
                customFont === f ? 'bg-primary/10 border border-primary/30 text-foreground' : 'bg-muted hover:bg-accent text-muted-foreground border border-transparent'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Wallpaper */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-1">
          <Image className="w-3 h-3" /> Chat Wallpaper
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {allWallpapers.map(w => (
            <button key={w.id} onClick={() => setWallpaper(w.id)}
              className={`rounded-xl border text-center transition-all h-12 flex items-center justify-center ${
                wallpaper === w.id ? 'ring-2 ring-ring border-transparent' : 'border-border hover:border-muted-foreground/30'}`}
              style={w.css ? { backgroundImage: w.css, backgroundSize: w.id === 'dots' || w.id === 'grid' ? '20px 20px' : w.id === 'stars' ? '150px 100px' : undefined } : {}}>
              <span className="text-[8px] font-bold bg-card/80 px-1 py-0.5 rounded">{w.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card p-6 rounded-3xl shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Settings</h2>

            <div className="flex gap-1 bg-muted p-1 rounded-lg mb-5 overflow-x-auto">
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Profile */}
            {tab === 'Profile' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Nickname</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass + ' appearance-none'}>
                      <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Hobbies</label>
                  <input value={hobbies} onChange={(e) => setHobbies(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">App Language</label>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className={inputClass + ' appearance-none'}>
                    <option value="en">English</option><option value="zh">Chinese (Traditional)</option>
                    <option value="ja">Japanese</option><option value="ko">Korean</option>
                  </select>
                </div>

                {/* AI Memory */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-1">
                    <Brain className="w-3 h-3" /> AI Memory
                  </label>
                  <p className="text-[9px] text-muted-foreground mb-2">Facts the AI remembers about you across sessions</p>
                  <div className="space-y-1 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
                    {memories.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted px-2 py-1 rounded-lg">
                        <span className="text-xs truncate flex-1">{m}</span>
                        <button onClick={() => removeMemory(i)} className="text-muted-foreground hover:text-destructive p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newMemory} onChange={(e) => setNewMemory(e.target.value)} placeholder="e.g. I prefer Python"
                      className={inputClass} onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()} />
                    <button onClick={handleAddMemory} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shrink-0">+</button>
                  </div>
                </div>

                <button onClick={handleSaveProfile}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] transition-transform">
                  Save Profile
                </button>
              </div>
            )}

            {/* Models */}
            {tab === 'Models' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block">Select Model</label>
                  <div className="flex gap-2">
                    {(['anson67', 'gemini', 'chester'] as AIModel[]).map(m => {
                      const Icon = modelIcons[m];
                      return (
                        <button key={m} onClick={() => setEditingModel(m)}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            editingModel === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:bg-accent'}`}>
                          <Icon className="w-4 h-4" /> {modelNames[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">System Prompt for {modelNames[editingModel]}</label>
                  <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={6}
                    className={inputClass + ' custom-scrollbar resize-none font-mono text-xs'} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSavePrompt} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold">Save</button>
                  <button onClick={handleResetPrompt} className="px-4 py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-accent">Reset</button>
                </div>

                {/* Custom Personas */}
                <div className="border-t border-border pt-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-1">
                    <Users className="w-3 h-3" /> Custom Personas
                  </label>
                  <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                    {personas.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg">
                        <div>
                          <span className="text-xs font-bold">{p.icon} {p.name}</span>
                          <p className="text-[9px] text-muted-foreground truncate max-w-[200px]">{p.prompt}</p>
                        </div>
                        <button onClick={() => removePersona(p.id)} className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input value={newPersonaName} onChange={(e) => setNewPersonaName(e.target.value)} placeholder="Persona name"
                    className={inputClass + ' mb-2'} />
                  <textarea value={newPersonaPrompt} onChange={(e) => setNewPersonaPrompt(e.target.value)} placeholder="System prompt..."
                    rows={2} className={inputClass + ' resize-none mb-2'} />
                  <button onClick={handleAddPersona} className="w-full py-2 bg-muted hover:bg-accent rounded-lg text-xs font-bold">
                    + Add Persona
                  </button>
                </div>
              </div>
            )}

            {/* Chat */}
            {tab === 'Chat' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Font Size</label>
                  <div className="flex gap-2 mt-1">
                    {(['sm', 'base', 'lg'] as const).map(s => (
                      <button key={s} onClick={() => setFontSize(s)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${fontSize === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}`}>
                        {s === 'sm' ? 'Small' : s === 'base' ? 'Medium' : 'Large'}
                      </button>
                    ))}
                  </div>
                </div>
                {toggleItem('Send on Enter', sendOnEnter, setSendOnEnter)}
                {toggleItem('Show Timestamps', showTimestamps, setShowTimestamps)}
                {toggleItem('Compact Mode', compactMode, setCompactMode)}
                {toggleItem('Sound Effects', soundEnabled, setSoundEnabled)}
                {toggleItem('Auto Scroll', autoScroll, setAutoScroll)}
                {toggleItem('Text-to-Speech', ttsEnabled, setTtsEnabled)}
                {toggleItem('Notifications', notificationsEnabled, async (v) => {
                  setNotificationsEnabled(v);
                  if (v) {
                    if ('Notification' in window) await Notification.requestPermission();
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.id) {
                      await subscribeToPush(session.user.id);
                    }
                  } else {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.id) {
                      await unsubscribeFromPush(session.user.id);
                    }
                  }
                })}
                {notificationsEnabled && (
                  <div className="pl-2 pb-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block flex items-center gap-1">
                      <Bell className="w-3 h-3" /> When to notify
                    </label>
                    <div className="flex flex-col gap-1">
                      {([
                        { value: 'every' as const, label: 'Every message', desc: 'Get notified for every AI response' },
                        { value: 'inactive' as const, label: 'Only when inactive', desc: 'Only when the app is in background' },
                        { value: 'never' as const, label: 'Never', desc: 'Disable all notifications' },
                      ]).map(opt => (
                        <button key={opt.value} onClick={() => setNotificationMode(opt.value)}
                          className={`text-left px-3 py-2 rounded-lg border transition-all ${
                            notificationMode === opt.value
                              ? 'bg-primary/10 border-primary/30 text-foreground'
                              : 'bg-muted border-transparent text-muted-foreground hover:bg-accent'
                          }`}>
                          <span className="text-xs font-bold block">{opt.label}</span>
                          <span className="text-[9px] text-muted-foreground">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {toggleItem('Auto Dark Mode', autoDarkMode, setAutoDarkMode)}

                {/* Keyboard shortcuts reference */}
                <div className="bg-muted p-3 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">⌨️ Shortcuts</span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {[
                      ['Ctrl+K', 'Search'],
                      ['Ctrl+N', 'New Chat'],
                      ['Ctrl+B', 'Sidebar'],
                      ['Ctrl+Shift+F', 'Focus Mode'],
                      ['Ctrl+/', 'Templates'],
                      ['Escape', 'Close'],
                    ].map(([key, desc]) => (
                      <div key={key} className="flex justify-between">
                        <kbd className="bg-background px-1.5 py-0.5 rounded font-mono text-muted-foreground">{key}</kbd>
                        <span className="text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Appearance */}
            {tab === 'Appearance' && (
              <AppearanceTab />
            )}

            {/* Data */}
            {tab === 'Data' && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-xl border border-border">
                  <h4 className="text-sm font-bold mb-1">Storage Usage</h4>
                  <p className="text-xs text-muted-foreground">
                    {useAppStore.getState().conversations.length} conversations stored locally
                  </p>
                </div>
                <button onClick={() => {
                  const data = JSON.stringify({ conversations: useAppStore.getState().conversations, user: useAppStore.getState().user, memories: useAppStore.getState().memories });
                  const blob = new Blob([data], { type: 'application/json' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'theaitwins-backup.json'; a.click();
                }} className="w-full py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-accent transition-colors">
                  📦 Export All Data
                </button>
                <button onClick={handleExportPDF} className="w-full py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-accent transition-colors">
                  🖨️ Export Current Chat
                </button>
                <button onClick={() => {
                  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          if (data.conversations) localStorage.setItem('tat_convos', JSON.stringify(data.conversations));
                          if (data.user) localStorage.setItem('tat_user', JSON.stringify(data.user));
                          if (data.memories) localStorage.setItem('tat_memories', JSON.stringify(data.memories));
                          window.location.reload();
                        } catch { alert('Invalid file'); }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }} className="w-full py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-accent transition-colors">
                  📥 Import Data
                </button>
                <button onClick={handleResetAll}
                  className="w-full py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Reset All Data
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
