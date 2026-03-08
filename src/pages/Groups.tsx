import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ArrowLeft, Link, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Group = { id: string; name: string; description: string; invite_code: string; created_at: string };

const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    setUserId(user.id);
    loadGroups(user.id);
  };

  const loadGroups = async (uid: string) => {
    const { data: memberOf } = await supabase.from('group_members').select('group_id').eq('user_id', uid);
    if (!memberOf || memberOf.length === 0) { setGroups([]); return; }
    const groupIds = memberOf.map(m => m.group_id);
    const { data } = await supabase.from('groups').select('*').in('id', groupIds).order('created_at', { ascending: false });
    if (data) setGroups(data);
  };

  const createGroup = async () => {
    if (!newName.trim() || !userId) return;
    const { data: group, error } = await supabase.from('groups').insert({ name: newName.trim(), description: newDesc.trim(), created_by: userId }).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    // Add self as owner
    await supabase.from('group_members').insert({ group_id: group.id, user_id: userId, role: 'owner' });
    toast({ title: 'Group created!' });
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    loadGroups(userId);
  };

  const joinGroup = async () => {
    if (!joinCode.trim() || !userId) return;
    const code = joinCode.trim();
    const { data: group } = await supabase.from('groups').select('id').eq('invite_code', code).single();
    if (!group) { toast({ title: 'Invalid code', variant: 'destructive' }); return; }
    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId });
    if (error) {
      if (error.code === '23505') { toast({ title: 'Already a member' }); navigate(`/group/${group.id}`); return; }
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Joined group!' });
    setShowJoin(false);
    setJoinCode('');
    loadGroups(userId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
        <button onClick={() => navigate('/')} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Users className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-sm flex-1">Groups</h1>
        <button onClick={() => setShowJoin(true)} className="px-3 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold flex items-center gap-1">
          <Link className="w-3 h-3" /> Join
        </button>
        <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1">
          <Plus className="w-3 h-3" /> Create
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {/* Create modal */}
        {showCreate && (
          <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
            <h3 className="text-sm font-bold">Create Group</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name"
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-muted rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={createGroup} className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">Create</button>
            </div>
          </div>
        )}

        {/* Join modal */}
        {showJoin && (
          <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
            <h3 className="text-sm font-bold">Join Group</h3>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Paste invite code"
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary" />
            <div className="flex gap-2">
              <button onClick={() => setShowJoin(false)} className="flex-1 py-2 bg-muted rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={joinGroup} className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">Join</button>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">No groups yet</h2>
            <p className="text-sm text-muted-foreground">Create a group or join one with an invite code.</p>
          </div>
        ) : (
          groups.map(g => (
            <button key={g.id} onClick={() => navigate(`/group/${g.id}`)}
              className="w-full p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{g.name}</h3>
                  {g.description && <p className="text-[10px] text-muted-foreground truncate">{g.description}</p>}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Copy className="w-3 h-3" />
                  <span className="font-mono">{g.invite_code}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Groups;
