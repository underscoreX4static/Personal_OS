import { Job, JobStatus } from '@/types/jobs';

// In-memory job storage (will persist as long as the Railway process runs)
const jobs = new Map<string, Job>();

export function createJob(message: string): Job {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const job: Job = {
    id: jobId,
    status: 'pending',
    message,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  const updatedJob = { ...job, ...updates };
  jobs.set(jobId, updatedJob);
  return updatedJob;
}

export function setJobRunning(jobId: string): Job | undefined {
  return updateJob(jobId, {
    status: 'running',
    startedAt: Date.now(),
  });
}

export function setJobCompleted(jobId: string, result: string): Job | undefined {
  return updateJob(jobId, {
    status: 'completed',
    result,
    completedAt: Date.now(),
  });
}

export function setJobError(jobId: string, error: string): Job | undefined {
  return updateJob(jobId, {
    status: 'error',
    error,
    completedAt: Date.now(),
  });
}

// Cleanup old jobs (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(jobId);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes
