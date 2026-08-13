export function SkeletonGrid({ count = 6, cols = 6 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-${cols} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
          <div className="w-8 h-8 bg-gray-100 rounded-xl mx-auto mb-2" />
          <div className="h-6 w-16 bg-gray-100 rounded mx-auto mb-1" />
          <div className="h-3 w-20 bg-gray-100 rounded mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded mb-3" />
      <div className={`rounded bg-gray-50`} style={{ height }} />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-3 w-10 bg-gray-100 rounded" />
          <div className="flex-1 h-3 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}
