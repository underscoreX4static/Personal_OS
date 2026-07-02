export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
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

export async function showNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  // Try to use Service Worker notification (better for PWA)
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    } as NotificationOptions);
  } else {
    // Fallback to regular notification
    new Notification(title, {
      icon: '/icon-192.png',
      ...options,
    });
  }
}

export async function registerPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[Push] Already subscribed:', JSON.stringify(subscription));
      return subscription;
    }

    // For now, we don't need server push - just local notifications
    // Push subscription would require VAPID keys and server setup
    console.log('[Push] Using local notifications only (no server push)');
    return null;
  } catch (error) {
    console.error('[Push] Failed to check subscription:', error);
    return null;
  }
}
