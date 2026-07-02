import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createJob, setJobRunning, setJobCompleted, setJobError } from '@/lib/jobManager';
import type { CreateJobResponse } from '@/types/jobs';

const HERMES_BIN = process.env.HERMES_BIN || '/app/.hermes/bin/hermes';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HOME_DIR = process.env.HOME || '/app/.hermes/hermes-agent';

function callHermesAsync(jobId: string, message: string): void {
  setJobRunning(jobId);

  const args = ['chat', '-q', message];

  const proc = spawn(HERMES_BIN, args, {
    env: {
      ...process.env,
      ANTHROPIC_API_KEY,
      HOME: HOME_DIR,
      PATH: `${HOME_DIR}/.local/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
    },
    timeout: 180000, // 3 minutes max
  });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  proc.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  proc.on('close', (code) => {
    console.log(`[Job ${jobId}] Hermes process closed with code ${code}`);

    if (code === 0 && stdout.trim()) {
      setJobCompleted(jobId, stdout.trim());
      // TODO: Send push notification here
      console.log(`[Job ${jobId}] Completed successfully`);
    } else {
      const errorMsg = stderr || stdout || 'Hermes process failed';
      setJobError(jobId, errorMsg);
      console.error(`[Job ${jobId}] Failed:`, errorMsg);
    }
  });

  proc.on('error', (error) => {
    console.error(`[Job ${jobId}] Process error:`, error);
    setJobError(jobId, error.message);
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create job
    const job = createJob(message);

    // Start Hermes process in background (non-blocking)
    setImmediate(() => {
      callHermesAsync(job.id, message);
    });

    // Return jobId immediately
    const response: CreateJobResponse = {
      jobId: job.id,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /chat/async] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
