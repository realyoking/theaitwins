import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { subscribeToPush } from '@/lib/push-notifications';

const PwaNotificationPrompt = () => {
  const [show, setShow] = useState(false);
  const { notificationsEnabled, setNotificationsEnabled, setNotificationMode } = useAppStore();

  useEffect(() => {
    // Only show if: notifications not already enabled, browser supports it, and hasn't been dismissed
    const dismissed = localStorage.getItem('tat_notif_prompt_dismissed');
    if (dismissed || notificationsEnabled) return;

    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    // Show after a short delay
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, [notificationsEnabled]);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        setNotificationMode('inactive');
        localStorage.setItem('tat_notif', 'true');
        localStorage.setItem('tat_notif_mode', 'inactive');

        // Subscribe to push
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await subscribeToPush(session.user.id);
        }
      }
    } catch (e) {
      console.error('Notification permission error:', e);
    }
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('tat_notif_prompt_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Enable Notifications?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get notified when AI replies while you're away
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-bold hover:text-foreground transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaNotificationPrompt;
