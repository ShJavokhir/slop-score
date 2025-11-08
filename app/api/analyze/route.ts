import { z } from 'zod';
import { getUserId } from '@/lib/api/auth';
import { errorResponse, ApiError } from '@/lib/api/errors';
import { githubUrlSchema, parseGithubUrl } from '@/lib/api/validation';
import { generateMockAnalysis } from '@/lib/api/mock';
import { db, repositories, jobs, analyses, slopNotes } from '@/lib/db';

/**
 * POST /api/analyze
 * Submit GitHub repository URLs for analysis.
 * Creates/updates repo records, creates jobs with mock completed status.
 *
 * MVP: Jobs created with status='completed' and mock analysis data.
 * Future: Jobs created with status='pending', SQS message sent (see mem-0002).
 */
export async function POST(req: Request) {
  try {
    // Auth check
    const userId = await getUserId();

    // Parse and validate request body
    const body = await req.json();
    const { urls } = validateRequestBody(body);

    // Process each URL: upsert repo, create job, generate analysis
    const jobMap: Record<string, string> = {};

    for (const url of urls) {
      const jobId = await processUrl(url, userId);
      jobMap[url] = jobId;
    }

    return Response.json({ jobs: jobMap });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Validate request body with Zod schema.
 * @throws ApiError if validation fails
 */
function validateRequestBody(body: unknown): { urls: string[] } {
  const schema = z.object({
    urls: z.array(githubUrlSchema),
  });

  const result = schema.safeParse(body);

  if (!result.success) {
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Invalid request body',
      { errors: result.error.issues }
    );
  }

  return result.data;
}

/**
 * Process single URL: upsert repo, create job, generate analysis.
 * Returns job ID.
 * All operations wrapped in transaction for atomicity.
 */
async function processUrl(url: string, userId: string): Promise<string> {
  // Parse URL to extract owner and name
  const { owner, name } = parseGithubUrl(url);

  // Wrap all DB operations in a single transaction
  return await db.transaction(async (tx) => {
    // Upsert repository (INSERT ... ON CONFLICT DO UPDATE)
    const [repo] = await tx
      .insert(repositories)
      .values({
        userId,
        githubUrl: url,
        owner,
        name,
      })
      .onConflictDoUpdate({
        target: repositories.githubUrl,
        set: { userId, owner, name },
      })
      .returning();

    if (!repo) {
      throw new ApiError(500, 'DATABASE_ERROR', 'Failed to create/update repository');
    }

    // TODO (SQS Integration - see mem-0002):
    // When SQS integrated, create job with status='pending' instead of 'completed'
    // Send SQS message with { jobId, repositoryId, githubUrl }
    // Analysis will be created by callback endpoint when Python service completes

    // Create job with status='completed' (mock for MVP)
    const [job] = await tx
      .insert(jobs)
      .values({
        userId,
        repositoryId: repo.id,
        status: 'completed',
        progress: 100,
      })
      .returning();

    if (!job) {
      throw new ApiError(500, 'DATABASE_ERROR', 'Failed to create job');
    }

    // TODO (SQS Integration - see mem-0002):
    // Remove this immediate analysis generation
    // Analysis will be created by POST /api/jobs/:id/callback endpoint

    // Generate mock analysis immediately (MVP only)
    const mockData = generateMockAnalysis(url);

    const [analysis] = await tx
      .insert(analyses)
      .values({
        jobId: job.id,
        repositoryId: repo.id,
        slopScore: mockData.slopScore.toString(),
      })
      .returning();

    if (!analysis) {
      throw new ApiError(500, 'DATABASE_ERROR', 'Failed to create analysis');
    }

    // Insert slop notes
    if (mockData.notes.length > 0) {
      await tx.insert(slopNotes).values(
        mockData.notes.map((note) => ({
          analysisId: analysis.id,
          note,
        }))
      );
    }

    return job.id;
  });
}
