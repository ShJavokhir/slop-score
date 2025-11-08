'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ScoreGauge, ScoreBar } from '../components/ScoreGauge';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Mock data for repository analysis
const MOCK_ANALYSIS = {
  repoName: 'user/ai-generated-app',
  githubUrl: 'https://github.com/user/ai-generated-app',
  slopScore: 87,
  stars: 1234,
  language: 'TypeScript',
  analyzedDate: '2025-11-05',
  status: 'complete' as const,
  breakdown: {
    readmeAccuracy: 45,
    aiSlopPercentage: 72,
    hardcodePercentage: 68,
  },
  aiSlopSignals: [
    {
      type: 'Verbose Naming',
      count: 23,
      examples: [
        {
          file: 'src/utils/userAuthenticationHelper.ts',
          line: 42,
          snippet: 'function validateUserInputAndReturnCleanedDataOrThrowError()',
          description: 'Excessively verbose function name that could be simplified to validateUserInput',
        },
        {
          file: 'src/components/UserProfileDisplay.tsx',
          line: 18,
          snippet: 'const handleUserProfileDataUpdateSubmissionRequest = async () => {}',
          description: 'Redundant naming pattern typical of AI-generated code',
        },
      ],
    },
    {
      type: 'Obvious Comments',
      count: 45,
      examples: [
        {
          file: 'src/api/users.ts',
          line: 12,
          snippet: '// This function fetches users\nfunction fetchUsers() {}',
          description: 'Comment merely restates what the function name already conveys',
        },
        {
          file: 'src/components/Button.tsx',
          line: 5,
          snippet: '// Initialize state\nconst [count, setCount] = useState(0);',
          description: 'Self-evident comment adds no meaningful context',
        },
      ],
    },
    {
      type: 'Defensive Checks',
      count: 31,
      examples: [
        {
          file: 'src/utils/validation.ts',
          line: 23,
          snippet: 'if (!data || data === null || data === undefined) return;',
          description: 'Redundant null checks on TypeScript strict mode typed parameter',
        },
      ],
    },
    {
      type: 'Type Gymnastics',
      count: 18,
      examples: [
        {
          file: 'src/types/index.ts',
          line: 34,
          snippet: 'const result = (data as any).property as string;',
          description: 'Multiple type assertions to work around TypeScript errors',
        },
      ],
    },
  ],
  readmeMismatches: [
    {
      feature: 'Real-time collaboration',
      status: 'missing' as const,
      explanation: 'README claims WebSocket support for real-time updates, but no WebSocket implementation found in codebase',
    },
    {
      feature: 'Advanced analytics dashboard',
      status: 'incomplete' as const,
      explanation: 'Basic analytics exist but claimed "advanced features" like predictive modeling are not implemented',
    },
    {
      feature: 'Multi-factor authentication',
      status: 'overstated' as const,
      explanation: 'Only email verification exists; no actual 2FA implementation despite README claims',
    },
  ],
  hardcodeAnalysis: {
    totalHardcoded: 145,
    categories: [
      {
        type: 'API Endpoints',
        count: 23,
        severity: 'high' as const,
        examples: ['https://api.example.com/v1/users', 'http://localhost:3000/api'],
      },
      {
        type: 'Configuration Values',
        count: 45,
        severity: 'medium' as const,
        examples: ['maxRetries = 3', 'timeout = 5000'],
      },
      {
        type: 'String Literals',
        count: 77,
        severity: 'low' as const,
        examples: ['Error message strings', 'UI copy'],
      },
    ],
  },
};

type TabType = 'overview' | 'ai-slop' | 'readme' | 'hardcode';

export default function RepoDetailPage() {
  const params = useParams();
  const repoSlug = params.repoSlug as string;
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // In a real app, fetch data based on repoSlug
  const analysis = MOCK_ANALYSIS;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'ai-slop' as TabType, label: 'AI Slop Details' },
    { id: 'readme' as TabType, label: 'README Check' },
    { id: 'hardcode' as TabType, label: 'Hardcode Analysis' },
  ];

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {analysis.repoName}
            </h1>
            <div className="flex items-center gap-4 text-gray-600">
              <a
                href={analysis.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm">{analysis.stars.toLocaleString()}</span>
              </div>
              <Badge variant="neutral">{analysis.language}</Badge>
              <span className="text-sm">
                Analyzed {new Date(analysis.analyzedDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ScoreGauge score={analysis.slopScore} size="lg" />
          </div>
        </div>

        <Button onClick={handleCopyUrl} variant="secondary" size="sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Share Results
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Score Breakdown</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScoreBar
                  score={100 - analysis.breakdown.readmeAccuracy}
                  label="README Inaccuracy"
                  maxScore={100}
                />
                <ScoreBar
                  score={analysis.breakdown.aiSlopPercentage}
                  label="AI Slop Patterns"
                  maxScore={100}
                />
                <ScoreBar
                  score={analysis.breakdown.hardcodePercentage}
                  label="Hardcode Density"
                  maxScore={100}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Quick Summary</h3>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">AI Slop Signals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysis.aiSlopSignals.reduce((sum, s) => sum + s.count, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">README Issues</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysis.readmeMismatches.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Hardcoded Values</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysis.hardcodeAnalysis.totalHardcoded}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'ai-slop' && (
          <div className="space-y-6">
            {analysis.aiSlopSignals.map((signal) => (
              <Card key={signal.type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{signal.type}</h3>
                    <Badge variant="danger">{signal.count} found</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {signal.examples.map((example, idx) => (
                      <div key={idx} className="border-l-4 border-red-500 pl-4 py-2">
                        <p className="text-sm font-mono text-gray-700 mb-2">
                          {example.file}:{example.line}
                        </p>
                        <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto mb-2">
                          <code>{example.snippet}</code>
                        </pre>
                        <p className="text-sm text-gray-600">{example.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'readme' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  README Accuracy: {analysis.breakdown.readmeAccuracy}%
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Comparison of claimed features in README with actual implementation.
                </p>

                <div className="space-y-4">
                  {analysis.readmeMismatches.map((mismatch, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{mismatch.feature}</h4>
                        <Badge
                          variant={
                            mismatch.status === 'missing'
                              ? 'danger'
                              : mismatch.status === 'incomplete'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {mismatch.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{mismatch.explanation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'hardcode' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Total Hardcoded Values: {analysis.hardcodeAnalysis.totalHardcoded}
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analysis.hardcodeAnalysis.categories.map((category, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{category.type}</h4>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              category.severity === 'high'
                                ? 'danger'
                                : category.severity === 'medium'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {category.severity} severity
                          </Badge>
                          <span className="text-sm text-gray-600">{category.count} instances</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-600 mb-2 font-medium">Examples:</p>
                        <ul className="space-y-1">
                          {category.examples.map((example, exIdx) => (
                            <li key={exIdx} className="text-sm font-mono text-gray-700">
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
