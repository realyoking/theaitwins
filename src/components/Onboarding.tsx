import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Gift } from 'lucide-react';
import { useAppStore } from '@/lib/store';

function generateReferralCode(name: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  while (code.length < 3) code += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const Onboarding = () => {
  const setUser = useAppStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [referredBy, setReferredBy] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const referralCode = generateReferralCode(name);
    setUser({
      name,
      initial: name.charAt(0).toUpperCase(),
      age,
      gender,
      hobbies,
      referralCode,
      referredBy: referredBy.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-card p-8 rounded-3xl shadow-2xl border border-border"
      >
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3 hover:rotate-0 transition-all">
          <Cpu className="text-primary-foreground w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Welcome to TheAiTwins</h1>
        <p className="text-muted-foreground text-xs text-center mb-6">Initialize your workspace profile</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Nickname</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full mt-1 px-4 py-3 bg-muted rounded-xl outline-none border border-transparent focus:border-muted-foreground/30 transition-all text-sm font-semibold"
              placeholder="How should I call you?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required
                className="w-full mt-1 px-4 py-3 bg-muted rounded-xl outline-none border border-transparent focus:border-muted-foreground/30 transition-all text-sm font-semibold"
                placeholder="e.g. 21" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} required
                className="w-full mt-1 px-4 py-3 bg-muted rounded-xl outline-none border border-transparent focus:border-muted-foreground/30 transition-all text-sm font-semibold appearance-none">
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Interests & Hobbies</label>
            <input value={hobbies} onChange={(e) => setHobbies(e.target.value)} required
              className="w-full mt-1 px-4 py-3 bg-muted rounded-xl outline-none border border-transparent focus:border-muted-foreground/30 transition-all text-sm font-semibold"
              placeholder="Coding, Gaming, Music..." />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-1">
              <Gift className="w-3 h-3" /> Referral Code <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input value={referredBy} onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
              maxLength={7}
              className="w-full mt-1 px-4 py-3 bg-muted rounded-xl outline-none border border-transparent focus:border-muted-foreground/30 transition-all text-sm font-semibold font-mono tracking-widest"
              placeholder="e.g. ANS4X7Q" />
            <p className="text-[9px] text-muted-foreground mt-1 ml-1">Got a friend's code? Enter it for bonus credits!</p>
          </div>
          <button type="submit" className="w-full py-3.5 mt-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-80 transition-opacity">
            Initialize Profile
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Onboarding;
