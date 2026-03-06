import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Trash2, Ghost, Cpu, Skull } from 'lucide-react';
import { useAppStore, type AIModel } from '@/lib/store';
import { SYSTEM_PROMPTS } from '@/lib/prompts';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const tabs = ['Profile', 'Models', 'Chat', 'Data'] as const;
type Tab = typeof tabs[number];

const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const {
    user, updateUser, modelPrompts, setModelPrompt, language, setLanguage,
    fontSize, setFontSize, sendOnEnter, setSendOnEnter,
    showTimestamps, setShowTimestamps, compactMode, setCompactMode,
    soundEnabled, setSoundEnabled, autoScroll, setAutoScroll,
  } = useAppStore();

  const [tab, setTab] = useState<Tab>('Profile');
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [hobbies, setHobbies] = useState(user?.hobbies || '');
  const [lang, setLang] = useState(language);

  const [editingModel, setEditingModel] = useState<AIModel>('anson67');
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setAge(user.age);
      setGender(user.gender);
      setHobbies(user.hobbies);
      setLang(language);
    }
  }, [open]);

  useEffect(() => {
    setPromptText(modelPrompts[editingModel] || SYSTEM_PROMPTS[editingModel] || '');
  }, [editingModel, open]);

  const handleSaveProfile = () => {
    updateUser({ name, age, gender, hobbies });
    setLanguage(lang);
    onClose();
  };

  const handleSavePrompt = () => {
    setModelPrompt(editingModel, promptText);
  };

  const handleResetPrompt = () => {
    setPromptText(SYSTEM_PROMPTS[editingModel] || '');
    setModelPrompt(editingModel, '');
  };

  const handleResetAll = () => {
    if (confirm('Are you sure? This will delete ALL data and restart the app.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const inputClass = "w-full mt-1 px-3 py-2 bg-muted rounded-lg outline-none border border-transparent focus:border-muted-foreground/30 text-sm";

  const modelIcons: Record<AIModel, any> = { anson67: Ghost, gemini: Cpu, chester: Skull };
  const modelNames: Record<AIModel, string> = { anson67: 'Anson67', gemini: 'Gemini', chester: 'Chester' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card p-6 rounded-3xl shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Settings</h2>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg mb-5">
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Profile Tab */}
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
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
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
                    <option value="en">English</option>
                    <option value="zh">Chinese (Traditional)</option>
                  </select>
                </div>
                <button onClick={handleSaveProfile}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] transition-transform">
                  Save Profile
                </button>
              </div>
            )}

            {/* Models Tab */}
            {tab === 'Models' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block">Select Model to Edit</label>
                  <div className="flex gap-2">
                    {(['anson67', 'gemini', 'chester'] as AIModel[]).map(m => {
                      const Icon = modelIcons[m];
                      return (
                        <button key={m} onClick={() => setEditingModel(m)}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            editingModel === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:bg-accent'
                          }`}>
                          <Icon className="w-4 h-4" /> {modelNames[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">System Prompt for {modelNames[editingModel]}</label>
                  <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={8}
                    className={inputClass + ' custom-scrollbar resize-none font-mono text-xs'} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSavePrompt}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] transition-transform">
                    Save Prompt
                  </button>
                  <button onClick={handleResetPrompt}
                    className="px-4 py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-accent transition-colors">
                    Reset Default
                  </button>
                </div>
              </div>
            )}

            {/* Chat Tab */}
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
                {[
                  { label: 'Send on Enter', value: sendOnEnter, setter: setSendOnEnter },
                  { label: 'Show Timestamps', value: showTimestamps, setter: setShowTimestamps },
                  { label: 'Compact Mode', value: compactMode, setter: setCompactMode },
                  { label: 'Sound Effects', value: soundEnabled, setter: setSoundEnabled },
                  { label: 'Auto Scroll', value: autoScroll, setter: setAutoScroll },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">{label}</span>
                    <button onClick={() => setter(!value)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${value ? 'bg-primary' : 'bg-muted border border-border'}`}>
                      <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-transform ${value ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Data Tab */}
            {tab === 'Data' && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-xl border border-border">
                  <h4 className="text-sm font-bold mb-1">Storage Usage</h4>
                  <p className="text-xs text-muted-foreground">
                    {useAppStore.getState().conversations.length} conversations stored locally
                  </p>
                </div>
                <button onClick={() => {
                  const data = JSON.stringify({ conversations: useAppStore.getState().conversations, user: useAppStore.getState().user });
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'theaitwins-backup.json'; a.click();
                }}
                  className="w-full py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-accent transition-colors">
                  📦 Export All Data
                </button>
                <button onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          if (data.conversations) localStorage.setItem('tat_convos', JSON.stringify(data.conversations));
                          if (data.user) localStorage.setItem('tat_user', JSON.stringify(data.user));
                          window.location.reload();
                        } catch { alert('Invalid backup file'); }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                  className="w-full py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-accent transition-colors">
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
