import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-subscribe to push if notifications were previously enabled
async function initPush() {
  try {
    const notifEnabled = localStorage.getItem('tat_notif');
    if (notifEnabled === 'true' && 'Notification' in window && Notification.permission === 'granted') {
      const { supabase } = await import('@/integrations/supabase/client');
      const { subscribeToPush } = await import('@/lib/push-notifications');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await subscribeToPush(session.user.id);
      }
    }
  } catch (e) {
    console.error('Push init error:', e);
  }
}

initPush();

createRoot(document.getElementById("root")!).render(<App />);
