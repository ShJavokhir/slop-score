import { auth } from '@clerk/nextjs/server';

/**
 * Extract authenticated user ID from Clerk session.
 * @throws ApiError with code 'UNAUTHORIZED' if no session
 */
export async function getUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    const error = new Error('Authentication required') as Error & {
      code: string;
      statusCode: number;
    };
    error.code = 'UNAUTHORIZED';
    error.statusCode = 401;
    throw error;
  }

  return userId;
}
