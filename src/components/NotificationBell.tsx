import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, MessageSquare, Info, AtSign, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        // PWA push notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.body, icon: '/pwa-192.png' });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    if (!n.read) {
      supabase.from('notifications').update({ read: true }).eq('id', n.id).then(() => {
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      });
    }
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-black rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-2 right-2 top-14 z-50 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <span className="text-xs font-bold">Notifications</span>
              <div className="flex gap-2 items-center">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline font-bold">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground p-6 text-center">No notifications yet</p>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-3 py-2.5 flex gap-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-0 ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {n.type === 'group_message' ? (
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      ) : n.type === 'mention' ? (
                        <AtSign className="w-3.5 h-3.5 text-chart-2" />
                      ) : n.type === 'admin' ? (
                        <Megaphone className="w-3.5 h-3.5 text-destructive" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] ${!n.read ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{n.body}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
