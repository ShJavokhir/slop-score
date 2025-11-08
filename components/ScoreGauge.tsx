import { getScoreColor, getScoreLabel } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function ScoreGauge({
  score,
  size = 'medium',
  showLabel = true
}: ScoreGaugeProps) {
  // Clamp score between 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  // Calculate rotation for the gauge (0-180 degrees)
  const rotation = (clampedScore / 100) * 180;

  // Size configurations
  const sizeClasses = {
    small: {
      container: 'w-24 h-24',
      text: 'text-2xl',
      label: 'text-xs'
    },
    medium: {
      container: 'w-32 h-32',
      text: 'text-3xl',
      label: 'text-sm'
    },
    large: {
      container: 'w-48 h-48',
      text: 'text-5xl',
      label: 'text-base'
    }
  };

  const sizeConfig = sizeClasses[size];
  const colorClass = getScoreColor(clampedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${sizeConfig.container}`}>
        {/* Background semi-circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background arc */}
          <path
            d="M 10 90 A 40 40 0 0 1 90 90"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Colored segments */}
          <path
            d="M 10 90 A 40 40 0 0 1 30 50"
            fill="none"
            stroke="#10B981"
            strokeWidth="8"
            strokeLinecap="round"
            opacity={clampedScore <= 30 ? 1 : 0.3}
          />
          <path
            d="M 30 50 A 40 40 0 0 1 70 50"
            fill="none"
            stroke="#EAB308"
            strokeWidth="8"
            strokeLinecap="round"
            opacity={clampedScore > 30 && clampedScore <= 60 ? 1 : 0.3}
          />
          <path
            d="M 70 50 A 40 40 0 0 1 90 90"
            fill="none"
            stroke="#DC2626"
            strokeWidth="8"
            strokeLinecap="round"
            opacity={clampedScore > 60 ? 1 : 0.3}
          />

          {/* Needle */}
          <g transform={`rotate(${rotation - 90} 50 90)`}>
            <line
              x1="50"
              y1="90"
              x2="50"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={colorClass}
            />
            <circle
              cx="50"
              cy="90"
              r="3"
              fill="currentColor"
              className={colorClass}
            />
          </g>
        </svg>

        {/* Score text in center */}
        <div className="absolute inset-0 flex items-center justify-center pt-4">
          <span className={`font-bold ${colorClass} ${sizeConfig.text}`}>
            {Math.round(clampedScore)}
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="text-center">
          <p className={`font-medium ${colorClass} ${sizeConfig.label}`}>
            {getScoreLabel(clampedScore)}
          </p>
        </div>
      )}
    </div>
  );
}
