import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { user, updateUser, sysPromptOverride, setSysPromptOverride, language, setLanguage } = useAppStore();
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [hobbies, setHobbies] = useState(user?.hobbies || '');
  
  const [lang, setLang] = useState(language);
  const [sysPrompt, setSysPrompt] = useState(sysPromptOverride);

  // Sync form state when modal opens
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setAge(user.age);
      setGender(user.gender);
      setHobbies(user.hobbies);
      setLang(language);
      setSysPrompt(sysPromptOverride);
    }
  }, [open]);

  const handleSave = () => {
    updateUser({ name, age, gender, hobbies });
    setLanguage(lang);
    setSysPromptOverride(sysPrompt);
    onClose();
  };

  const handleResetAll = () => {
    if (confirm('Are you sure? This will delete ALL data and restart the app.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const inputClass = "w-full mt-1 px-3 py-2 bg-muted rounded-lg outline-none border border-transparent focus:border-muted-foreground/30 text-sm";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card p-6 rounded-3xl shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Settings</h2>

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
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Custom System Prompt</label>
                <textarea value={sysPrompt} onChange={(e) => setSysPrompt(e.target.value)} rows={3}
                  className={inputClass + ' custom-scrollbar resize-none'} placeholder="Leave empty for default persona..." />
              </div>
              <button onClick={handleSave}
                className="w-full py-2.5 mt-4 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] transition-transform">
                Save Changes
              </button>
              <button onClick={handleResetAll}
                className="w-full py-2.5 mt-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Reset All Data
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
