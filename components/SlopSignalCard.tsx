import { getSignalTypeLabel } from '@/lib/utils';
import type { SlopSignalType } from '@/lib/types';

interface SlopSignalCardProps {
  signalType: SlopSignalType;
  filePath: string;
  lineNumber?: number;
  codeSnippet: string;
  description: string;
}

export default function SlopSignalCard({
  signalType,
  filePath,
  lineNumber,
  codeSnippet,
  description
}: SlopSignalCardProps) {
  const signalLabel = getSignalTypeLabel(signalType);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded">
            {signalLabel}
          </span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          {filePath}
          {lineNumber && `:${lineNumber}`}
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3">{description}</p>

      {codeSnippet && (
        <div className="bg-gray-50 rounded border border-gray-200 p-3 overflow-x-auto">
          <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-all">
            {codeSnippet}
          </pre>
        </div>
      )}
    </div>
  );
}
