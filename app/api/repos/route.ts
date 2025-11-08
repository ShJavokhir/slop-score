import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/api/auth';
import { ApiError, errorResponse } from '@/lib/api/errors';
import { db, repositories, analyses, slopNotes } from '@/lib/db';
import { eq, and, gte, lte, ilike, asc, desc, count, inArray } from 'drizzle-orm';

// Query parameters schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['score', 'date', 'url']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  search: z.string().optional(),
});

type QueryParams = z.infer<typeof querySchema>;

/**
 * Parse and validate query parameters from URL search params.
 */
function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  const rawParams = Object.fromEntries(searchParams.entries());

  try {
    return querySchema.parse(rawParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(
        400,
        'INVALID_QUERY_PARAMS',
        'Invalid query parameters',
        { errors: error.issues }
      );
    }
    throw error;
  }
}

/**
 * Get the Drizzle column to sort by.
 */
function getSortColumn(sortBy: QueryParams['sortBy']) {
  switch (sortBy) {
    case 'score':
      return analyses.slopScore;
    case 'date':
      return analyses.analyzedAt;
    case 'url':
      return repositories.githubUrl;
  }
}

/**
 * Group notes by analysis ID for efficient lookup.
 */
function groupNotesByAnalysisId(notes: Array<{ analysisId: string; note: string }>): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const { analysisId, note } of notes) {
    if (!grouped[analysisId]) {
      grouped[analysisId] = [];
    }
    grouped[analysisId].push(note);
  }

  return grouped;
}

/**
 * GET /api/repos
 *
 * List all analyzed repositories for authenticated user with filtering,
 * sorting, and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    // Extract authenticated user ID
    const userId = await getUserId();

    // Parse and validate query parameters
    const params = parseQueryParams(req.nextUrl.searchParams);

    // Build base WHERE conditions
    const conditions = [eq(repositories.userId, userId)];

    // Add score filters if provided
    if (params.minScore !== undefined) {
      conditions.push(gte(analyses.slopScore, params.minScore.toString()));
    }
    if (params.maxScore !== undefined) {
      conditions.push(lte(analyses.slopScore, params.maxScore.toString()));
    }

    // Add search filter if provided
    if (params.search) {
      conditions.push(ilike(repositories.githubUrl, `%${params.search}%`));
    }

    // Build and execute main query
    const sortColumn = getSortColumn(params.sortBy);
    const orderByFn = params.sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select({
        repo: repositories,
        analysis: analyses,
      })
      .from(repositories)
      .innerJoin(analyses, eq(repositories.id, analyses.repositoryId))
      .where(and(...conditions))
      .orderBy(orderByFn(sortColumn))
      .limit(params.limit)
      .offset(params.offset);

    // Fetch total count with same filters (no limit/offset)
    const countResult = await db
      .select({ count: count() })
      .from(repositories)
      .innerJoin(analyses, eq(repositories.id, analyses.repositoryId))
      .where(and(...conditions));

    if (countResult.length === 0) {
      throw new Error('Count query returned no results');
    }

    const total = countResult[0].count;

    // Fetch notes for all analyses
    let notesByAnalysis: Record<string, string[]> = {};

    if (results.length > 0) {
      const analysisIds = results.map(r => r.analysis.id);

      const allNotes = await db
        .select({
          analysisId: slopNotes.analysisId,
          note: slopNotes.note,
        })
        .from(slopNotes)
        .where(inArray(slopNotes.analysisId, analysisIds));

      notesByAnalysis = groupNotesByAnalysisId(allNotes);
    }

    // Format response
    const repos = results.map(r => ({
      id: r.repo.id,
      url: r.repo.githubUrl,
      slopScore: parseFloat(r.analysis.slopScore),
      notes: notesByAnalysis[r.analysis.id] || [],
      analyzedAt: r.analysis.analyzedAt.toISOString(),
    }));

    return Response.json({
      repos,
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < total,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
