/**
 * Live collaboration for the AI Workspace: Supabase presence channel that
 * broadcasts each person's cursor + the doc they are viewing.
 */
import { supabase } from '@/integrations/supabase/client';

export interface Peer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  docId?: string;
}

const COLORS = ['#f59e0b', '#ec4899', '#38bdf8', '#34d399', '#a78bfa', '#fb7185'];

export function joinWorkspace(
  room: string,
  me: { id: string; name: string },
  onPeers: (peers: Peer[]) => void,
) {
  const color = COLORS[Math.abs(hash(me.id)) % COLORS.length];
  const channel = supabase.channel(`workspace:${room}`, { config: { presence: { key: me.id } } });

  const sync = () => {
    const st = channel.presenceState() as Record<string, any[]>;
    const peers: Peer[] = Object.entries(st)
      .filter(([k]) => k !== me.id)
      .map(([k, v]) => ({ id: k, ...(v[0] || {}) }))
      .filter((p: any) => typeof p.x === 'number') as Peer[];
    onPeers(peers);
  };

  channel
    .on('presence', { event: 'sync' }, sync)
    .on('presence', { event: 'join' }, sync)
    .on('presence', { event: 'leave' }, sync)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ id: me.id, name: me.name, color, x: 50, y: 50 });
      }
    });

  let last = 0;
  const move = (x: number, y: number, docId?: string) => {
    const now = Date.now();
    if (now - last < 80) return;
    last = now;
    channel.track({ id: me.id, name: me.name, color, x, y, docId });
  };

  return {
    move,
    leave: () => supabase.removeChannel(channel),
    color,
  };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
