import { supabase } from "@/integrations/supabase/client";

// VAPID public key for push notifications
const VAPID_PUBLIC_KEY = 'BOPQULnj95_Y-pVbJD6wOlua4PJ2k7WoTVB2Lr4OLRSvaDTO-rsFv85cEl41FZa3PA7x3y3ZSysHJ_fo-GIgkRM';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!('PushManager' in window)) {
    console.log('Push notifications are not supported');
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key not configured');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }

    const subscriptionJson = subscription.toJSON();
    
    // Save subscription to database
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscriptionJson.keys?.p256dh || '',
      auth: subscriptionJson.keys?.auth || '',
    }, {
      onConflict: 'user_id,endpoint',
    });

    if (error) {
      console.error('Failed to save subscription:', error);
      return false;
    }

    console.log('Push subscription saved');
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications are not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
