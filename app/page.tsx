'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchInput } from './components/SearchInput';
import { RepositoryCard } from './components/RepositoryCard';
import Link from 'next/link';

// Mock data for recent high-slop repos
const RECENT_HIGH_SLOPERS = [
  {
    repoName: 'user/ai-generated-app',
    repoSlug: 'user-ai-generated-app',
    slopScore: 87,
    stars: 1234,
    language: 'TypeScript',
    analyzedDate: '2025-11-05',
  },
  {
    repoName: 'company/legacy-codebase',
    repoSlug: 'company-legacy-codebase',
    slopScore: 76,
    stars: 5678,
    language: 'JavaScript',
    analyzedDate: '2025-11-04',
  },
  {
    repoName: 'dev/quick-prototype',
    repoSlug: 'dev-quick-prototype',
    slopScore: 82,
    stars: 234,
    language: 'Python',
    analyzedDate: '2025-11-03',
  },
];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (url: string) => {
    setIsLoading(true);

    // Extract owner and repo from GitHub URL
    const match = url.match(/github\.com\/([\w-]+)\/([\w.-]+)/i);
    if (match) {
      const owner = match[1];
      const repo = match[2];
      const repoSlug = `${owner}-${repo}`;

      // In a real app, this would call the API to check if cached or queue analysis
      // For now, we'll just navigate to the repo page
      router.push(`/${repoSlug}`);
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6">
            Stop the slop.<br />Measure what's real.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-12 leading-relaxed">
            Analyze GitHub repositories for AI-generated code patterns, hardcoded values, and README accuracy.
            Get a comprehensive slop score from 0-100.
          </p>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchInput onSubmit={handleSearch} isLoading={isLoading} />
          </div>

          <p className="text-sm text-gray-500">
            Try:{' '}
            <button
              onClick={() => handleSearch('https://github.com/facebook/react')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              facebook/react
            </button>
            {', '}
            <button
              onClick={() => handleSearch('https://github.com/vercel/next.js')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              vercel/next.js
            </button>
          </p>
        </div>
      </div>

      {/* What is SlopScore */}
      <div className="py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What is SlopScore?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-red-100 text-red-600 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Slop Detection</h3>
              <p className="text-sm text-gray-600">
                Identify verbose naming, obvious comments, and defensive patterns typical of AI-generated code.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-100 text-yellow-600 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Hardcode Analysis</h3>
              <p className="text-sm text-gray-600">
                Detect hardcoded values, API endpoints, and configuration that should be parameterized.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">README Verification</h3>
              <p className="text-sm text-gray-600">
                Compare claimed features in README with actual implementation to find overstated functionality.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent High Slopers */}
      <div className="py-12 border-t border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Recent High Slopers
          </h2>
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All →
          </Link>
        </div>

        <div className="grid gap-4">
          {RECENT_HIGH_SLOPERS.map((repo) => (
            <RepositoryCard key={repo.repoSlug} {...repo} />
          ))}
        </div>
      </div>
    </div>
  );
}
