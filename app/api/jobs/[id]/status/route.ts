import { getUserId } from '@/lib/api/auth';
import { errorResponse, ApiError } from '@/lib/api/errors';
import { db, jobs } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/jobs/[id]/status
 * Returns current status of a background job.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id: jobId } = await params;

    // Query job with ownership check
    const result = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    // Check if job exists - must check length before accessing [0]
    if (result.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'Job not found');
    }

    const job = result[0];

    // Return status response matching API.md format
    return Response.json({
      jobId: job.id,
      status: job.status,
      currentStep: job.currentStep,
      progress: job.progress,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
