import type { ActivityFeedEntry } from '@/features/analytics/types';
import { EmptyState } from './shared/EmptyState';
import { SkeletonList } from './shared/SkeletonGrid';

interface Props {
  entries: ActivityFeedEntry[];
  isLoading: boolean;
}

export function ActivityFeedCard({ entries, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Live Activity Feed</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Real-time platform events</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-brand-emerald font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />LIVE
        </span>
      </div>

      {isLoading ? (
        <SkeletonList rows={8} />
      ) : entries.length === 0 ? (
        <EmptyState message="No recent activity recorded" />
      ) : (
        <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
          {entries.slice(0, 25).map((entry, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-black/5 last:border-0">
              <span className="text-[10px] text-gray-400 font-mono w-10 flex-shrink-0 pt-0.5">{entry.timestamp}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 truncate">{entry.subject}</p>
                {entry.detail && <p className="text-[10px] text-muted-foreground truncate">{entry.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
