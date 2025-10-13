import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SklnwxNZDDRxQYHRhMiXFiMJNnY8pVL0MBnX8Xc5TsOmGr3xvHFLRLQ';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported');
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

export async function subscribeToPushNotifications(
  userId: number,
  userType: 'agent' | 'admin'
): Promise<boolean> {
  try {
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('Service Worker registration failed');
      return false;
    }

    await navigator.serviceWorker.ready;

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      await saveSubscriptionToDatabase(existingSubscription, userId, userType);
      return true;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('Push subscription created:', subscription);

    await saveSubscriptionToDatabase(subscription, userId, userType);
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

async function saveSubscriptionToDatabase(
  subscription: PushSubscription,
  userId: number,
  userType: 'agent' | 'admin'
): Promise<void> {
  const subscriptionJSON = subscription.toJSON();
  const keys = subscriptionJSON.keys as { p256dh: string; auth: string };

  const deviceInfo = `${navigator.userAgent.substring(0, 100)}`;

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      user_type: userType,
      endpoint: subscription.endpoint,
      p256dh_key: keys.p256dh,
      auth_key: keys.auth,
      device_info: deviceInfo,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'endpoint'
    });

  if (error) {
    console.error('Error saving subscription to database:', error);
    throw error;
  }

  console.log('Subscription saved to database');
}

export async function unsubscribeFromPushNotifications(
  userId: number,
  userType: 'agent' | 'admin'
): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return true;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('user_type', userType);

    if (error) {
      console.error('Error removing subscription from database:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

export async function checkNotificationSupport(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  serviceWorkerSupported: boolean;
}> {
  return {
    supported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    permission: 'Notification' in window ? Notification.permission : 'denied',
    serviceWorkerSupported: 'serviceWorker' in navigator
  };
}

export async function sendTestNotification(): Promise<void> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification('Stone River Portal', {
      body: 'Test notification - Push notifications are working!',
      icon: '/icon-192x192.png',
      tag: 'test-notification'
    });
  }
}
