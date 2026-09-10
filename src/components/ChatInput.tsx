import { useState, useRef, useEffect } from 'react';
import { Send, ImageIcon, X, Zap, Mic, MicOff, Square, Circle, Sparkles, Reply, AudioLines, Paperclip, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { readDocument, docPromptBlock, prettySize, DOC_ACCEPT, type AttachedDoc } from '@/lib/documents';
import { useAppStore } from '@/lib/store';
import { sendChatMessage, abortChat } from '@/lib/chat-api';
import { executePlugin } from './PluginSystem';
import ModelPicker from './ModelPicker';
import EffortPicker from './EffortPicker';
import VoiceMode from './VoiceMode';
import SkillsModal from './SkillsModal';
import GifPicker from './GifPicker';
import { effortDef } from '@/lib/reasoning';
import { rememberGif } from '@/lib/gifs';

const ChatInput = () => {
  const { mode, setMode, isGenerating, addMessage, deductCredits, setIsGenerating, sendOnEnter, stopGenerating, trackMessage, model, plugins } = useAppStore();
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [replyQuote, setReplyQuote] = useState<string | null>(null);
  const [videoRef2, setVideoRef2] = useState<string | null>(null);
  const [docs, setDocs] = useState<AttachedDoc[]>([]);
  const [docBusy, setDocBusy] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cost = effortDef(mode as any).cost;

  // Attach / reply bus (from message bubbles)
  useEffect(() => {
    const onAttach = (e: Event) => {
      const { url, kind } = (e as CustomEvent).detail || {};
      if (kind === 'video') setVideoRef2(url);
      else setImageData(url);
      textareaRef.current?.focus();
    };
    const onReply = (e: Event) => {
      setReplyQuote(String((e as CustomEvent).detail || ''));
      textareaRef.current?.focus();
    };
    window.addEventListener('tat:attach', onAttach);
    window.addEventListener('tat:reply', onReply);
    return () => {
      window.removeEventListener('tat:attach', onAttach);
      window.removeEventListener('tat:reply', onReply);
    };
  }, []);


  // Speech recognition for live transcription
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (e: any) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setText(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Mic recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          addMessage({ role: 'user', text: '🎤 Voice message recorded', image: undefined });
          // Use speech recognition result if available
          if (text.trim()) {
            handleSendText(text.trim());
          }
        };
        reader.readAsDataURL(audioBlob);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

      // Also start speech recognition for transcription
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }
  };

  const handleStop = () => {
    abortChat();
    stopGenerating();
  };

  const handleSendText = async (userText: string) => {
    // Check for plugin commands first
    if (userText.startsWith('/')) {
      const result = executePlugin(userText, plugins);
      if (result) {
        addMessage({ role: 'user', text: userText });
        addMessage({ role: 'bot', text: result });
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = '20px';
        return;
      }
    }

    if (!deductCredits()) return;
    const quote = replyQuote;
    const vRef = videoRef2;
    const files = docs;
    const fileNote = files.length ? `\n\n📎 ${files.map((d) => d.name).join(', ')}` : '';
    addMessage({ role: 'user', text: userText + fileNote, image: imageData || undefined, replyTo: quote || undefined });
    setText('');
    setImageData(null);
    setReplyQuote(null);
    setVideoRef2(null);
    setDocs([]);
    if (docRef.current) docRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = '20px';
    setIsGenerating(true);
    trackMessage(model, mode);
    const payload = [
      quote ? `[Replying to this earlier message: "${quote}"]` : '',
      vRef ? `[The user is referring to this generated video: ${vRef}]` : '',
      docPromptBlock(files),
      userText,
    ].filter(Boolean).join('\n');
    await sendChatMessage(payload, imageData);
  };


  // Sending a GIF: post it, then let the AI actually look at it and reply.
  const handleSendGif = async (item: { url: string; title?: string }) => {
    if (isGenerating) return;
    if (!deductCredits()) return;
    addMessage({ role: 'user', type: 'gif', text: item.title || '', url: item.url } as any);
    setIsGenerating(true);
    trackMessage(model, mode);
    const caption = text.trim();
    if (caption) setText('');
    await sendChatMessage(
      [
        `[The user just sent you a GIF${item.title ? ` titled "${item.title}"` : ''}. Look at the attached frame from it, understand the reaction/joke it conveys, and reply naturally to it — do not wait for another message.]`,
        caption,
      ].filter(Boolean).join('\n'),
      item.url,
    );
  };

  const handleSend = async () => {
    if ((!text.trim() && !imageData && docs.length === 0) || isGenerating) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    await handleSendText(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sendOnEnter && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const r = new FileReader();
      r.onloadend = () => setImageData(r.result as string);
      r.readAsDataURL(f);
    }
  };

  const handleDocs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    setDocBusy(true);
    for (const f of list.slice(0, 4)) {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} is larger than 20 MB.`); continue; }
      try {
        const doc = await readDocument(f);
        setDocs((d) => [...d, doc]);
      } catch (err: any) {
        toast.error(err?.message || `Could not read ${f.name}`);
      }
    }
    setDocBusy(false);
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = '20px';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="shrink-0 p-2 md:p-4 md:px-20 bg-background/85 backdrop-blur-xl border-t border-border/60 z-20 safe-bottom">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center gap-2 mb-2 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <ModelPicker />
            <EffortPicker />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setShowVoice(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground bg-muted/70 px-2 py-1 rounded-full border border-border/60"
              title="Voice mode">
              <AudioLines className="w-3 h-3 text-primary" /> <span className="hidden sm:inline">Voice</span>
            </button>
            <button onClick={() => setShowSkills(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground bg-muted/70 px-2 py-1 rounded-full border border-border/60"
              title="Skills">
              <Sparkles className="w-3 h-3 text-amber-accent" /> <span className="hidden sm:inline">Skills</span>
            </button>
            <span className="hidden sm:flex text-[10px] font-bold text-muted-foreground bg-muted/70 px-2 py-1 rounded-full border border-border/60 items-center gap-1">
              {cost} <Zap className="w-3 h-3 text-amber-accent" />
            </span>
          </div>
        </div>

        {showSkills && <SkillsModal onClose={() => setShowSkills(false)} />}
        {showVoice && <VoiceMode onClose={() => setShowVoice(false)} />}
        {showGifs && (
          <GifPicker
            onClose={() => setShowGifs(false)}
            onPick={(item) => { rememberGif(item); handleSendGif(item); }}
          />
        )}

        {replyQuote && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border-l-2 border-primary">
            <Reply className="w-3 h-3 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate flex-1">{replyQuote}</span>
            <button onClick={() => setReplyQuote(null)}><X className="w-3 h-3" /></button>
          </div>
        )}

        {videoRef2 && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60">
            <span className="text-[11px] text-muted-foreground truncate flex-1">🎬 Video attached as reference</span>
            <button onClick={() => setVideoRef2(null)}><X className="w-3 h-3" /></button>
          </div>
        )}



        {imageData && (
          <div className="mb-2 relative inline-block">
            <img src={imageData} className="h-14 w-14 object-cover rounded-xl border border-border shadow-sm" alt="Preview" />
            <button onClick={() => { setImageData(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-1 shadow hover:scale-110 transition-transform">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {(docs.length > 0 || docBusy) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/70 border border-border/60 max-w-[220px]">
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-bold truncate">{d.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{prettySize(d.size)}</span>
                <button onClick={() => setDocs((x) => x.filter((y) => y.id !== d.id))}><X className="w-3 h-3" /></button>
              </div>
            ))}
            {docBusy && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/70 border border-border/60">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground">Reading file…</span>
              </div>
            )}
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-xl border border-destructive/30">
            <Circle className="w-3 h-3 text-destructive fill-destructive animate-pulse" />
            <span className="text-xs font-bold text-destructive">Recording {formatTime(recordingTime)}</span>
            <button onClick={stopRecording} className="ml-auto px-2 py-1 bg-destructive text-destructive-foreground rounded-lg text-[10px] font-bold">
              Stop
            </button>
          </div>
        )}

        <div className="bg-muted/70 backdrop-blur-xl rounded-[1.4rem] md:rounded-3xl border border-border/60 shadow-soft focus-within:ring-2 ring-primary/25 transition-all flex items-end p-1">
          <button onClick={() => fileRef.current?.click()}
            className="p-2 mb-0.5 ml-0.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors shrink-0">
            <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImage} />
          <button onClick={() => docRef.current?.click()} title="Attach a PDF, Word file or text file"
            className="p-2 mb-0.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors shrink-0">
            <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <input type="file" ref={docRef} className="hidden" multiple accept={DOC_ACCEPT} onChange={handleDocs} />

          <button onClick={() => setShowGifs(true)} title="Send a GIF"
            className="px-2 py-1.5 mb-0.5 text-[10px] font-black tracking-wide text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors shrink-0 border border-border/50">
            GIF
          </button>

          {/* Voice buttons - hidden on small screens for cleaner UI */}
          {recognitionRef.current && (
            <button onClick={toggleVoice}
              className={`p-2 mb-0.5 rounded-full transition-colors shrink-0 hidden md:flex ${isListening ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-card'}`}
              title="Voice to text">
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Mic recording button */}
          {!isRecording && (
            <button onClick={startRecording}
              className="p-2 mb-0.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors shrink-0 hidden md:flex"
              title="Record voice">
              <Circle className="w-4 h-4" />
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : isRecording ? 'Recording...' : 'Message...'}
            className="flex-1 bg-transparent border-none outline-none py-2 md:py-2.5 px-2 md:px-3 text-sm md:text-[15px] font-medium resize-none min-h-[20px] max-h-[120px] md:max-h-[150px] custom-scrollbar placeholder:text-muted-foreground/50"
            rows={1}
          />

          {isGenerating ? (
            <button onClick={handleStop}
              className="p-2 mb-0.5 mr-0.5 bg-destructive text-destructive-foreground rounded-full hover:scale-105 transition-all shrink-0">
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSend} disabled={!text.trim() && !imageData}
              className="p-2 mb-0.5 mr-0.5 bg-gradient-primary text-primary-foreground rounded-full shadow-glow hover:scale-105 disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 transition-all shrink-0">
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-center mt-1.5 gap-3">
          <span className="text-[9px] text-muted-foreground hidden md:block">
            {text.trim().split(/\s+/).filter(Boolean).length} words · {text.length} chars
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
