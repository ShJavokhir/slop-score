import Link from 'next/link';
import { formatNumber, formatDate, getScoreColor } from '@/lib/utils';

interface RepositoryCardProps {
  repoSlug: string;
  owner: string;
  name: string;
  slopScore: number;
  stars: number;
  language?: string;
  analysisDate: string;
  rank?: number;
}

export default function RepositoryCard({
  repoSlug,
  owner,
  name,
  slopScore,
  stars,
  language,
  analysisDate,
  rank
}: RepositoryCardProps) {
  const scoreColor = getScoreColor(slopScore);

  return (
    <Link href={`/${repoSlug}`}>
      <div className="group bg-white border border-gray-100 rounded-lg p-6 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {rank && (
              <div className="text-sm font-medium text-gray-400 mb-1">
                #{rank}
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {owner}/{name}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              {language && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  {language}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {formatNumber(stars)}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(analysisDate)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`text-3xl font-bold ${scoreColor}`}>
              {Math.round(slopScore)}
            </div>
            <div className="text-xs text-gray-500">slop score</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
