import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Users, Copy, Link, Ghost, Cpu, Skull, Settings, LogOut, Heart, ImageIcon, X, Mic, MicOff, Square, Circle, Loader2, Share2, Volume2, VolumeX, Check, Pin, Trash2, Sparkles, Reply, SmilePlus, Paperclip, FileText } from 'lucide-react';
import VoiceChat from '@/components/VoiceChat';
import MentionDropdown from '@/components/MentionDropdown';
import GroupSettings from '@/components/GroupSettings';
import ModelPicker, { getSelectedModel } from '@/components/ModelPicker';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '@/lib/store';
import { SYSTEM_PROMPTS } from '@/lib/prompts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

type GroupMessage = {
  id: string;
  group_id: string;
  user_id: string | null;
  content: string;
  is_ai: boolean;
  ai_model: string;
  created_at: string;
  reactions?: Record<string, string[]>;
  reply_to?: string | null;
  pinned?: boolean;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
};

type Member = {
  user_id: string;
  role: string;
  display_name: string;
  email: string;
  avatar_url?: string | null;
};

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👀', '🎉'];

const LinkEmbed = ({ url }: { url: string }) => {
  let displayUrl = url;
  try { displayUrl = new URL(url).hostname; } catch {}
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs hover:bg-primary/20 transition-colors break-all">
      <Link className="w-3 h-3 shrink-0" />
      {displayUrl}
    </a>
  );
};

const TypingBubble = ({ names }: { names: string[] }) => {
  if (names.length === 0) return null;
  const label = names.length <= 2 ? names.join(' and ') : `${names[0]} and ${names.length - 1} others`;
  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-2 py-1">
      <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">{label} typing...</span>
    </motion.div>
  );
};

const parseContentStatic = (content: string) => {
  if (content.startsWith('data:image/')) {
    const newlineIdx = content.indexOf('\n');
    if (newlineIdx === -1) return { image: content, text: '' };
    return { image: content.slice(0, newlineIdx), text: content.slice(newlineIdx + 1) };
  }
  return { image: null, text: content };
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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (e: any) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
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
    const { data: memberRows } = await supabase.from('group_members').select('user_id, role').eq('group_id', groupId);
    if (memberRows && memberRows.length > 0) {
      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, display_name, email, avatar_url').in('id', userIds);
      setMembers(memberRows.map(m => {
        const profile = profiles?.find(p => p.id === m.user_id);
        return {
          user_id: m.user_id,
          role: m.role || 'member',
          display_name: profile?.display_name || 'Unknown',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || null,
        };
      }));
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
    if (msgs) setMessages(msgs as GroupMessage[]);

    await loadMembers();
    setLoading(false);

    // Realtime messages
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const newMsg = payload.new as GroupMessage;
          setMessages(prev => {
            const withoutOptimistic = prev.filter(m => {
              if (m.user_id === newMsg.user_id && m.content === newMsg.content && m.id !== newMsg.id) return false;
              return m.id !== newMsg.id;
            });
            return [...withoutOptimistic, newMsg];
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const updated = payload.new as GroupMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => { loadMembers(); }
      )
      .subscribe();

    // Presence for typing
    const presenceChannel = supabase.channel(`presence-${groupId}`, { config: { presence: { key: user.id } } });
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const typing: string[] = [];
      for (const [uid, presences] of Object.entries(state)) {
        if (uid === user.id) continue;
        if ((presences as any[]).some((pr: any) => pr.typing)) typing.push(uid);
      }
      setTypingUsers(typing);
    });
    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await presenceChannel.track({ typing: false });
    });
    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  };

  const broadcastTyping = useCallback(() => {
    if (!presenceChannelRef.current) return;
    presenceChannelRef.current.track({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      presenceChannelRef.current?.track({ typing: false });
    }, 2000);
  }, []);

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
    if (lastAtIndex !== -1) setInput(input.slice(0, lastAtIndex) + '@' + mentionName + ' ');
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' });
        return;
      }
      setFileUpload(f);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      if (recognitionRef.current && !isListening) {
        try { recognitionRef.current.start(); setIsListening(true); } catch {}
      }
    } catch (err) { console.error('Failed to start recording:', err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Toggle reaction on a message
  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!userId) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] || [];
    if (users.includes(userId)) {
      reactions[emoji] = users.filter(u => u !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userId];
    }
    await supabase.from('group_messages').update({ reactions } as any).eq('id', msgId);
    setShowReactionPicker(null);
  };

  // Pin/unpin message
  const togglePin = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    await supabase.from('group_messages').update({ pinned: !msg.pinned } as any).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pinned: !m.pinned } : m));
  };

  const sendMessage = async () => {
    if ((!input.trim() && !imageData && !fileUpload) || !userId || !groupId || sending) return;
    const text = input.trim();
    const img = imageData;
    const file = fileUpload;
    setInput('');
    setImageData(null);
    setFileUpload(null);
    setSending(true);
    presenceChannelRef.current?.track({ typing: false });
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    // Upload file if present
    if (file) {
      setUploadingFile(true);
      const ext = file.name.split('.').pop();
      const path = `${groupId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('group_files').upload(path, file);
      setUploadingFile(false);
      if (uploadError) {
        toast({ title: 'File upload failed', description: uploadError.message, variant: 'destructive' });
        setSending(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('group_files').getPublicUrl(path);
      fileUrl = publicUrl;
      fileName = file.name;
      fileType = file.type;
    }

    let content = text;
    if (img) content = img + (text ? '\n' + text : '');

    const insertData: any = {
      group_id: groupId,
      user_id: userId,
      content: content || (fileName ? `📎 ${fileName}` : ''),
    };
    if (replyTo) insertData.reply_to = replyTo.id;
    if (fileUrl) {
      insertData.file_url = fileUrl;
      insertData.file_name = fileName;
      insertData.file_type = fileType;
    }

    await supabase.from('group_messages').insert(insertData);
    setReplyTo(null);

    // Handle @everyone
    if (text.toLowerCase().includes('@everyone')) {
      for (const member of members) {
        if (member.user_id !== userId) {
          await supabase.rpc('insert_mention_notification', {
            _user_id: member.user_id,
            _title: `${getMemberName(userId)} mentioned @everyone`,
            _body: text.length > 100 ? text.slice(0, 100) + '...' : text,
            _link: `/group/${groupId}`,
          });
        }
      }
    } else {
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
    }

    // AI mentions
    const mentionRegex = /@(anson67|gemini|chester|bobby|max)/gi;
    const mentions = text.match(mentionRegex);

    if (mentions) {
      const selectedModel = getSelectedModel();
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
              model: selectedModel.provider === 'lovable' ? selectedModel.modelId : undefined,
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
        } catch (err) { console.error('AI error:', err); }
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
    return members.find(m => m.user_id === uid)?.display_name || 'Unknown';
  };

  const getMemberAvatar = (uid: string | null) => {
    if (!uid) return null;
    return members.find(m => m.user_id === uid)?.avatar_url || null;
  };

  const getTypingNames = () => typingUsers.map(uid => getMemberName(uid)).filter(n => n !== 'Unknown');

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${inviteCode}`);
    toast({ title: 'Invite link copied!' });
  };

  const leaveGroup = async () => {
    if (!groupId || !userId || isOwner || leaving) return;
    if (!window.confirm('Leave this group?')) return;
    setLeaving(true);
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    if (error) { toast({ title: 'Failed to leave', variant: 'destructive' }); setLeaving(false); return; }
    toast({ title: 'You left the group' });
    navigate('/groups');
  };

  const renderText = (text: string, isUserMsg: boolean) => {
    const mentionRegex = /(@\w+)/g;
    const parts = text.split(mentionRegex);
    return parts.map((part, i) => {
      if (part.match(mentionRegex)) {
        return <span key={i} className={`font-bold ${isUserMsg ? 'text-primary-foreground/90' : 'text-primary'}`}>{part}</span>;
      }
      const linkParts = part.split(URL_REGEX);
      return linkParts.map((lp, j) => URL_REGEX.test(lp) ? <LinkEmbed key={`${i}-${j}`} url={lp} /> : lp);
    });
  };

  const getReplyMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId) || null;
  };

  const pinnedMessages = messages.filter(m => m.pinned);

  if (loading) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background">
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card shrink-0">
          <button onClick={() => navigate('/groups')} className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0 space-y-1.5"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-2.5 w-16" /></div>
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
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-2 bg-card shrink-0">
        <button onClick={() => navigate('/groups')} className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
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
        {pinnedMessages.length > 0 && (
          <button onClick={() => setShowPinnedMessages(!showPinnedMessages)} className="p-1.5 text-muted-foreground hover:text-foreground relative" title="Pinned messages">
            <Pin className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{pinnedMessages.length}</span>
          </button>
        )}
        {isOwner && <button onClick={() => setShowSettings(true)} className="p-1.5 text-muted-foreground hover:text-foreground" title="Settings"><Settings className="w-4 h-4" /></button>}
        {!isOwner && userId && <button onClick={leaveGroup} disabled={leaving} className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50" title="Leave"><LogOut className="w-4 h-4" /></button>}
        <button onClick={copyInvite} className="p-1.5 text-muted-foreground hover:text-foreground" title="Copy invite"><Link className="w-4 h-4" /></button>
        <button onClick={() => setShowMembers(!showMembers)} className="p-1.5 text-muted-foreground hover:text-foreground"><Users className="w-4 h-4" /></button>
      </header>

      {userId && groupId && (
        <div className="shrink-0 px-4 py-2 border-b border-border"><VoiceChat groupId={groupId} userId={userId} /></div>
      )}

      {/* Members panel */}
      {showMembers && (
        <div className="border-b border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Members</p>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={m.avatar_url || ''} alt={m.display_name} />
                  <AvatarFallback className="text-[8px] font-bold bg-primary text-primary-foreground">{(m.display_name || '?')[0].toUpperCase()}</AvatarFallback>
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

      {/* Pinned messages overlay */}
      <AnimatePresence>
        {showPinnedMessages && pinnedMessages.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-card overflow-hidden">
            <div className="px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned Messages</p>
                <button onClick={() => setShowPinnedMessages(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="text-xs bg-muted px-3 py-1.5 rounded-lg">
                    <span className="font-bold text-primary">{msg.is_ai ? msg.ai_model : getMemberName(msg.user_id)}: </span>
                    {parseContentStatic(msg.content).text.slice(0, 100)}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Type <span className="font-mono bg-muted px-1 rounded">@</span> to mention AI, members, or @everyone</p>
        </div>
        {messages.map(msg => {
          const parsed = parseContentStatic(msg.content);
          const avatarUrl = getMemberAvatar(msg.user_id);
          const isMe = msg.user_id === userId;
          const replyMsg = getReplyMessage(msg.reply_to);

          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} group`}>
              {!isMe && (
                <Avatar className="w-7 h-7 shrink-0">
                  {msg.is_ai ? (
                    <AvatarFallback className="bg-primary text-primary-foreground">{getModelIcon(msg.ai_model)}</AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={avatarUrl || ''} />
                      <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">{getMemberName(msg.user_id)[0]?.toUpperCase()}</AvatarFallback>
                    </>
                  )}
                </Avatar>
              )}
              <div className="flex flex-col max-w-[75%]">
                {/* Reply preview */}
                {replyMsg && (
                  <div className="mb-1 px-2 py-1 border-l-2 border-primary/50 bg-muted/50 rounded text-[10px] text-muted-foreground truncate">
                    <span className="font-bold">{replyMsg.is_ai ? replyMsg.ai_model : getMemberName(replyMsg.user_id)}</span>: {parseContentStatic(replyMsg.content).text.slice(0, 60)}
                  </div>
                )}

                {/* Pin indicator */}
                {msg.pinned && (
                  <div className="flex items-center gap-1 mb-0.5 text-[9px] text-primary">
                    <Pin className="w-2.5 h-2.5" /> Pinned
                  </div>
                )}

                <div className={`${isMe ? 'bg-primary text-primary-foreground' : msg.is_ai ? 'bg-card border border-border' : 'bg-muted'} rounded-2xl px-3 py-2`}>
                  {!isMe && (
                    <p className={`text-[9px] font-bold mb-0.5 ${msg.is_ai ? 'text-primary' : 'text-muted-foreground'}`}>
                      {msg.is_ai ? msg.ai_model.toUpperCase() : getMemberName(msg.user_id)}
                    </p>
                  )}
                  {parsed.image && <img src={parsed.image} className="max-w-full max-h-[200px] rounded-xl mb-1 object-cover" alt="Shared" />}
                  {msg.file_url && (
                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2 py-1.5 bg-background/20 rounded-lg mb-1 hover:bg-background/30 transition-colors">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium truncate">{msg.file_name || 'File'}</span>
                    </a>
                  )}
                  {parsed.text && (
                    msg.is_ai ? (
                      <div className="text-xs prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{parsed.text}</ReactMarkdown></div>
                    ) : (
                      <p className="text-xs whitespace-pre-wrap">{renderText(parsed.text, isMe)}</p>
                    )
                  )}
                  <p className={`text-[8px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Reactions display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${
                          (users as string[]).includes(userId || '') ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                        }`}>
                        <span>{emoji}</span>
                        <span className="font-bold">{(users as string[]).length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Action bar */}
                <div className="flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setReplyTo(msg)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Reply">
                    <Reply className="w-3 h-3" />
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="React">
                      <SmilePlus className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {showReactionPicker === msg.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowReactionPicker(null)} />
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute bottom-full left-0 mb-1 flex gap-0.5 bg-card border border-border rounded-full px-1.5 py-1 shadow-lg z-50">
                            {QUICK_REACTIONS.map(emoji => (
                              <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                className="w-6 h-6 flex items-center justify-center text-sm hover:scale-125 transition-transform">{emoji}</button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={() => togglePin(msg.id)} className={`p-1 rounded transition-colors ${msg.pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} title={msg.pinned ? 'Unpin' : 'Pin'}>
                    <Pin className="w-3 h-3" />
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(parsed.text); toast({ title: 'Copied!' }); }} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Copy">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {isMe && (
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={avatarUrl || ''} alt="You" />
                  <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">{getMemberName(msg.user_id)[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <TypingBubble names={getTypingNames()} />
      </div>

      {/* Input area */}
      <div className="shrink-0 p-3 border-t border-border bg-card relative">
        <MentionDropdown
          query={mentionQuery}
          members={members.map(m => ({ user_id: m.user_id, display_name: m.display_name }))}
          onSelect={handleMentionSelect}
          visible={showMentionDropdown}
        />

        {/* Reply preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mb-2 flex items-center gap-2 px-3 py-2 bg-muted rounded-xl border-l-2 border-primary">
              <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary">{replyTo.is_ai ? replyTo.ai_model : getMemberName(replyTo.user_id)}</p>
                <p className="text-[10px] text-muted-foreground truncate">{parseContentStatic(replyTo.content).text.slice(0, 80)}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File preview */}
        {fileUpload && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-muted rounded-xl">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-medium flex-1 truncate">{fileUpload.name}</span>
            <span className="text-[10px] text-muted-foreground">{(fileUpload.size / 1024).toFixed(0)}KB</span>
            <button onClick={() => setFileUpload(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
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

        {isRecording && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-xl border border-destructive/30">
            <Circle className="w-3 h-3 text-destructive fill-destructive animate-pulse" />
            <span className="text-xs font-bold text-destructive">Recording {formatTime(recordingTime)}</span>
            <button onClick={stopRecording} className="ml-auto px-2 py-1 bg-destructive text-destructive-foreground rounded-lg text-[10px] font-bold">Stop</button>
          </div>
        )}

        {/* Model picker row */}
        <div className="mb-2 flex items-center">
          <ModelPicker />
        </div>

        <div className="flex gap-2 items-end">
          <button onClick={() => fileRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors shrink-0" title="Image">
            <ImageIcon className="w-4 h-4" />
          </button>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImage} />

          <button onClick={() => docFileRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors shrink-0" title="Attach file">
            <Paperclip className="w-4 h-4" />
          </button>
          <input type="file" ref={docFileRef} className="hidden" accept="*/*" onChange={handleFileSelect} />

          {recognitionRef.current && (
            <button onClick={toggleVoice}
              className={`p-2 rounded-full transition-colors shrink-0 ${isListening ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}>
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {!isRecording && (
            <button onClick={startRecording} className="p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors shrink-0 hidden md:flex" title="Record">
              <Circle className="w-4 h-4" />
            </button>
          )}

          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); broadcastTyping(); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) sendMessage();
              if (e.key === 'Escape') { setShowMentionDropdown(false); setReplyTo(null); }
            }}
            placeholder={isListening ? 'Listening...' : isRecording ? 'Recording...' : replyTo ? 'Reply...' : 'Message... (@ to mention)'}
            className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary"
          />
          <button onClick={sendMessage} disabled={sending || uploadingFile || (!input.trim() && !imageData && !fileUpload)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 flex items-center gap-1">
            {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
