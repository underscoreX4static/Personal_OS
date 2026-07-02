export type JobStatus = 'pending' | 'running' | 'completed' | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  message: string; // User's message
  result?: string; // Hermes response
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface CreateJobResponse {
  jobId: string;
}

export interface JobStatusResponse {
  job: Job;
}
