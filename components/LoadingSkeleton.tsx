export function RepositoryCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="flex items-center gap-3">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-10 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-20" />
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>
    </div>
  );
}

export function SlopSignalCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="bg-gray-100 rounded border border-gray-200 p-3">
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-4/6" />
        </div>
      </div>
    </div>
  );
}

export function ScoreHeroSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 animate-pulse">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="w-48 h-48 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="flex gap-4 mt-4">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <ScoreHeroSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <div className="space-y-4">
        <SlopSignalCardSkeleton />
        <SlopSignalCardSkeleton />
        <SlopSignalCardSkeleton />
      </div>
    </div>
  );
}
