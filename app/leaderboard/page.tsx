import RepositoryCard from '@/components/RepositoryCard';
import EmptyState from '@/components/EmptyState';

// Mock data - will be replaced with API call
const mockLeaderboardData = [
  {
    repoSlug: 'example-org-high-slop-repo',
    owner: 'example-org',
    name: 'high-slop-repo',
    slopScore: 87,
    stars: 2340,
    language: 'TypeScript',
    analysisDate: '2025-01-15T10:30:00Z',
  },
  {
    repoSlug: 'another-org-messy-codebase',
    owner: 'another-org',
    name: 'messy-codebase',
    slopScore: 82,
    stars: 5120,
    language: 'JavaScript',
    analysisDate: '2025-01-14T16:45:00Z',
  },
  {
    repoSlug: 'demo-company-legacy-code',
    owner: 'demo-company',
    name: 'legacy-code',
    slopScore: 75,
    stars: 1823,
    language: 'JavaScript',
    analysisDate: '2025-01-14T14:20:00Z',
  },
  {
    repoSlug: 'test-user-sample-project',
    owner: 'test-user',
    name: 'sample-project',
    slopScore: 72,
    stars: 456,
    language: 'Python',
    analysisDate: '2025-01-13T09:15:00Z',
  },
];

export default function LeaderboardPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600">
            Top repositories ranked by slop score. Higher scores indicate more problematic code patterns.
          </p>
        </div>

        {/* Leaderboard */}
        {mockLeaderboardData.length > 0 ? (
          <div className="space-y-4">
            {mockLeaderboardData.map((repo, index) => (
              <RepositoryCard
                key={repo.repoSlug}
                repoSlug={repo.repoSlug}
                owner={repo.owner}
                name={repo.name}
                slopScore={repo.slopScore}
                stars={repo.stars}
                language={repo.language}
                analysisDate={repo.analysisDate}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <EmptyState
              title="No repositories analyzed yet"
              description="Be the first to analyze a repository!"
            />
          </div>
        )}
      </div>
    </div>
  );
}
