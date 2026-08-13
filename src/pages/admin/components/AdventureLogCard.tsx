import type { AdventureLogStats } from '@/features/analytics/types';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { EmptyState } from './shared/EmptyState';

interface Props {
  adventure: AdventureLogStats | null;
  isLoading: boolean;
}

export function AdventureLogCard({ adventure, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
        <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}
        </div>
        <div className="h-4 w-full bg-gray-50 rounded mb-2" />
      </div>
    );
  }

  if (!adventure) return <EmptyState message="No adventure log data" />;

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Adventure Log Insights</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Community achievement analytics</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Completed Treks', value: adventure.completed_treks, color: 'text-brand-emerald' },
          { label: 'Total XP', value: adventure.total_xp, color: 'text-purple-600' },
          { label: 'Achievements', value: adventure.achievements_unlocked, color: 'text-yellow-600' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-black/5">
            <p className={`text-lg font-bold ${s.color}`}><AnimatedCounter value={s.value} /></p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Total Distance</span>
          <span className="text-gray-800 font-medium">{adventure.total_distance_km.toLocaleString()} km</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Highest Altitude</span>
          <span className="text-gray-800 font-medium">{adventure.highest_altitude_m.toLocaleString()} m</span>
        </div>
        {adventure.top_categories.length > 0 && (
          <div className="mt-2 pt-2 border-t border-black/5">
            <p className="text-[11px] text-gray-500 font-medium mb-2">Top Adventure Categories</p>
            {adventure.top_categories.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-gray-600">{c.category}</span>
                <span className="text-gray-900 font-medium">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
