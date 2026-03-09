import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Users, Copy, Link, Ghost, Cpu, Skull, Settings, LogOut, Heart, ImageIcon, X, Mic, MicOff, Square, Circle, Loader2 } from 'lucide-react';
import VoiceChat from '@/components/VoiceChat';
import MentionDropdown from '@/components/MentionDropdown';
import GroupSettings from '@/components/GroupSettings';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '@/lib/store';
import { SYSTEM_PROMPTS } from '@/lib/prompts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

type GroupMessage = {
  id: string;
  group_id: string;
  user_id: string | null;
  content: string;
  is_ai: boolean;
  ai_model: string;
  created_at: string;
};

type Member = {
  user_id: string;
  role: string;
  display_name: string;
  email: string;
  avatar_url?: string | null;
};

const GroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Speech recognition setup
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
        setInput(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    return () => { recognitionRef.current?.stop(); };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    init().then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [groupId]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  // Handle @ mention detection
  useEffect(() => {
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = input.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
    setMentionQuery('');
  }, [input]);

  const loadMembers = async () => {
    if (!groupId) return;
    const { data: memberRows, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, role')
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Error loading members:', membersError);
      return;
    }

    if (memberRows && memberRows.length > 0) {
      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', userIds);

      const membersWithProfiles = memberRows.map(m => {
        const profile = profiles?.find(p => p.id === m.user_id);
        return {
          user_id: m.user_id,
          role: m.role || 'member',
          display_name: profile?.display_name || 'Unknown',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || null,
        };
      });
      setMembers(membersWithProfiles);
    } else {
      setMembers([]);
    }
  };

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    setUserId(user.id);

    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!group) { navigate('/groups'); return; }
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setGroupAvatarUrl(group.avatar_url || null);
    setInviteCode(group.invite_code);

    const { data: msgs } = await supabase.from('group_messages').select('*').eq('group_id', groupId).order('created_at');
    if (msgs) setMessages(msgs);

    await loadMembers();
    setLoading(false);

    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const newMsg = payload.new as GroupMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => { loadMembers(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const reloadGroup = async () => {
    if (!groupId || !userId) return;
    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (group) {
      setGroupName(group.name);
      setGroupDescription(group.description || '');
      setGroupAvatarUrl(group.avatar_url || null);
    }
    await loadMembers();
  };

  const isOwner = members.some(m => m.user_id === userId && m.role === 'owner');

  const handleMentionSelect = (mentionName: string) => {
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newInput = input.slice(0, lastAtIndex) + '@' + mentionName + ' ';
      setInput(newInput);
    }
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const r = new FileReader();
      r.onloadend = () => setImageData(r.result as string);
      r.readAsDataURL(f);
    }
  };

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
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
        // Use transcription from speech recognition if available
        if (input.trim()) {
          // Text is already set via speech recognition
        }
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const sendMessage = async () => {
    if ((!input.trim() && !imageData) || !userId || !groupId || sending) return;
    const text = input.trim();
    const img = imageData;
    setInput('');
    setImageData(null);
    setSending(true);

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    // Build content with image if present
    let content = text;
    if (img) {
      content = img + (text ? '\n' + text : '');
    }

    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const optimisticMsg: GroupMessage = {
      id: optimisticId,
      group_id: groupId,
      user_id: userId,
      content,
      is_ai: false,
      ai_model: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data: inserted } = await supabase.from('group_messages').insert({ group_id: groupId, user_id: userId, content }).select().single();
    if (inserted) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? inserted as GroupMessage : m));
    }

    // Check for @mentions of users → send notifications
    const userMentionRegex = /@(\w+)/gi;
    const allMentions = text.match(userMentionRegex) || [];
    for (const mention of allMentions) {
      const mentionName = mention.slice(1).toLowerCase();
      if (['anson67', 'gemini', 'chester', 'bobby', 'max'].includes(mentionName)) continue;
      const mentionedMember = members.find(m => m.display_name?.toLowerCase() === mentionName);
      if (mentionedMember && mentionedMember.user_id !== userId) {
        await supabase.rpc('insert_mention_notification', {
          _user_id: mentionedMember.user_id,
          _title: `${getMemberName(userId)} mentioned you`,
          _body: text.length > 100 ? text.slice(0, 100) + '...' : text,
          _link: `/group/${groupId}`,
        });
      }
    }

    // Check for @mentions of AI models
    const mentionRegex = /@(anson67|gemini|chester|bobby|max)/gi;
    const mentions = text.match(mentionRegex);

    if (mentions) {
      for (const mention of mentions) {
        const modelName = mention.slice(1).toLowerCase();
        try {
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: text.replace(mentionRegex, '').trim() }],
              systemPrompt: getModelPrompt(modelName),
              mode: 'fast',
            }),
          });

          if (resp.ok && resp.body) {
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let idx;
              while ((idx = buffer.indexOf('\n')) !== -1) {
                let line = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                if (line.endsWith('\r')) line = line.slice(0, -1);
                if (!line.startsWith('data: ')) continue;
                const json = line.slice(6).trim();
                if (json === '[DONE]') break;
                try {
                  const p = JSON.parse(json);
                  const c = p.choices?.[0]?.delta?.content;
                  if (c) fullText += c;
                } catch {}
              }
            }
            if (fullText) {
              await supabase.from('group_messages').insert({
                group_id: groupId,
                user_id: null,
                content: fullText,
                is_ai: true,
                ai_model: modelName,
              });
            }
          }
        } catch (err) {
          console.error('AI error:', err);
        }
      }
    }

    setSending(false);
  };

  const getModelPrompt = (model: string) => {
    const { globalPrompts } = useAppStore.getState();
    return globalPrompts[model] || SYSTEM_PROMPTS[model] || 'You are a helpful AI assistant.';
  };

  const getModelIcon = (model: string) => {
    if (model === 'anson67') return <Ghost className="w-4 h-4" />;
    if (model === 'chester') return <Skull className="w-4 h-4" />;
    if (model === 'bobby') return <Heart className="w-4 h-4" />;
    return <Cpu className="w-4 h-4" />;
  };

  const getMemberName = (uid: string | null) => {
    if (!uid) return 'AI';
    const m = members.find(m => m.user_id === uid);
    return m?.display_name || 'Unknown';
  };

  const getMemberAvatar = (uid: string | null) => {
    if (!uid) return null;
    const m = members.find(m => m.user_id === uid);
    return m?.avatar_url || null;
  };

  const copyInvite = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied!' });
  };

  const leaveGroup = async () => {
    if (!groupId || !userId || isOwner || leaving) return;
    const confirmed = window.confirm('Leave this group? You can rejoin later using an invite link.');
    if (!confirmed) return;
    setLeaving(true);
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) {
      toast({ title: 'Failed to leave group', description: error.message, variant: 'destructive' });
      setLeaving(false);
      return;
    }
    toast({ title: 'You left the group' });
    navigate('/groups');
  };

  const isImageData = (content: string) => content.startsWith('data:image/');
  const parseContent = (content: string) => {
    if (isImageData(content)) {
      const newlineIdx = content.indexOf('\n');
      if (newlineIdx === -1) return { image: content, text: '' };
      return { image: content.slice(0, newlineIdx), text: content.slice(newlineIdx + 1) };
    }
    return { image: null, text: content };
  };

  // Loading screen
  if (loading) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background">
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card shrink-0">
          <button onClick={() => navigate('/groups')} className="p-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card shrink-0">
        <button onClick={() => navigate('/groups')} className="p-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {groupAvatarUrl ? (
            <img src={groupAvatarUrl} alt={groupName} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{groupName[0]?.toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">{groupName}</h1>
            <p className="text-[10px] text-muted-foreground">{members.length} members</p>
          </div>
        </div>
        {isOwner && (
          <button onClick={() => setShowSettings(true)} className="p-1.5 text-muted-foreground hover:text-foreground" title="Group settings">
            <Settings className="w-4 h-4" />
          </button>
        )}
        {!isOwner && userId && (
          <button onClick={leaveGroup} disabled={leaving} className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50" title="Leave group">
            <LogOut className="w-4 h-4" />
          </button>
        )}
        <button onClick={copyInvite} className="p-1.5 text-muted-foreground hover:text-foreground" title="Copy invite link">
          <Link className="w-4 h-4" />
        </button>
        <button onClick={() => setShowMembers(!showMembers)} className="p-1.5 text-muted-foreground hover:text-foreground">
          <Users className="w-4 h-4" />
        </button>
      </header>

      {userId && groupId && (
        <div className="shrink-0 px-4 py-2 border-b border-border">
          <VoiceChat groupId={groupId} userId={userId} />
        </div>
      )}

      {showMembers && (
        <div className="border-b border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Members</p>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={m.avatar_url || ''} alt={m.display_name} />
                  <AvatarFallback className="text-[8px] font-bold bg-primary text-primary-foreground">
                    {(m.display_name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-medium">{m.display_name}</span>
                {m.role === 'owner' && <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded">owner</span>}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Invite code:</span>
            <code className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded">{inviteCode}</code>
            <button onClick={copyInvite} className="text-[10px] text-primary font-bold"><Copy className="w-3 h-3 inline" /> Copy Link</button>
          </div>
        </div>
      )}

      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Type <span className="font-mono bg-muted px-1 rounded">@</span> to mention AI or members</p>
        </div>
        {messages.map(msg => {
          const parsed = parseContent(msg.content);
          const avatarUrl = getMemberAvatar(msg.user_id);
          return (
            <div key={msg.id} className={`flex gap-2 ${msg.user_id === userId ? 'justify-end' : 'justify-start'}`}>
              {msg.user_id !== userId && (
                <Avatar className="w-7 h-7 shrink-0">
                  {msg.is_ai ? (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getModelIcon(msg.ai_model)}
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={avatarUrl || ''} alt={getMemberName(msg.user_id)} />
                      <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
                        {getMemberName(msg.user_id)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
              )}
              <div className={`max-w-[75%] ${msg.user_id === userId ? 'bg-primary text-primary-foreground' : msg.is_ai ? 'bg-card border border-border' : 'bg-muted'} rounded-2xl px-3 py-2`}>
                {msg.user_id !== userId && (
                  <p className={`text-[9px] font-bold mb-0.5 ${msg.is_ai ? 'text-primary' : 'text-muted-foreground'}`}>
                    {msg.is_ai ? msg.ai_model.toUpperCase() : getMemberName(msg.user_id)}
                  </p>
                )}
                {parsed.image && (
                  <img src={parsed.image} className="max-w-full max-h-[200px] rounded-xl mb-1 object-cover" alt="Shared" />
                )}
                {parsed.text && (
                  <div className="text-xs prose prose-sm max-w-none">
                    <ReactMarkdown>{parsed.text}</ReactMarkdown>
                  </div>
                )}
                <p className={`text-[8px] mt-1 ${msg.user_id === userId ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.user_id === userId && (
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={avatarUrl || ''} alt="You" />
                  <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                    {getMemberName(msg.user_id)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 p-3 border-t border-border bg-card relative">
        <MentionDropdown
          query={mentionQuery}
          members={members.map(m => ({ user_id: m.user_id, display_name: m.display_name }))}
          onSelect={handleMentionSelect}
          visible={showMentionDropdown}
        />

        {/* Image preview */}
        {imageData && (
          <div className="mb-2 relative inline-block">
            <img src={imageData} className="h-14 w-14 object-cover rounded-xl border border-border shadow-sm" alt="Preview" />
            <button onClick={() => { setImageData(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-1 shadow hover:scale-110 transition-transform">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-xl border border-destructive/30">
            <Circle className="w-3 h-3 text-destructive fill-destructive animate-pulse" />
            <span className="text-xs font-bold text-destructive">Recording {formatTime(recordingTime)}</span>
            <button onClick={stopRecording} className="ml-auto px-2 py-1 bg-destructive text-destructive-foreground rounded-lg text-[10px] font-bold">Stop</button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <button onClick={() => fileRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors shrink-0">
            <ImageIcon className="w-4 h-4" />
          </button>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImage} />

          {recognitionRef.current && (
            <button onClick={toggleVoice}
              className={`p-2 rounded-full transition-colors shrink-0 ${isListening ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
              title="Voice to text">
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {!isRecording && (
            <button onClick={startRecording} className="p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors shrink-0" title="Record voice">
              <Circle className="w-4 h-4" />
            </button>
          )}

          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) sendMessage();
              if (e.key === 'Escape') setShowMentionDropdown(false);
            }}
            placeholder={isListening ? 'Listening...' : isRecording ? 'Recording...' : 'Message... (@ to mention)'}
            className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary"
          />
          <button onClick={sendMessage} disabled={sending || (!input.trim() && !imageData)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && groupId && userId && (
        <GroupSettings
          groupId={groupId}
          groupName={groupName}
          groupDescription={groupDescription}
          groupAvatarUrl={groupAvatarUrl}
          members={members}
          userId={userId}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onUpdate={reloadGroup}
        />
      )}
    </div>
  );
};

export default GroupChat;
