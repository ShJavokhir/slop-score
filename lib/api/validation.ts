import { z } from 'zod';

/**
 * Zod schema for GitHub repository URL.
 * Format: https://github.com/owner/repo
 */
export const githubUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      const pattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
      return pattern.test(url);
    },
    { message: 'Must be a valid GitHub repository URL (https://github.com/owner/repo)' }
  );

/**
 * Parse GitHub URL and extract owner and repository name.
 * @throws Error if URL format is invalid
 */
export function parseGithubUrl(url: string): { owner: string; name: string } {
  const parsed = githubUrlSchema.safeParse(url);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const pattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
  const match = url.match(pattern);

  if (!match) {
    throw new Error('Failed to extract owner and name from GitHub URL');
  }

  return {
    owner: match[1],
    name: match[2].replace(/\/$/, ''), // Remove trailing slash if present
  };
}
