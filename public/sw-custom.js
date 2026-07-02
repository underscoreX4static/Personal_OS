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
    event.waitUntil(continuouslyPollJob(jobId));
  }
});

// Continuously poll job until completed or error (with timeout)
async function continuouslyPollJob(jobId) {
  const maxAttempts = 60; // 60 attempts * 5s = 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        console.error('[Service Worker] Failed to poll job status');
        attempts++;
        await sleep(5000);
        continue;
      }

      const data = await response.json();
      const job = data.job;

      console.log(`[Service Worker] Job ${jobId} status:`, job.status);

      if (job.status === 'completed') {
        // Save to IndexedDB
        await saveJobToIndexedDB(job);

        // Show notification
        await self.registration.showNotification('Hermes a répondu', {
          body: job.result ? job.result.substring(0, 100) + '...' : 'Ouvre l\'app pour voir la réponse',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { jobId, type: 'job-completed' },
        });

        return; // Job done, stop polling
      } else if (job.status === 'error') {
        // Save error to IndexedDB
        await saveJobToIndexedDB(job);

        // Show error notification
        await self.registration.showNotification('Erreur Hermes', {
          body: job.error || 'Une erreur est survenue',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { jobId, type: 'job-error' },
        });

        return; // Job failed, stop polling
      }

      // Job still running, wait and retry
      attempts++;
      await sleep(5000); // Poll every 5 seconds
    } catch (error) {
      console.error('[Service Worker] Error polling job:', error);
      attempts++;
      await sleep(5000);
    }
  }

  // Timeout reached
  console.error(`[Service Worker] Job ${jobId} timeout after ${maxAttempts} attempts`);
  await self.registration.showNotification('Hermes timeout', {
    body: 'La requête a pris trop de temps. Réessaie.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { jobId, type: 'job-timeout' },
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Save job to IndexedDB (for when app reopens)
async function saveJobToIndexedDB(job) {
  try {
    const db = await openDB();
    const tx = db.transaction('jobs', 'readwrite');
    await tx.objectStore('jobs').put(job);
    await tx.complete;
    console.log('[Service Worker] Job saved to IndexedDB:', job.id);
  } catch (error) {
    console.error('[Service Worker] Failed to save job to IndexedDB:', error);
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('personal-os', 3);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
