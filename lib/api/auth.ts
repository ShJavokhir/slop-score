import { auth } from '@clerk/nextjs/server';
import { ApiError } from './errors';

/**
 * Extract authenticated user ID from Clerk session.
 * @throws ApiError with code 'UNAUTHORIZED' if no session
 */
export async function getUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  return userId;
}
