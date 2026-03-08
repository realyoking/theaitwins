import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

const JoinGroup = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    joinByCode();
  }, [code]);

  const joinByCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }

    const { data: group } = await supabase.from('groups').select('id').eq('invite_code', code).single();
    if (!group) { toast({ title: 'Invalid invite code', variant: 'destructive' }); navigate('/groups'); return; }

    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
    if (error && error.code !== '23505') {
      toast({ title: 'Error joining', description: error.message, variant: 'destructive' });
      navigate('/groups');
      return;
    }

    toast({ title: 'Joined group!' });
    navigate(`/group/${group.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
};

export default JoinGroup;
