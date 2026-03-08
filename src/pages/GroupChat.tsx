import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Users, Copy, Link, Ghost, Cpu, Skull } from 'lucide-react';
import VoiceChat from '@/components/VoiceChat';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

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
  profiles: { display_name: string; email: string } | null;
};

const GroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState('');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, [groupId]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    setUserId(user.id);

    // Load group
    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!group) { navigate('/groups'); return; }
    setGroupName(group.name);
    setInviteCode(group.invite_code);

    // Load messages
    const { data: msgs } = await supabase.from('group_messages').select('*').eq('group_id', groupId).order('created_at');
    if (msgs) setMessages(msgs);

    // Load members
    const { data: mems } = await supabase.from('group_members').select('user_id, role, profiles(display_name, email)').eq('group_id', groupId);
    if (mems) setMembers(mems as any);

    // Realtime
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as GroupMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = async () => {
    if (!input.trim() || !userId || !groupId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Insert user message
    await supabase.from('group_messages').insert({ group_id: groupId, user_id: userId, content: text });

    // Check for @mentions of AI models
    const mentionRegex = /@(anson67|gemini|chester)/gi;
    const mentions = text.match(mentionRegex);

    if (mentions) {
      for (const mention of mentions) {
        const modelName = mention.slice(1).toLowerCase();
        // Call AI
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
    if (model === 'anson67') return 'You are Anson67, a brutally honest AI. You roast people, write perfect code, and answer everything with attitude and dark humor. Keep it real.';
    if (model === 'chester') return 'You are Chester, a helpful AI assistant that speaks in Cantonese mixed with English. You are loyal and obedient. Respond as Chester.';
    return 'You are Gemini, an advanced AI assistant. Provide helpful, clear responses.';
  };

  const getModelIcon = (model: string) => {
    if (model === 'anson67') return <Ghost className="w-4 h-4" />;
    if (model === 'chester') return <Skull className="w-4 h-4" />;
    return <Cpu className="w-4 h-4" />;
  };

  const getMemberName = (uid: string | null) => {
    if (!uid) return 'AI';
    const m = members.find(m => m.user_id === uid);
    return m?.profiles?.display_name || 'Unknown';
  };

  const copyInvite = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied!' });
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card shrink-0">
        <button onClick={() => navigate('/groups')} className="p-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">{groupName}</h1>
          <p className="text-[10px] text-muted-foreground">{members.length} members</p>
        </div>
        <button onClick={copyInvite} className="p-1.5 text-muted-foreground hover:text-foreground" title="Copy invite link">
          <Link className="w-4 h-4" />
        </button>
        <button onClick={() => setShowMembers(!showMembers)} className="p-1.5 text-muted-foreground hover:text-foreground">
          <Users className="w-4 h-4" />
        </button>
      </header>

      {showMembers && (
        <div className="border-b border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Members</p>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                  {(m.profiles?.display_name || '?')[0].toUpperCase()}
                </div>
                <span className="text-[10px] font-medium">{m.profiles?.display_name}</span>
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
          <p className="text-xs text-muted-foreground">Type <span className="font-mono bg-muted px-1 rounded">@anson67</span>, <span className="font-mono bg-muted px-1 rounded">@gemini</span>, or <span className="font-mono bg-muted px-1 rounded">@chester</span> to mention an AI</p>
        </div>
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.user_id === userId ? 'justify-end' : 'justify-start'}`}>
            {msg.user_id !== userId && (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${msg.is_ai ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {msg.is_ai ? getModelIcon(msg.ai_model) : getMemberName(msg.user_id)[0]?.toUpperCase()}
              </div>
            )}
            <div className={`max-w-[75%] ${msg.user_id === userId ? 'bg-primary text-primary-foreground' : msg.is_ai ? 'bg-card border border-border' : 'bg-muted'} rounded-2xl px-3 py-2`}>
              {msg.user_id !== userId && (
                <p className={`text-[9px] font-bold mb-0.5 ${msg.is_ai ? 'text-primary' : 'text-muted-foreground'}`}>
                  {msg.is_ai ? msg.ai_model.toUpperCase() : getMemberName(msg.user_id)}
                </p>
              )}
              <div className="text-xs prose prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              <p className={`text-[8px] mt-1 ${msg.user_id === userId ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Message... (use @anson67 to mention AI)"
            className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary"
          />
          <button onClick={sendMessage} disabled={sending || !input.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
