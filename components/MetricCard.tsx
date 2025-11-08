import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'gray'
}: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-100 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    gray: 'bg-gray-50 border-gray-100 text-gray-700',
  };

  const iconColorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    gray: 'text-gray-600',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${iconColorClasses[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`${iconColorClasses[color]} opacity-50`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
