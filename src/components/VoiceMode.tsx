import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mic, MicOff, Square } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { sendChatMessage } from '@/lib/chat-api';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

/** ChatGPT-style hands-free voice conversation. */
const VoiceMode = ({ onClose }: { onClose: () => void }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const lastSpokenRef = useRef<string>('');
  const closedRef = useRef(false);

  const store = useAppStore;

  const speak = (text: string) =>
    new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window) || !text.trim()) return resolve();
      const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, ' code block ').slice(0, 700));
      u.rate = 1.03;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let finalText = '';
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setHeard(t);
      if (e.results[e.results.length - 1].isFinal) finalText = t;
    };
    rec.onend = async () => {
      if (closedRef.current) return;
      const said = (finalText || heard).trim();
      if (!said) { setPhase('idle'); return; }
      setPhase('thinking');
      const st = store.getState();
      st.addMessage({ role: 'user', text: said });
      st.setIsGenerating(true);
      await sendChatMessage(said);
      const after = store.getState();
      const convo = after.conversations.find((c) => c.id === after.activeConversationId);
      const reply = [...(convo?.messages || [])].reverse().find((m) => m.role === 'bot')?.text || '';
      if (closedRef.current) return;
      lastSpokenRef.current = reply;
      setPhase('speaking');
      await speak(reply);
      if (closedRef.current) return;
      setHeard('');
      setPhase('idle');
      if (!muted) setTimeout(() => { if (!closedRef.current) begin(); }, 400);
    };
    rec.onerror = () => setPhase('idle');
    recRef.current = rec;
    try { rec.start(); setPhase('listening'); } catch {}
  };

  const begin = () => { if (phase === 'idle') startListening(); };

  useEffect(() => {
    closedRef.current = false;
    startListening();
    return () => {
      closedRef.current = true;
      try { recRef.current?.stop(); } catch {}
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = () => {
    try { recRef.current?.stop(); } catch {}
    window.speechSynthesis?.cancel();
    setPhase('idle');
  };

  const label =
    phase === 'listening' ? 'Listening…' :
    phase === 'thinking' ? 'Thinking…' :
    phase === 'speaking' ? 'Speaking…' : 'Tap the orb to talk';

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 p-6">
      <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-muted hover:bg-accent">
        <X className="w-5 h-5" />
      </button>

      <button
        onClick={() => (phase === 'idle' ? begin() : stopAll())}
        className={`voice-orb w-44 h-44 rounded-full transition-transform duration-500 ${
          phase === 'listening' ? 'scale-110 animate-pulse' : phase === 'speaking' ? 'scale-105' : 'scale-100'
        }`}
      />

      <div className="text-center max-w-md">
        <div className="text-sm font-black shine-text">{label}</div>
        {heard && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">“{heard}”</p>}
        {!supported && <p className="text-xs text-destructive mt-2">Voice input isn’t supported in this browser.</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMuted((m) => !m)}
          className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 border border-border/60 ${muted ? 'bg-destructive/15 text-destructive' : 'bg-muted'}`}
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />} {muted ? 'Auto-listen off' : 'Auto-listen on'}
        </button>
        <button onClick={stopAll} className="px-4 py-2.5 rounded-full text-xs font-bold bg-muted border border-border/60 flex items-center gap-2">
          <Square className="w-3.5 h-3.5" /> Stop
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default VoiceMode;
