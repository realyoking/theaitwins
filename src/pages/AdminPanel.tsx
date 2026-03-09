import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, ArrowLeft, Trash2, Plus, RefreshCw, Megaphone, Cpu, Plug, Eye,
  ChevronLeft, MessageSquare, Settings, CreditCard, Upload, X, ToggleLeft, ToggleRight,
  Search, UserCheck, UserX, Edit, Save, ExternalLink, FileText, RotateCcw, Bell, Send,
  Ghost, Skull, Heart, User, Sandwich
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SYSTEM_PROMPTS } from '@/lib/prompts';

// ─── Types ───
type Profile = { id: string; email: string; display_name: string; avatar_url: string | null; created_at: string };
type Role = { user_id: string; role: string };
type UserSettings = { user_id: string; settings: any; credits: number; plan: string; is_pro: boolean };
type UserConvo = { user_id: string; conversation_id: string; name: string; model: string; messages: any[]; created_at: string; updated_at: string };
type Announcement = { id: string; title: string; subtitle: string; body: string; image_url: string | null; video_url: string | null; buttons: any[]; active: boolean; created_at: string };
type CustomModel = { id: string; name: string; model_id: string; description: string; icon: string; enabled: boolean; created_at: string };
type AdminPlugin = { id: string; name: string; description: string; icon: string; slash_command: string; code: string; enabled: boolean; created_at: string };

type Tab = 'dashboard' | 'users' | 'announcements' | 'notifications' | 'models' | 'prompts' | 'plugins';

const AdminPanel = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings[]>([]);
  const [userConvos, setUserConvos] = useState<UserConvo[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [models, setModels] = useState<CustomModel[]>([]);
  const [plugins, setPlugins] = useState<AdminPlugin[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // User detail view
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Announcement form
  const [announcementForm, setAnnouncementForm] = useState({ title: '', subtitle: '', body: '', image_url: '', video_url: '', buttons: [] as any[], active: true });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  // Model form
  const [modelForm, setModelForm] = useState({ name: '', model_id: '', description: '', icon: '🤖' });

  // Plugin form
  const [pluginForm, setPluginForm] = useState({ name: '', description: '', icon: '🔌', slash_command: '', code: '' });

  // Notification sender
  const [notiMode, setNotiMode] = useState<'everyone' | 'specific'>('everyone');
  const [notiTitle, setNotiTitle] = useState('');
  const [notiBody, setNotiBody] = useState('');
  const [notiLink, setNotiLink] = useState('');
  const [notiSelectedUsers, setNotiSelectedUsers] = useState<string[]>([]);
  const [notiSearchQuery, setNotiSearchQuery] = useState('');
  const [notiSending, setNotiSending] = useState(false);

  // Prompt editing
  const [promptModel, setPromptModel] = useState<'anson67' | 'gemini' | 'chester' | 'bobby'>('anson67');
  const [promptText, setPromptText] = useState('');
  const [promptsLoaded, setPromptsLoaded] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<Record<string, string>>({});

  const loadPrompts = async () => {
    const { data } = await supabase.from('admin_settings').select('key, value').like('key', 'prompt_%');
    const prompts: Record<string, string> = {};
    (data || []).forEach(row => { prompts[row.key.replace('prompt_', '')] = row.value; });
    setSavedPrompts(prompts);
    setPromptText(prompts[promptModel] || '');
    setPromptsLoaded(true);
  };

  useEffect(() => { checkAdmin(); }, []);

  useEffect(() => {
    if (tab === 'prompts' && !promptsLoaded && isAdmin) loadPrompts();
  }, [tab, isAdmin]);

  useEffect(() => {
    setPromptText(savedPrompts[promptModel] || '');
  }, [promptModel]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin');
    if (!data || data.length === 0) { setIsAdmin(false); setLoading(false); return; }
    setIsAdmin(true);
    setLoading(false);
    loadData();
  };

  const loadData = async () => {
    const [p, r, s, c, a, m, pl] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
      supabase.from('user_app_settings').select('*'),
      supabase.from('user_conversations').select('*').order('updated_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('custom_models').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_plugins').select('*').order('created_at', { ascending: false }),
    ]);
    if (p.data) setProfiles(p.data as Profile[]);
    if (r.data) setRoles(r.data as Role[]);
    if (s.data) setUserSettings(s.data as UserSettings[]);
    if (c.data) setUserConvos(c.data as UserConvo[]);
    if (a.data) setAnnouncements(a.data as Announcement[]);
    if (m.data) setModels(m.data as CustomModel[]);
    if (pl.data) setPlugins(pl.data as AdminPlugin[]);
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

  // ─── Credits/Plan management ───
  const updateUserCredits = async (userId: string, credits: number) => {
    await supabase.from('user_app_settings').upsert({ user_id: userId, credits, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    toast({ title: 'Credits updated' });
    loadData();
  };

  const updateUserPlan = async (userId: string, plan: string, is_pro: boolean) => {
    await supabase.from('user_app_settings').upsert({ user_id: userId, plan, is_pro, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    toast({ title: 'Plan updated' });
    loadData();
  };

  // ─── Announcements ───
  const saveAnnouncement = async () => {
    if (!announcementForm.title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (editingAnnouncementId) {
      await supabase.from('announcements').update({ ...announcementForm }).eq('id', editingAnnouncementId);
      toast({ title: 'Announcement updated' });
    } else {
      await supabase.from('announcements').insert({ ...announcementForm, created_by: user?.id });
      toast({ title: 'Announcement created' });
    }
    setAnnouncementForm({ title: '', subtitle: '', body: '', image_url: '', video_url: '', buttons: [], active: true });
    setEditingAnnouncementId(null);
    loadData();
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    toast({ title: 'Announcement deleted' });
    loadData();
  };

  const toggleAnnouncement = async (id: string, active: boolean) => {
    await supabase.from('announcements').update({ active: !active }).eq('id', id);
    loadData();
  };

  const editAnnouncement = (a: Announcement) => {
    setAnnouncementForm({ title: a.title, subtitle: a.subtitle, body: a.body, image_url: a.image_url || '', video_url: a.video_url || '', buttons: a.buttons || [], active: a.active });
    setEditingAnnouncementId(a.id);
  };

  const uploadAnnouncementFile = async (file: File, type: 'image' | 'video') => {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('announcements').upload(path, file);
    if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); return; }
    const { data: { publicUrl } } = supabase.storage.from('announcements').getPublicUrl(path);
    setAnnouncementForm(f => ({ ...f, [type === 'image' ? 'image_url' : 'video_url']: publicUrl }));
    toast({ title: `${type} uploaded` });
  };

  const addButton = () => {
    setAnnouncementForm(f => ({
      ...f,
      buttons: [...f.buttons, { text: 'Learn More', action: 'link', url: '', content: '' }]
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setAnnouncementForm(f => {
      const buttons = [...f.buttons];
      buttons[index] = { ...buttons[index], [field]: value };
      return { ...f, buttons };
    });
  };

  const removeButton = (index: number) => {
    setAnnouncementForm(f => ({ ...f, buttons: f.buttons.filter((_, i) => i !== index) }));
  };

  // ─── Models ───
  const saveModel = async () => {
    if (!modelForm.name.trim() || !modelForm.model_id.trim()) return;
    await supabase.from('custom_models').insert(modelForm);
    toast({ title: 'Model added' });
    setModelForm({ name: '', model_id: '', description: '', icon: '🤖' });
    loadData();
  };

  const toggleModel = async (id: string, enabled: boolean) => {
    await supabase.from('custom_models').update({ enabled: !enabled }).eq('id', id);
    loadData();
  };

  const deleteModel = async (id: string) => {
    await supabase.from('custom_models').delete().eq('id', id);
    toast({ title: 'Model deleted' });
    loadData();
  };

  // ─── Plugins ───
  const savePlugin = async () => {
    if (!pluginForm.name.trim() || !pluginForm.slash_command.trim() || !pluginForm.code.trim()) return;
    await supabase.from('admin_plugins').insert(pluginForm);
    toast({ title: 'Plugin added' });
    setPluginForm({ name: '', description: '', icon: '🔌', slash_command: '', code: '' });
    loadData();
  };

  const togglePlugin = async (id: string, enabled: boolean) => {
    await supabase.from('admin_plugins').update({ enabled: !enabled }).eq('id', id);
    loadData();
  };

  const deletePlugin = async (id: string) => {
    await supabase.from('admin_plugins').delete().eq('id', id);
    toast({ title: 'Plugin deleted' });
    loadData();
  };

  // ─── Helpers ───
  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = selectedUserId ? profiles.find(p => p.id === selectedUserId) : null;
  const selectedUserRoles = selectedUserId ? roles.filter(r => r.user_id === selectedUserId) : [];
  const selectedUserSettings = selectedUserId ? userSettings.find(s => s.user_id === selectedUserId) : null;
  const selectedUserConvos = selectedUserId ? userConvos.filter(c => c.user_id === selectedUserId) : [];
  const selectedUserGroups = selectedUserId; // We'll query groups separately

  const inputClass = "w-full px-3 py-2 bg-muted rounded-lg outline-none border border-transparent focus:border-muted-foreground/30 text-sm";

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!isAdmin) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Shield className="w-12 h-12 text-destructive" />
      <h1 className="text-xl font-bold">Access Denied</h1>
      <p className="text-sm text-muted-foreground">You need admin privileges.</p>
      <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">Go Back</button>
    </div>
  );

  const savePrompt = async (model: string, text: string) => {
    const key = `prompt_${model}`;
    if (text.trim()) {
      await supabase.from('admin_settings').upsert({ key, value: text, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } else {
      await supabase.from('admin_settings').delete().eq('key', key);
    }
    toast({ title: `Prompt for ${model} saved` });
    setSavedPrompts(p => ({ ...p, [model]: text }));
  };

  const resetPrompt = (model: string) => {
    setPromptText(SYSTEM_PROMPTS[model] || '');
  };




  const sendNotification = async () => {
    if (!notiTitle.trim() || !notiBody.trim()) return;
    setNotiSending(true);
    try {
      const targets = notiMode === 'everyone' ? profiles.map(p => p.id) : notiSelectedUsers;
      for (const uid of targets) {
        await supabase.from('notifications').insert({
          user_id: uid,
          title: notiTitle,
          body: notiBody,
          type: 'admin',
          link: notiLink || null,
        });
      }
      toast({ title: `Notification sent to ${targets.length} user(s)` });
      setNotiTitle('');
      setNotiBody('');
      setNotiLink('');
      setNotiSelectedUsers([]);
    } catch (e) {
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setNotiSending(false);
  };

  const toggleNotiUser = (uid: string) => {
    setNotiSelectedUsers(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
  };

  const notiFilteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(notiSearchQuery.toLowerCase()) ||
    p.display_name.toLowerCase().includes(notiSearchQuery.toLowerCase())
  );

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'notifications', label: 'Notify', icon: Bell },
    { id: 'prompts', label: 'Prompts', icon: FileText },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'plugins', label: 'Plugins', icon: Plug },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
        <button onClick={() => navigate('/')} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-sm">Admin Panel</h1>
        <button onClick={loadData} className="ml-auto p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedUserId(null); }}
            className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {/* ═══ DASHBOARD ═══ */}
        {tab === 'dashboard' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">System Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Users', value: profiles.length, color: 'text-primary' },
                { label: 'Admins', value: roles.filter(r => r.role === 'admin').length, color: 'text-destructive' },
                { label: 'Announcements', value: announcements.filter(a => a.active).length, color: 'text-chart-2' },
                { label: 'Models', value: models.filter(m => m.enabled).length, color: 'text-chart-3' },
              ].map(s => (
                <div key={s.label} className="p-4 bg-card border border-border rounded-xl">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Plugins', value: plugins.filter(p => p.enabled).length },
                { label: 'Total Convos', value: userConvos.length },
                { label: 'Groups', value: '—' },
                { label: 'Push Subs', value: '—' },
              ].map(s => (
                <div key={s.label} className="p-4 bg-card border border-border rounded-xl">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{s.label}</p>
                  <p className="text-2xl font-black">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ USERS ═══ */}
        {tab === 'users' && !selectedUserId && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold">All Users ({profiles.length})</h2>
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..."
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-xs outline-none focus:border-primary" />
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-bold">User</th>
                    <th className="text-left p-3 font-bold">Email</th>
                    <th className="text-left p-3 font-bold hidden md:table-cell">Joined</th>
                    <th className="text-left p-3 font-bold">Roles</th>
                    <th className="text-left p-3 font-bold hidden md:table-cell">Credits</th>
                    <th className="p-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map(p => {
                    const userRoles = roles.filter(r => r.user_id === p.id).map(r => r.role);
                    const us = userSettings.find(s => s.user_id === p.id);
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedUserId(p.id)}>
                        <td className="p-3 font-medium">{p.display_name}</td>
                        <td className="p-3 text-muted-foreground font-mono text-[10px]">{p.email}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {userRoles.map(r => (
                              <span key={r} className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{r}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell font-bold">{us?.credits ?? '—'}</td>
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleAdmin(p.id)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold ${userRoles.includes('admin') ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
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

        {/* ═══ USER DETAIL ═══ */}
        {tab === 'users' && selectedUserId && selectedUser && (
          <UserDetailView
            user={selectedUser}
            roles={selectedUserRoles}
            settings={selectedUserSettings}
            convos={selectedUserConvos}
            onBack={() => setSelectedUserId(null)}
            onToggleAdmin={() => toggleAdmin(selectedUserId)}
            onUpdateCredits={(c) => updateUserCredits(selectedUserId, c)}
            onUpdatePlan={(p, pro) => updateUserPlan(selectedUserId, p, pro)}
          />
        )}

        {/* ═══ ANNOUNCEMENTS ═══ */}
        {tab === 'announcements' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">{editingAnnouncementId ? 'Edit Announcement' : 'New Announcement'}</h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <input value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title *" className={inputClass} />
              <input value={announcementForm.subtitle} onChange={e => setAnnouncementForm(f => ({ ...f, subtitle: e.target.value }))}
                placeholder="Subtitle" className={inputClass} />
              <textarea value={announcementForm.body} onChange={e => setAnnouncementForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Body text" rows={3} className={inputClass + ' resize-none'} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Image</label>
                  {announcementForm.image_url && <img src={announcementForm.image_url} className="w-full h-24 object-cover rounded-lg mb-1" />}
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadAnnouncementFile(e.target.files[0], 'image')}
                    className="text-[10px] file:mr-2 file:px-3 file:py-1 file:rounded-lg file:border-0 file:text-xs file:bg-muted file:text-foreground" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Video URL</label>
                  <input value={announcementForm.video_url} onChange={e => setAnnouncementForm(f => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://..." className={inputClass} />
                </div>
              </div>

              {/* Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Buttons</label>
                  <button onClick={addButton} className="text-[10px] text-primary font-bold flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Button
                  </button>
                </div>
                {announcementForm.buttons.map((btn: any, i: number) => (
                  <div key={i} className="bg-muted p-3 rounded-lg mb-2 space-y-2">
                    <div className="flex gap-2">
                      <input value={btn.text} onChange={e => updateButton(i, 'text', e.target.value)} placeholder="Button text"
                        className="flex-1 px-2 py-1 bg-background rounded text-xs border border-border" />
                      <select value={btn.action} onChange={e => updateButton(i, 'action', e.target.value)}
                        className="px-2 py-1 bg-background rounded text-xs border border-border">
                        <option value="link">Open Link</option>
                        <option value="text">Show Text</option>
                      </select>
                      <button onClick={() => removeButton(i)} className="p-1 text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                    {btn.action === 'link' && (
                      <input value={btn.url} onChange={e => updateButton(i, 'url', e.target.value)} placeholder="URL"
                        className="w-full px-2 py-1 bg-background rounded text-xs border border-border" />
                    )}
                    {btn.action === 'text' && (
                      <textarea value={btn.content} onChange={e => updateButton(i, 'content', e.target.value)} placeholder="Content to show"
                        rows={2} className="w-full px-2 py-1 bg-background rounded text-xs border border-border resize-none" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={saveAnnouncement} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {editingAnnouncementId ? 'Update' : 'Publish'}
                </button>
                {editingAnnouncementId && (
                  <button onClick={() => { setEditingAnnouncementId(null); setAnnouncementForm({ title: '', subtitle: '', body: '', image_url: '', video_url: '', buttons: [], active: true }); }}
                    className="px-4 py-2.5 bg-muted rounded-lg text-sm font-bold">Cancel</button>
                )}
              </div>
            </div>

            <h2 className="text-sm font-bold mt-6">All Announcements ({announcements.length})</h2>
            <div className="space-y-2">
              {announcements.map(a => (
                <div key={a.id} className={`bg-card border rounded-xl p-4 ${a.active ? 'border-primary/30' : 'border-border opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {a.active && <span className="w-2 h-2 rounded-full bg-chart-2 shrink-0" />}
                        <h3 className="text-sm font-bold truncate">{a.title}</h3>
                      </div>
                      {a.subtitle && <p className="text-xs text-muted-foreground">{a.subtitle}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleAnnouncement(a.id, a.active)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
                        {a.active ? <ToggleRight className="w-4 h-4 text-chart-2" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => editAnnouncement(a)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No announcements yet.</p>}
            </div>
          </div>
        )}

        {/* ═══ NOTIFICATIONS ═══ */}
        {tab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">Send Notification</h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setNotiMode('everyone')}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${notiMode === 'everyone' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:bg-accent'}`}>
                  📢 Everyone ({profiles.length})
                </button>
                <button onClick={() => setNotiMode('specific')}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${notiMode === 'specific' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:bg-accent'}`}>
                  👤 Specific Users
                </button>
              </div>

              {notiMode === 'specific' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={notiSearchQuery} onChange={e => setNotiSearchQuery(e.target.value)} placeholder="Search users..."
                      className="w-full pl-9 pr-3 py-2 bg-muted rounded-xl text-xs outline-none border border-transparent focus:border-primary" />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                    {notiFilteredProfiles.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                        <input type="checkbox" checked={notiSelectedUsers.includes(p.id)} onChange={() => toggleNotiUser(p.id)}
                          className="rounded border-border" />
                        <span className="text-xs font-medium">{p.display_name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{p.email}</span>
                      </label>
                    ))}
                  </div>
                  {notiSelectedUsers.length > 0 && (
                    <p className="text-[10px] text-primary font-bold">{notiSelectedUsers.length} user(s) selected</p>
                  )}
                </div>
              )}

              <input value={notiTitle} onChange={e => setNotiTitle(e.target.value)}
                placeholder="Notification title *" className={inputClass} />
              <textarea value={notiBody} onChange={e => setNotiBody(e.target.value)}
                placeholder="Notification body *" rows={3} className={inputClass + ' resize-none'} />
              <input value={notiLink} onChange={e => setNotiLink(e.target.value)}
                placeholder="Link (optional, e.g. /groups)" className={inputClass} />

              <button onClick={sendNotification} disabled={notiSending || !notiTitle.trim() || !notiBody.trim() || (notiMode === 'specific' && notiSelectedUsers.length === 0)}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" /> {notiSending ? 'Sending...' : `Send to ${notiMode === 'everyone' ? 'everyone' : notiSelectedUsers.length + ' user(s)'}`}
              </button>
            </div>
          </div>
        )}

        {/* ═══ PROMPTS ═══ */}
        {tab === 'prompts' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">Global System Prompts</h2>
            <p className="text-xs text-muted-foreground">These prompts apply to ALL users. Users can still override them in their own settings.</p>

            <div className="flex gap-2">
              {(['anson67', 'gemini', 'chester', 'bobby'] as const).map(m => (
                <button key={m} onClick={() => setPromptModel(m)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all capitalize flex items-center justify-center gap-1.5 ${
                    promptModel === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:bg-accent'}`}>
                  {m === 'anson67' ? <Ghost className="w-3.5 h-3.5" /> : m === 'gemini' ? <Cpu className="w-3.5 h-3.5" /> : m === 'chester' ? <Skull className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
                  <span className="capitalize">{m === 'anson67' ? 'Anson67' : m === 'gemini' ? 'Gemini' : m === 'chester' ? 'Chester' : 'Bobby'}</span>
                </button>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">System Prompt for {promptModel}</label>
                <span className="text-[10px] text-muted-foreground">{savedPrompts[promptModel] ? 'Custom' : 'Using default'}</span>
              </div>
              <textarea value={promptText} onChange={e => setPromptText(e.target.value)}
                placeholder={SYSTEM_PROMPTS[promptModel] || 'Enter system prompt...'}
                rows={10} className={inputClass + ' resize-none font-mono text-xs'} />
              <div className="flex gap-2">
                <button onClick={() => savePrompt(promptModel, promptText)}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save
                </button>
                <button onClick={() => resetPrompt(promptModel)}
                  className="px-4 py-2.5 bg-muted rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-accent">
                  <RotateCcw className="w-4 h-4" /> Load Default
                </button>
                <button onClick={() => { setPromptText(''); savePrompt(promptModel, ''); }}
                  className="px-4 py-2.5 bg-destructive/10 text-destructive rounded-lg text-sm font-bold hover:bg-destructive/20">
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-xl">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Default Prompt Preview</h3>
              <pre className="text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto text-muted-foreground">
                {SYSTEM_PROMPTS[promptModel] || 'No default prompt defined.'}
              </pre>
            </div>
          </div>
        )}

        {/* ═══ MODELS ═══ */}
        {tab === 'models' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">Add New Model</h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={modelForm.name} onChange={e => setModelForm(f => ({ ...f, name: e.target.value }))} placeholder="Display name *" className={inputClass} />
                <input value={modelForm.model_id} onChange={e => setModelForm(f => ({ ...f, model_id: e.target.value }))} placeholder="Model ID (e.g. openai/gpt-5) *" className={inputClass} />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <input value={modelForm.icon} onChange={e => setModelForm(f => ({ ...f, icon: e.target.value }))} placeholder="Icon emoji" className={inputClass} />
                <input value={modelForm.description} onChange={e => setModelForm(f => ({ ...f, description: e.target.value }))} placeholder="Description"
                  className={inputClass + ' col-span-3'} />
              </div>
              <button onClick={saveModel} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Model
              </button>
            </div>

            <h2 className="text-sm font-bold mt-6">All Models ({models.length})</h2>
            <div className="space-y-2">
              {models.map(m => (
                <div key={m.id} className={`flex items-center gap-3 bg-card border rounded-xl p-3 ${m.enabled ? 'border-border' : 'border-border opacity-60'}`}>
                  <span className="text-xl">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{m.model_id}</p>
                  </div>
                  <button onClick={() => toggleModel(m.id, m.enabled)} className="p-1.5">
                    {m.enabled ? <ToggleRight className="w-4 h-4 text-chart-2" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteModel(m.id)} className="p-1.5 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {models.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No custom models yet.</p>}
            </div>
          </div>
        )}

        {/* ═══ PLUGINS ═══ */}
        {tab === 'plugins' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold">Upload New Plugin</h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={pluginForm.name} onChange={e => setPluginForm(f => ({ ...f, name: e.target.value }))} placeholder="Plugin name *" className={inputClass} />
                <input value={pluginForm.slash_command} onChange={e => setPluginForm(f => ({ ...f, slash_command: e.target.value }))} placeholder="Slash command (e.g. /myplug) *" className={inputClass} />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <input value={pluginForm.icon} onChange={e => setPluginForm(f => ({ ...f, icon: e.target.value }))} placeholder="Icon" className={inputClass} />
                <input value={pluginForm.description} onChange={e => setPluginForm(f => ({ ...f, description: e.target.value }))} placeholder="Description"
                  className={inputClass + ' col-span-3'} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Plugin Code (JavaScript)</label>
                <textarea value={pluginForm.code} onChange={e => setPluginForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="// function(args) { return 'result'; }" rows={6}
                  className={inputClass + ' resize-none font-mono text-xs'} />
              </div>
              <button onClick={savePlugin} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Upload Plugin
              </button>
            </div>

            <h2 className="text-sm font-bold mt-6">All Plugins ({plugins.length})</h2>
            <div className="space-y-2">
              {plugins.map(p => (
                <div key={p.id} className={`bg-card border rounded-xl p-3 ${p.enabled ? 'border-border' : 'border-border opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.slash_command}</p>
                    </div>
                    <button onClick={() => togglePlugin(p.id, p.enabled)} className="p-1.5">
                      {p.enabled ? <ToggleRight className="w-4 h-4 text-chart-2" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => deletePlugin(p.id)} className="p-1.5 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <details className="mt-2">
                    <summary className="text-[10px] text-muted-foreground cursor-pointer">View Code</summary>
                    <pre className="mt-1 p-2 bg-muted rounded-lg text-[10px] font-mono overflow-x-auto max-h-32">{p.code}</pre>
                  </details>
                </div>
              ))}
              {plugins.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No plugins uploaded yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── User Detail View ───
const UserDetailView = ({
  user, roles, settings, convos, onBack, onToggleAdmin, onUpdateCredits, onUpdatePlan
}: {
  user: Profile;
  roles: Role[];
  settings: UserSettings | null | undefined;
  convos: UserConvo[];
  onBack: () => void;
  onToggleAdmin: () => void;
  onUpdateCredits: (c: number) => void;
  onUpdatePlan: (p: string, pro: boolean) => void;
}) => {
  const [detailTab, setDetailTab] = useState<'overview' | 'chats' | 'settings'>('overview');
  const [editCredits, setEditCredits] = useState(settings?.credits ?? 100);
  const [editPlan, setEditPlan] = useState(settings?.plan ?? 'free');
  const [viewingConvo, setViewingConvo] = useState<UserConvo | null>(null);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    // Load user's groups
    supabase.from('group_members').select('*, groups(*)').eq('user_id', user.id).then(({ data }) => {
      if (data) setGroups(data);
    });
  }, [user.id]);

  const userRoles = roles.map(r => r.role);
  const isAdmin = userRoles.includes('admin');

  if (viewingConvo) {
    return (
      <div className="space-y-3">
        <button onClick={() => setViewingConvo(null)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to chats
        </button>
        <h2 className="text-sm font-bold">{viewingConvo.name} ({viewingConvo.messages.length} messages)</h2>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {(viewingConvo.messages as any[]).map((msg: any, i: number) => (
            <div key={i} className={`p-3 rounded-xl text-xs ${msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                {msg.role === 'user' ? <><User className="w-3 h-3" /> User</> : <><Cpu className="w-3 h-3" /> AI</>}
              </span>
              <p className="mt-1 whitespace-pre-wrap">{msg.text || '[Image/Media]'}</p>
              {msg.timestamp && <p className="text-[9px] text-muted-foreground mt-1">{new Date(msg.timestamp).toLocaleString()}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> Back to users
      </button>

      {/* User header */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-lg font-bold">
          {user.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold">{user.display_name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
          <p className="text-[10px] text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          {userRoles.map(r => (
            <span key={r} className={`px-3 py-1 rounded-full text-[10px] font-bold ${r === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{r}</span>
          ))}
        </div>
        <button onClick={onToggleAdmin}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${isAdmin ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
          {isAdmin ? 'Remove Admin' : 'Make Admin'}
        </button>
      </div>

      {/* Detail tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {(['overview', 'chats', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setDetailTab(t)}
            className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all capitalize ${detailTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {detailTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credits & Plan */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Credits & Plan</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Credits</label>
                <div className="flex gap-2 mt-1">
                  <input type="number" value={editCredits} onChange={e => setEditCredits(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none border border-transparent focus:border-muted-foreground/30" />
                  <button onClick={() => onUpdateCredits(editCredits)} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Save</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Plan</label>
                <div className="flex gap-2 mt-1">
                  <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none border border-transparent">
                    <option value="free">Free</option>
                    <option value="plus">Plus</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <button onClick={() => onUpdatePlan(editPlan, editPlan !== 'free')} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Save</button>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Current: {settings?.credits ?? 100} credits · {settings?.plan ?? 'free'} plan · {settings?.is_pro ? 'PRO ✓' : 'Free'}
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Groups ({groups.length})</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {groups.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg">
                  <div>
                    <p className="text-xs font-bold">{g.groups?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground">Role: {g.role}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(g.joined_at).toLocaleDateString()}</span>
                </div>
              ))}
              {groups.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No groups</p>}
            </div>
          </div>
        </div>
      )}

      {detailTab === 'chats' && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold">Chat History ({convos.length} conversations)</h3>
          {convos.map(c => (
            <button key={c.conversation_id} onClick={() => setViewingConvo(c)}
              className="w-full text-left bg-card border border-border rounded-xl p-3 hover:bg-accent transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(c.messages as any[]).length} messages · {c.model}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">{new Date(c.updated_at).toLocaleString()}</p>
                  <Eye className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
              </div>
            </button>
          ))}
          {convos.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No synced conversations yet. User needs to use the app with sync enabled.</p>}
        </div>
      )}

      {detailTab === 'settings' && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><Settings className="w-4 h-4" /> User Settings</h3>
          {settings?.settings ? (
            <pre className="text-[10px] font-mono bg-muted p-3 rounded-lg overflow-x-auto max-h-60 whitespace-pre-wrap">
              {JSON.stringify(settings.settings, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No synced settings yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
