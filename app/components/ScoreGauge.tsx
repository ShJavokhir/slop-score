import React from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreGauge({ score, size = 'md', showLabel = true }: ScoreGaugeProps) {
  // Determine color based on score ranges
  const getScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-600 bg-green-100';
    if (score <= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score <= 30) return 'Low Slop';
    if (score <= 60) return 'Medium Slop';
    return 'High Slop';
  };

  const sizes = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-24 h-24 text-3xl',
    lg: 'w-32 h-32 text-4xl',
  };

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          ${sizes[size]}
          ${getScoreColor(score)}
          rounded-full flex items-center justify-center font-bold
          border-4 border-white shadow-sm
        `}
      >
        {score}
      </div>
      {showLabel && (
        <div className="flex flex-col items-center gap-0.5">
          <span className={`${labelSizes[size]} font-semibold text-gray-900`}>
            {getScoreLabel(score)}
          </span>
          <span className={`${labelSizes[size]} text-gray-500`}>
            Slop Score
          </span>
        </div>
      )}
    </div>
  );
}

interface ScoreBarProps {
  score: number;
  label: string;
  maxScore?: number;
}

export function ScoreBar({ score, label, maxScore = 100 }: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;

  const getBarColor = (score: number) => {
    if (score <= 30) return 'bg-green-500';
    if (score <= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{score}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${getBarColor(score)} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
