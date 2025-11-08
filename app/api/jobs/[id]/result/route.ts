import { getUserId } from '@/lib/api/auth';
import { errorResponse, ApiError } from '@/lib/api/errors';
import { db, jobs, analyses, repositories, slopNotes } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/jobs/[id]/result
 * Returns completed job result with slop score and notes.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id: jobId } = await params;

    // Query job with ownership check
    const jobResult = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    // Check if job exists - must check length before accessing [0]
    if (jobResult.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'Job not found');
    }

    const job = jobResult[0];

    // Check if job is completed or failed
    if (job.status !== 'completed' && job.status !== 'failed') {
      throw new ApiError(425, 'TOO_EARLY', 'Job not yet completed');
    }

    // Handle failed jobs
    if (job.status === 'failed') {
      return Response.json({
        jobId: job.id,
        status: 'failed',
        error: {
          message: job.errorMessage || 'Analysis failed',
          code: job.errorCode || 'ANALYSIS_FAILED',
        },
      });
    }

    // Fetch analysis for this job
    const analysisResult = await db
      .select()
      .from(analyses)
      .where(eq(analyses.jobId, jobId));

    if (analysisResult.length === 0) {
      throw new ApiError(
        500,
        'INTERNAL_ERROR',
        'Analysis not found for completed job'
      );
    }

    const analysis = analysisResult[0];

    // Fetch repository
    const repoResult = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, analysis.repositoryId));

    if (repoResult.length === 0) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'Repository not found');
    }

    const repo = repoResult[0];

    // Fetch all notes for this analysis
    const notesResult = await db
      .select()
      .from(slopNotes)
      .where(eq(slopNotes.analysisId, analysis.id));

    // Return completed result matching API.md format
    return Response.json({
      jobId: job.id,
      status: 'completed',
      result: {
        url: repo.githubUrl,
        slopScore: parseFloat(analysis.slopScore),
        notes: notesResult.map((n) => n.note),
        analyzedAt: analysis.analyzedAt.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
