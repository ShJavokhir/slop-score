'use client';

import { RepositoryCard } from '../components/RepositoryCard';

// Mock data for leaderboard
const LEADERBOARD_REPOS = [
  {
    repoName: 'user/ai-generated-app',
    repoSlug: 'user-ai-generated-app',
    slopScore: 92,
    stars: 1234,
    language: 'TypeScript',
    analyzedDate: '2025-11-05',
    rank: 1,
  },
  {
    repoName: 'dev/chatgpt-clone',
    repoSlug: 'dev-chatgpt-clone',
    slopScore: 89,
    stars: 543,
    language: 'JavaScript',
    analyzedDate: '2025-11-06',
    rank: 2,
  },
  {
    repoName: 'company/legacy-codebase',
    repoSlug: 'company-legacy-codebase',
    slopScore: 87,
    stars: 5678,
    language: 'JavaScript',
    analyzedDate: '2025-11-04',
    rank: 3,
  },
  {
    repoName: 'dev/quick-prototype',
    repoSlug: 'dev-quick-prototype',
    slopScore: 85,
    stars: 234,
    language: 'Python',
    analyzedDate: '2025-11-03',
    rank: 4,
  },
  {
    repoName: 'startup/mvp-app',
    repoSlug: 'startup-mvp-app',
    slopScore: 82,
    stars: 987,
    language: 'TypeScript',
    analyzedDate: '2025-11-07',
    rank: 5,
  },
  {
    repoName: 'opensource/demo-project',
    repoSlug: 'opensource-demo-project',
    slopScore: 79,
    stars: 3456,
    language: 'Go',
    analyzedDate: '2025-11-02',
    rank: 6,
  },
  {
    repoName: 'team/internal-tool',
    repoSlug: 'team-internal-tool',
    slopScore: 76,
    stars: 12,
    language: 'Python',
    analyzedDate: '2025-11-01',
    rank: 7,
  },
  {
    repoName: 'coder/side-project',
    repoSlug: 'coder-side-project',
    slopScore: 74,
    stars: 456,
    language: 'Rust',
    analyzedDate: '2025-10-31',
    rank: 8,
  },
  {
    repoName: 'agency/client-website',
    repoSlug: 'agency-client-website',
    slopScore: 71,
    stars: 89,
    language: 'TypeScript',
    analyzedDate: '2025-10-30',
    rank: 9,
  },
  {
    repoName: 'freelancer/portfolio-app',
    repoSlug: 'freelancer-portfolio-app',
    slopScore: 68,
    stars: 234,
    language: 'JavaScript',
    analyzedDate: '2025-10-29',
    rank: 10,
  },
];

export default function LeaderboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Slop Leaderboard
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl">
          The top repositories ranked by slop score. Higher scores indicate more AI-generated patterns,
          hardcoded values, and README inaccuracies.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Analyzed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {LEADERBOARD_REPOS.length}
              </p>
            </div>
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Highest Score</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {LEADERBOARD_REPOS[0]?.slopScore}
              </p>
            </div>
            <div className="bg-red-100 text-red-600 w-12 h-12 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {Math.round(
                  LEADERBOARD_REPOS.reduce((sum, repo) => sum + repo.slopScore, 0) /
                    LEADERBOARD_REPOS.length
                )}
              </p>
            </div>
            <div className="bg-yellow-100 text-yellow-600 w-12 h-12 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Top Repositories by Slop Score
        </h2>

        <div className="grid gap-4">
          {LEADERBOARD_REPOS.map((repo) => (
            <RepositoryCard key={repo.repoSlug} {...repo} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Showing top {LEADERBOARD_REPOS.length} repositories
          </p>
        </div>
      </div>
    </div>
  );
}
