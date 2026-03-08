import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Key, Cpu, ArrowLeft, Trash2, Plus, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Profile = { id: string; email: string; display_name: string; created_at: string };
type Role = { user_id: string; role: string };
type Setting = { id: string; key: string; value: string; updated_at: string };

const AdminPanel = () => {
  const [tab, setTab] = useState<'users' | 'models' | 'settings'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin');
    if (!data || data.length === 0) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);
    setLoading(false);
    loadData();
  };

  const loadData = async () => {
    const [p, r, s] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
      supabase.from('admin_settings').select('*').order('key'),
    ]);
    if (p.data) setProfiles(p.data);
    if (r.data) setRoles(r.data);
    if (s.data) setSettings(s.data);
  };

  const toggleAdmin = async (userId: string) => {
    const hasAdmin = roles.some(r => r.user_id === userId && r.role === 'admin');
    if (hasAdmin) {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    }
    toast({ title: hasAdmin ? 'Admin removed' : 'Admin granted' });
    loadData();
  };

  const addSetting = async () => {
    if (!newKey.trim()) return;
    const { error } = await supabase.from('admin_settings').upsert({ key: newKey.trim(), value: newValue.trim() }, { onConflict: 'key' });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Setting saved' });
    setNewKey('');
    setNewValue('');
    loadData();
  };

  const deleteSetting = async (id: string) => {
    await supabase.from('admin_settings').delete().eq('id', id);
    toast({ title: 'Setting deleted' });
    loadData();
  };

  const checkApiKey = async (key: string, value: string) => {
    // Simple check: try a minimal request to the AI gateway
    if (key.toLowerCase().includes('api') || key.toLowerCase().includes('key')) {
      try {
        const resp = await fetch('https://ai.gateway.lovable.dev/v1/models', {
          headers: { Authorization: `Bearer ${value}` },
        });
        toast({ title: resp.ok ? '✅ API Key is valid' : '❌ API Key is invalid', variant: resp.ok ? 'default' : 'destructive' });
      } catch {
        toast({ title: '❌ Could not verify', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Not an API key setting' });
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!isAdmin) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Shield className="w-12 h-12 text-destructive" />
      <h1 className="text-xl font-bold">Access Denied</h1>
      <p className="text-sm text-muted-foreground">You need admin privileges to access this page.</p>
      <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">Go Back</button>
    </div>
  );

  const tabs = [
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'models' as const, label: 'Models & Keys', icon: Key },
    { id: 'settings' as const, label: 'Settings', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
        <button onClick={() => navigate('/')} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-sm">Admin Panel</h1>
      </header>

      <div className="flex border-b border-border bg-card">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {tab === 'users' && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold mb-3">All Users ({profiles.length})</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-bold">User</th>
                    <th className="text-left p-3 font-bold">Email</th>
                    <th className="text-left p-3 font-bold">Joined</th>
                    <th className="text-left p-3 font-bold">Roles</th>
                    <th className="p-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => {
                    const userRoles = roles.filter(r => r.user_id === p.id).map(r => r.role);
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                        <td className="p-3 font-medium">{p.display_name}</td>
                        <td className="p-3 text-muted-foreground">{p.email}</td>
                        <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {userRoles.map(r => (
                              <span key={r} className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{r}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => toggleAdmin(p.id)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold ${userRoles.includes('admin') ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>
                            {userRoles.includes('admin') ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'models' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">API Keys & Model Configuration</h2>
            <p className="text-xs text-muted-foreground">Add custom API keys or model settings. These are stored securely in the database.</p>

            <div className="flex gap-2">
              <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key name (e.g. OPENAI_API_KEY)"
                className="flex-1 px-3 py-2 bg-card border border-border rounded-xl text-xs outline-none focus:border-primary" />
              <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Value"
                className="flex-1 px-3 py-2 bg-card border border-border rounded-xl text-xs outline-none focus:border-primary" />
              <button onClick={addSetting} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            <div className="space-y-2">
              {settings.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">{s.key}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-mono">{s.value.slice(0, 20)}{'•'.repeat(Math.max(0, s.value.length - 20))}</p>
                  </div>
                  <button onClick={() => checkApiKey(s.key, s.value)} className="px-2 py-1 bg-muted rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground">
                    <CheckCircle className="w-3 h-3" />
                  </button>
                  <button onClick={() => deleteSetting(s.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {settings.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No settings configured yet.</p>}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-card border border-border rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Users</p>
                <p className="text-2xl font-black">{profiles.length}</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Admin Users</p>
                <p className="text-2xl font-black">{roles.filter(r => r.role === 'admin').length}</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">API Keys</p>
                <p className="text-2xl font-black">{settings.length}</p>
              </div>
            </div>
            <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
