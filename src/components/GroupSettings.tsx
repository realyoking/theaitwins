import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Trash2, Camera, UserMinus, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type Member = {
  user_id: string;
  role: string;
  display_name: string;
  email: string;
};

type GroupSettingsProps = {
  groupId: string;
  groupName: string;
  groupDescription: string;
  groupAvatarUrl: string | null;
  members: Member[];
  userId: string;
  isOwner: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

const GroupSettings = ({
  groupId,
  groupName,
  groupDescription,
  groupAvatarUrl,
  members,
  userId,
  isOwner,
  onClose,
  onUpdate,
}: GroupSettingsProps) => {
  const [name, setName] = useState(groupName);
  const [description, setDescription] = useState(groupDescription);
  const [avatarUrl, setAvatarUrl] = useState(groupAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${groupId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('group_avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('group_avatars')
        .getPublicUrl(filePath);

      // Add cache buster to force refresh
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('groups')
        .update({ avatar_url: urlWithCacheBuster })
        .eq('id', groupId);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBuster);
      toast({ title: 'Group avatar updated!' });
      onUpdate();
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast({ title: 'Failed to upload avatar', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const saveChanges = async () => {
    if (!name.trim()) {
      toast({ title: 'Group name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: name.trim(), description: description.trim() })
        .eq('id', groupId);

      if (error) throw error;

      toast({ title: 'Group updated!' });
      onUpdate();
      onClose();
    } catch (err: any) {
      toast({ title: 'Failed to update group', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async () => {
    setDeleting(true);
    try {
      // Delete all group messages first
      await supabase.from('group_messages').delete().eq('group_id', groupId);
      // Delete all group members
      await supabase.from('group_members').delete().eq('group_id', groupId);
      // Delete voice rooms
      await supabase.from('voice_rooms').delete().eq('group_id', groupId);
      // Finally delete the group
      const { error } = await supabase.from('groups').delete().eq('id', groupId);

      if (error) throw error;

      toast({ title: 'Group deleted' });
      navigate('/groups');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ title: 'Failed to delete group', description: err.message, variant: 'destructive' });
      setDeleting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (memberId === userId) {
      toast({ title: "You can't remove yourself", variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({ title: 'Member removed' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Failed to remove member', description: err.message, variant: 'destructive' });
    }
  };

  if (!isOwner) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" /> Group Info
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Only group owners can edit settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" /> Group Settings
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{name[0]?.toUpperCase()}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">Click camera to change avatar</p>
          </div>

          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Group Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full mt-1 px-3 py-2.5 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary"
              />
            </div>
          </div>

          {/* Members Management */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
              Members ({members.length})
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-2 p-2 bg-muted rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {(m.display_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.display_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                  </div>
                  {m.role === 'owner' ? (
                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Owner</span>
                  ) : (
                    <button
                      onClick={() => removeMember(m.user_id)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveChanges}
            disabled={saving}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>

          {/* Danger Zone */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-bold text-destructive uppercase mb-2">Danger Zone</p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 bg-destructive/10 text-destructive rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-destructive/20"
              >
                <Trash2 className="w-4 h-4" /> Delete Group
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Are you sure? This will delete all messages and cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-muted rounded-xl text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteGroup}
                    disabled={deleting}
                    className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSettings;
