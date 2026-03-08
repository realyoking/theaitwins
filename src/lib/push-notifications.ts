import { supabase } from '@/integrations/supabase/client';

let pushSubscription: PushSubscription | null = null;

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { action: 'get-vapid-key' },
    });
    if (error) throw error;
    return data?.publicKey || null;
  } catch (e) {
    console.error('Failed to get VAPID key:', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const publicKey = await getVapidPublicKey();
    if (!publicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    
    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    pushSubscription = subscription;

    // Save to backend
    const subJson = subscription.toJSON();
    await supabase.functions.invoke('send-push', {
      body: {
        action: 'subscribe',
        user_id: userId,
        subscription: {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        },
      },
    });

    console.log('Push subscription saved');
    return true;
  } catch (e) {
    console.error('Push subscribe error:', e);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    if (pushSubscription) {
      await pushSubscription.unsubscribe();
      pushSubscription = null;
    }
    await supabase.functions.invoke('send-push', {
      body: { action: 'unsubscribe', user_id: userId },
    });
  } catch (e) {
    console.error('Push unsubscribe error:', e);
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, url?: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', {
      body: { action: 'send', user_id: userId, title, body, url },
    });
  } catch (e) {
    console.error('Send push error:', e);
  }
}
