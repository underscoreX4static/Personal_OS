// Custom Service Worker for Push Notifications and Background Sync

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);

  let data = {
    title: 'Hermes Personal OS',
    body: 'Nouvelle réponse disponible',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data || {},
  });

  event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync for job polling
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag.startsWith('poll-job-')) {
    const jobId = event.tag.replace('poll-job-', '');
    event.waitUntil(pollJobStatus(jobId));
  }
});

async function pollJobStatus(jobId) {
  try {
    const response = await fetch(`/api/jobs/${jobId}`);
    if (!response.ok) {
      console.error('[Service Worker] Failed to poll job status');
      return;
    }

    const data = await response.json();
    const job = data.job;

    if (job.status === 'completed') {
      // Show notification when job is complete
      await self.registration.showNotification('Hermes a répondu', {
        body: job.result ? job.result.substring(0, 100) + '...' : 'Ouvre l\'app pour voir la réponse',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: { jobId },
      });
    } else if (job.status === 'error') {
      // Show error notification
      await self.registration.showNotification('Erreur Hermes', {
        body: job.error || 'Une erreur est survenue',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { jobId },
      });
    }
  } catch (error) {
    console.error('[Service Worker] Error polling job:', error);
  }
}
