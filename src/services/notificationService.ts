import { UserIdentity } from '../types/chat';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

export function showPartnerNotification(sender: UserIdentity) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const title = sender;
  const options: any = {
    body: `${sender} mengirim kamu pesan`,
    icon: './pwa-192x192.png',
    badge: './icon.svg',
    tag: 'private-chat-notification',
    renotify: true,
    silent: false,
  };

  try {
    // If Service Worker registration is ready, prefer showNotification (handles background cleanly)
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then(registration => {
          registration.showNotification(title, options);
        })
        .catch(() => {
          new Notification(title, options);
        });
    } else {
      new Notification(title, options);
    }
  } catch (err) {
    console.warn('Failed to show notification:', err);
  }
}
