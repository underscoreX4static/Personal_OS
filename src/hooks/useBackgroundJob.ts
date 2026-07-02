import { useState, useEffect, useCallback, useRef } from 'react';
import type { Job, JobStatus, CreateJobResponse, JobStatusResponse } from '@/types/jobs';
import { saveJob } from '@/lib/db';
import { showNotification, registerBackgroundSync } from '@/lib/notifications';

interface UseBackgroundJobReturn {
  startJob: (message: string) => Promise<string>; // Returns jobId
  job: Job | null;
  isPolling: boolean;
  error: string | null;
}

export function useBackgroundJob(onComplete?: (result: string) => void): UseBackgroundJobReturn {
  const [job, setJob] = useState<Job | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationShownRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const data: JobStatusResponse = await response.json();
      const updatedJob = data.job;

      setJob(updatedJob);
      await saveJob(updatedJob); // Save to IndexedDB

      // Check if job is complete
      if (updatedJob.status === 'completed') {
        stopPolling();

        // Show notification
        await showNotification('Hermes a répondu', {
          body: updatedJob.result ? updatedJob.result.substring(0, 100) + '...' : 'Ouvre l\'app pour voir la réponse',
          tag: `job-${jobId}`,
        });

        if (onComplete && updatedJob.result) {
          onComplete(updatedJob.result);
        }
      } else if (updatedJob.status === 'error') {
        stopPolling();
        setError(updatedJob.error || 'Unknown error');

        // Show error notification
        await showNotification('Erreur Hermes', {
          body: updatedJob.error || 'Une erreur est survenue',
          tag: `job-${jobId}`,
        });
      }
    } catch (err) {
      console.error('[useBackgroundJob] Polling error:', err);
      setError(err instanceof Error ? err.message : 'Polling failed');
      stopPolling();
    }
  }, [onComplete, stopPolling]);

  const startJob = useCallback(async (message: string): Promise<string> => {
    try {
      setError(null);

      // Create job via API
      const response = await fetch('/api/chat/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to create job');
      }

      const data: CreateJobResponse = await response.json();
      const { jobId } = data;

      // Create initial job object
      const initialJob: Job = {
        id: jobId,
        status: 'pending',
        message,
        createdAt: Date.now(),
      };

      setJob(initialJob);
      await saveJob(initialJob);

      // Register background sync for Service Worker
      const syncRegistered = await registerBackgroundSync(jobId);
      console.log('[useBackgroundJob] Background sync registered:', syncRegistered);

      // Start client-side polling (will continue while app is open)
      setIsPolling(true);
      pollingIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId);
      }, 2000); // Poll every 2 seconds

      // Initial poll
      pollJobStatus(jobId);

      return jobId;
    } catch (err) {
      console.error('[useBackgroundJob] Error starting job:', err);
      setError(err instanceof Error ? err.message : 'Failed to start job');
      throw err;
    }
  }, [pollJobStatus]);

  // Listen for app going to background (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && isPolling && job && !notificationShownRef.current) {
        // App went to background while job is running
        notificationShownRef.current = true;
        await showNotification('Personal OS travaille', {
          body: 'Hermes gère ta demande en arrière-plan. Tu recevras une notification quand il aura répondu.',
          tag: `job-background-${job.id}`,
          icon: '/icon-192.png',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPolling, job]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    startJob,
    job,
    isPolling,
    error,
  };
}
