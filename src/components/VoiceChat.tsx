import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Participant = {
  id: string;
  user_id: string;
  is_muted: boolean;
  profiles?: { display_name: string } | null;
};

interface VoiceChatProps {
  groupId: string;
  userId: string;
}

const VoiceChat = ({ groupId, userId }: VoiceChatProps) => {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Load/subscribe to participants
  useEffect(() => {
    loadRoom();
    const channel = supabase
      .channel(`voice-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants' }, () => {
        loadParticipants();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  const loadRoom = async () => {
    const { data: room } = await supabase.from('voice_rooms').select('*').eq('group_id', groupId).single();
    if (room) {
      setRoomId(room.id);
      loadParticipantsForRoom(room.id);
    }
  };

  const loadParticipants = async () => {
    if (!roomId) { await loadRoom(); return; }
    loadParticipantsForRoom(roomId);
  };

  const loadParticipantsForRoom = async (rid: string) => {
    const { data } = await supabase
      .from('voice_participants')
      .select('id, user_id, is_muted')
      .eq('room_id', rid);
    if (data) {
      // Fetch display names
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
      const enriched = data.map(p => ({
        ...p,
        profiles: profiles?.find(pr => pr.id === p.user_id) || null,
      }));
      setParticipants(enriched);
      // Check if current user is in call
      setInCall(data.some(p => p.user_id === userId));
    }
  };

  const joinCall = useCallback(async () => {
    try {
      // Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create or get room
      let rid = roomId;
      if (!rid) {
        const { data: existing } = await supabase.from('voice_rooms').select('id').eq('group_id', groupId).single();
        if (existing) {
          rid = existing.id;
        } else {
          const { data: newRoom } = await supabase.from('voice_rooms').insert({ group_id: groupId, active: true }).select().single();
          if (newRoom) rid = newRoom.id;
        }
        setRoomId(rid);
      }

      if (!rid) return;

      // Join as participant
      await supabase.from('voice_participants').upsert({ room_id: rid, user_id: userId, is_muted: false }, { onConflict: 'room_id,user_id' });
      setInCall(true);
      setIsMuted(false);
      toast({ title: '🎙️ Joined voice chat' });
      loadParticipantsForRoom(rid);
    } catch (err) {
      console.error('Failed to join voice:', err);
      toast({ title: 'Microphone access required', variant: 'destructive' });
    }
  }, [groupId, userId, roomId]);

  const leaveCall = useCallback(async () => {
    // Stop mic
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (roomId) {
      await supabase.from('voice_participants').delete().eq('room_id', roomId).eq('user_id', userId);
    }
    setInCall(false);
    toast({ title: 'Left voice chat' });
    loadParticipants();
  }, [roomId, userId]);

  const toggleMute = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    }
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (roomId) {
      await supabase.from('voice_participants').update({ is_muted: newMuted }).eq('room_id', roomId).eq('user_id', userId);
    }
  }, [isMuted, roomId, userId]);

  if (participants.length === 0 && !inCall) {
    return (
      <button onClick={joinCall}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-xl text-[10px] font-bold hover:bg-green-500/30 transition-colors">
        <Phone className="w-3 h-3" /> Start Voice
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-400">Voice Active</span>
          <span className="text-[9px] text-muted-foreground">({participants.length})</span>
        </div>
        {inCall ? (
          <div className="flex gap-1">
            <button onClick={toggleMute}
              className={`p-1.5 rounded-lg text-[10px] font-bold ${isMuted ? 'bg-destructive/20 text-destructive' : 'bg-muted text-foreground'}`}>
              {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </button>
            <button onClick={leaveCall}
              className="p-1.5 bg-destructive/20 text-destructive rounded-lg">
              <PhoneOff className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button onClick={joinCall}
            className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-[10px] font-bold">
            Join
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {participants.map(p => (
          <div key={p.id} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg">
            <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[7px] font-bold">
              {(p.profiles?.display_name || '?')[0].toUpperCase()}
            </div>
            <span className="text-[9px] font-medium">{p.profiles?.display_name || 'User'}</span>
            {p.is_muted && <MicOff className="w-2.5 h-2.5 text-destructive" />}
            {p.user_id === userId && <span className="text-[7px] text-muted-foreground">(you)</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceChat;
