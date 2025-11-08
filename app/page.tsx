'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/ui/search-bar';
import RepositoryCard from '@/components/RepositoryCard';
import EmptyState from '@/components/EmptyState';
import { parseGitHubUrl, generateRepoSlug, isValidGitHubUrl } from '@/lib/utils';

// Mock data for "Recent High Slopers" - will be replaced with real data from API
const mockRecentRepos = [
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

export default function Home() {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (query: string) => {
    setError('');

    // Validate GitHub URL
    if (!isValidGitHubUrl(query)) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    setIsAnalyzing(true);

    // Parse GitHub URL
    const parsed = parseGitHubUrl(query);
    if (!parsed) {
      setIsAnalyzing(false);
      setError('Could not parse GitHub URL');
      return;
    }

    // Generate slug and navigate to analysis page
    const slug = generateRepoSlug(parsed.owner, parsed.repo);

    // In production, this would submit to API and check if cached
    // For now, we'll just navigate to the analysis page
    setTimeout(() => {
      router.push(`/${slug}`);
      setIsAnalyzing(false);
    }, 500);
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              Stop the slop.
              <br />
              Measure what's real.
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Analyze GitHub repositories for AI-generated code patterns, README accuracy,
              and code quality issues. Get a comprehensive slop score.
            </p>
          </div>

          {/* Search Box */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <SearchBar
              onSearch={handleSearch}
              placeholder="https://github.com/facebook/react"
            />
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Enter any public GitHub repository URL to analyze
            </p>
          </div>
        </div>
      </section>

      {/* Recent High Slopers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Recent High Slopers
            </h2>
            <a
              href="/leaderboard"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View Leaderboard →
            </a>
          </div>

          {mockRecentRepos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockRecentRepos.map((repo, index) => (
                <RepositoryCard
                  key={repo.repoSlug}
                  repoSlug={repo.repoSlug}
                  owner={repo.owner}
                  name={repo.name}
                  slopScore={repo.slopScore}
                  stars={repo.stars}
                  language={repo.language}
                  analysisDate={repo.analysisDate}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No analyses yet"
              description="Be the first to analyze a repository and see it here!"
            />
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            What is SlopScore?
          </h2>
          <div className="space-y-4 text-gray-600">
            <p>
              SlopScore analyzes GitHub repositories to identify signs of AI-generated
              or low-quality code. We check for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>AI Slop Patterns:</strong> Verbose naming, obvious comments, defensive checks, type gymnastics, generic errors, and more</li>
              <li><strong>README Accuracy:</strong> How well the README matches the actual implementation</li>
              <li><strong>Hardcode Analysis:</strong> Detection of hardcoded values that should be configurable</li>
            </ul>
            <p>
              The final slop score ranges from 0-100, where higher scores indicate
              more problematic code patterns.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
