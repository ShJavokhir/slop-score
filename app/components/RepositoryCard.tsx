import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

interface RepositoryCardProps {
  repoName: string;
  repoSlug: string;
  slopScore: number;
  stars?: number;
  language?: string;
  analyzedDate: string;
  rank?: number;
}

export function RepositoryCard({
  repoName,
  repoSlug,
  slopScore,
  stars,
  language,
  analyzedDate,
  rank,
}: RepositoryCardProps) {
  const getScoreVariant = (score: number): 'success' | 'warning' | 'danger' => {
    if (score <= 30) return 'success';
    if (score <= 60) return 'warning';
    return 'danger';
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Link href={`/${repoSlug}`} className="block group">
      <Card hover className="h-full">
        <CardContent className="flex items-center gap-6 py-5">
          {rank !== undefined && (
            <div className="flex-shrink-0 w-10 text-center">
              <span className="text-xl font-semibold text-gray-300 group-hover:text-gray-400 transition-colors">
                #{rank}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-2 group-hover:text-blue-600 transition-colors">
              {repoName}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {stars !== undefined && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{stars.toLocaleString()}</span>
                </div>
              )}
              {language && <Badge variant="neutral">{language}</Badge>}
              <span className="text-xs text-gray-500">
                {new Date(analyzedDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <div className={`text-4xl font-semibold ${getScoreColor(slopScore)} mb-1`}>
              {slopScore}
            </div>
            <Badge variant={getScoreVariant(slopScore)}>
              {slopScore <= 30 ? 'Low' : slopScore <= 60 ? 'Medium' : 'High'} Slop
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
