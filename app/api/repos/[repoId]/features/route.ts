import { NextRequest } from 'next/server';
import { getUserId } from '@/lib/api/auth';
import { ApiError, errorResponse } from '@/lib/api/errors';
import { db, features, repositories } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/repos/[repoId]/features
 *
 * Fetch all features for a specific repository.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    // Extract authenticated user ID
    const userId = await getUserId();

    const { repoId } = params;

    // Verify repository exists and belongs to user
    const [repo] = await db
      .select()
      .from(repositories)
      .where(
        and(
          eq(repositories.id, repoId),
          eq(repositories.userId, userId)
        )
      )
      .limit(1);

    if (!repo) {
      throw new ApiError(404, 'REPO_NOT_FOUND', 'Repository not found');
    }

    // Fetch all features for this repository
    const repoFeatures = await db
      .select({
        id: features.id,
        featureId: features.featureId,
        claim: features.claim,
        requirement: features.requirement,
        verificationHint: features.verificationHint,
        createdAt: features.createdAt,
      })
      .from(features)
      .where(eq(features.repositoryId, repoId))
      .orderBy(features.featureId);

    return Response.json({
      features: repoFeatures.map(f => ({
        id: f.featureId,
        claim: f.claim,
        requirement: f.requirement,
        verification_hint: f.verificationHint,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
