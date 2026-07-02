'use client';

import { useEffect, useState } from 'react';
import { requestNotificationPermission } from '@/lib/notifications';

export function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);

      // Show prompt if not yet decided
      if (Notification.permission === 'default') {
        // Wait a bit before showing the prompt (better UX)
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    }
  }, []);

  const handleRequest = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save preference to not show again (you can implement localStorage here)
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  // Don't show if already granted, denied, or user dismissed
  if (!showPrompt || permission !== 'default') {
    return null;
  }

  // Check if user already dismissed
  if (typeof window !== 'undefined' && localStorage.getItem('notification-prompt-dismissed')) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm pb-safe">
      <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow-2xl border border-gray-800">
        <div className="mb-4 text-center">
          <div className="mb-3 text-5xl">🔔</div>
          <h3 className="text-lg font-semibold text-white mb-2">Activer les notifications ?</h3>
          <p className="text-sm text-gray-400">
            Reçois une notification quand Hermes a terminé de répondre, même si l'app est fermée.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-semibold text-white active:bg-gray-700"
          >
            Plus tard
          </button>
          <button
            onClick={handleRequest}
            className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white active:bg-violet-700"
          >
            Activer
          </button>
        </div>
      </div>
    </div>
  );
}
