import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobManager';
import type { JobStatusResponse } from '@/types/jobs';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const response: JobStatusResponse = { job };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /jobs/:jobId] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
