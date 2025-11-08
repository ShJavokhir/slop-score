'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { LayoutDashboard, Bot, FileText, Code } from 'lucide-react';
import ScoreGauge from '@/components/ScoreGauge';
import MetricCard from '@/components/MetricCard';
import SlopSignalCard from '@/components/SlopSignalCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { PageLoadingSkeleton } from '@/components/LoadingSkeleton';
import { TabNav } from '@/components/ui/tab-nav';
import { formatNumber, formatDate, getSignalTypeLabel } from '@/lib/utils';
import type { SlopSignalType, ImplementationStatus } from '@/lib/types';

// Mock data - will be replaced with API calls
const mockAnalysisData = {
  repository: {
    owner: 'example-org',
    name: 'high-slop-repo',
    stars: 2340,
    language: 'TypeScript',
    github_url: 'https://github.com/example-org/high-slop-repo',
  },
  analysis: {
    slop_score: 87,
    status: 'complete' as const,
    analysis_date: '2025-01-15T10:30:00Z',
  },
  details: {
    readme_accuracy_score: 45,
    ai_slop_percentage: 68,
    hardcode_percentage: 42,
    total_files_analyzed: 156,
    total_lines_analyzed: 12450,
  },
  slop_signals: [
    {
      id: '1',
      signal_type: 'verbose_naming' as SlopSignalType,
      file_path: 'src/utils/dataProcessingHelper.ts',
      line_number: 42,
      code_snippet: 'function processAndValidateUserInputDataWithErrorHandling(input: string) { ... }',
      description: 'Function name is unnecessarily verbose and includes implementation details.',
    },
    {
      id: '2',
      signal_type: 'obvious_comments' as SlopSignalType,
      file_path: 'src/components/Button.tsx',
      line_number: 15,
      code_snippet: '// Initialize the counter to zero\nlet counter = 0;',
      description: 'Comment restates what the code clearly does.',
    },
    {
      id: '3',
      signal_type: 'type_gymnastics' as SlopSignalType,
      file_path: 'src/services/api.ts',
      line_number: 78,
      code_snippet: 'const data = response.data as any as UserData;',
      description: 'Multiple type assertions indicate poor type safety.',
    },
  ],
  readme_mismatches: [
    {
      id: '1',
      claimed_feature: 'Real-time collaboration',
      implementation_status: 'missing' as ImplementationStatus,
      explanation: 'README claims real-time collaboration features, but no WebSocket or similar implementation found.',
    },
    {
      id: '2',
      claimed_feature: 'Authentication system',
      implementation_status: 'incomplete' as ImplementationStatus,
      explanation: 'Basic auth structure exists but lacks password reset and email verification mentioned in docs.',
    },
  ],
};

type TabType = 'overview' | 'slop-details' | 'readme-check' | 'hardcode';

export default function RepoAnalysisPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In production, fetch data based on params.repoSlug
  const data = mockAnalysisData;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageLoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: LayoutDashboard },
    { id: 'slop-details' as TabType, name: 'AI Slop', icon: Bot },
    { id: 'readme-check' as TabType, name: 'README', icon: FileText },
    { id: 'hardcode' as TabType, name: 'Hardcode', icon: Code },
  ];

  const groupedSignals = data.slop_signals.reduce((acc, signal) => {
    const type = signal.signal_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(signal);
    return acc;
  }, {} as Record<SlopSignalType, typeof data.slop_signals>);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Score Gauge */}
            <div className="flex-shrink-0">
              <ScoreGauge score={data.analysis.slop_score} size="large" />
            </div>

            {/* Repository Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {data.repository.owner}/{data.repository.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {data.repository.language && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      {data.repository.language}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {formatNumber(data.repository.stars)}
                  </span>
                  <span className="text-gray-400">
                    Analyzed {formatDate(data.analysis.analysis_date)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={data.repository.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  View on GitHub
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <TabNav
            items={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as TabType)}
            className="max-w-2xl mx-auto"
          />
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    title="README Accuracy"
                    value={`${data.details.readme_accuracy_score}%`}
                    subtitle="How well README matches implementation"
                    color={data.details.readme_accuracy_score > 70 ? 'green' : data.details.readme_accuracy_score > 40 ? 'yellow' : 'red'}
                  />
                  <MetricCard
                    title="AI Slop Detected"
                    value={`${data.details.ai_slop_percentage}%`}
                    subtitle="AI-generated code patterns found"
                    color={data.details.ai_slop_percentage < 30 ? 'green' : data.details.ai_slop_percentage < 60 ? 'yellow' : 'red'}
                  />
                  <MetricCard
                    title="Hardcoded Values"
                    value={`${data.details.hardcode_percentage}%`}
                    subtitle="Percentage of hardcoded logic"
                    color={data.details.hardcode_percentage < 30 ? 'green' : data.details.hardcode_percentage < 60 ? 'yellow' : 'red'}
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Files Analyzed:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatNumber(data.details.total_files_analyzed)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Lines of Code:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatNumber(data.details.total_lines_analyzed)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Slop Signals Found:</span>
                      <span className="ml-2 font-medium text-gray-900">{data.slop_signals.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">README Issues:</span>
                      <span className="ml-2 font-medium text-gray-900">{data.readme_mismatches.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Slop Details Tab */}
            {activeTab === 'slop-details' && (
              <div className="space-y-6">
                {Object.keys(groupedSignals).length > 0 ? (
                  Object.entries(groupedSignals).map(([type, signals]) => (
                    <div key={type}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {getSignalTypeLabel(type)} ({signals.length})
                      </h3>
                      <div className="space-y-3">
                        {signals.map((signal) => (
                          <SlopSignalCard
                            key={signal.id}
                            signalType={signal.signal_type}
                            filePath={signal.file_path}
                            lineNumber={signal.line_number}
                            codeSnippet={signal.code_snippet}
                            description={signal.description}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No slop signals detected"
                    description="This repository appears to be clean!"
                  />
                )}
              </div>
            )}

            {/* README Check Tab */}
            {activeTab === 'readme-check' && (
              <div className="space-y-4">
                {data.readme_mismatches.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Claimed Feature</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Explanation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.readme_mismatches.map((mismatch) => (
                          <tr key={mismatch.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{mismatch.claimed_feature}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                mismatch.implementation_status === 'complete' ? 'bg-green-50 text-green-700' :
                                mismatch.implementation_status === 'incomplete' ? 'bg-yellow-50 text-yellow-700' :
                                mismatch.implementation_status === 'overstated' ? 'bg-orange-50 text-orange-700' :
                                'bg-red-50 text-red-700'
                              }`}>
                                {mismatch.implementation_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{mismatch.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="README is accurate"
                    description="All claimed features appear to be properly implemented!"
                  />
                )}
              </div>
            )}

            {/* Hardcode Analysis Tab */}
            {activeTab === 'hardcode' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    {data.details.hardcode_percentage}% Hardcoded Values Detected
                  </h3>
                  <p className="text-sm text-yellow-800">
                    This repository contains a significant amount of hardcoded values that should ideally be
                    moved to configuration files or environment variables.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-sm text-gray-600">
                    Detailed hardcode analysis will be available here, showing specific instances of
                    hardcoded URLs, API endpoints, tokens (redacted), and other values that should be
                    configurable.
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
