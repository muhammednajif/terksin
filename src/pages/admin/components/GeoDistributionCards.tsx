import type { GeoHeatmapData } from '@/features/analytics/types';
import { EmptyState } from './shared/EmptyState';

interface Props {
  geo: GeoHeatmapData | null;
  isLoading: boolean;
}

function GeoCard({ title, subtitle, entries }: { title: string; subtitle: string; entries: { name: string; count: number }[] }) {
  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
      ) : (
        <div className="space-y-1.5">
          {entries.slice(0, 8).map((e, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 truncate max-w-[140px]">{e.name}</span>
              <span className="text-gray-900 font-medium">{e.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GeoDistributionCards({ geo, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
            <div className="h-4 w-24 bg-gray-100 rounded mb-6" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-full bg-gray-100 rounded mb-2" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!geo) return <EmptyState message="No geographic data available" />;

  const allEmpty = geo.countries.length === 0 && geo.states.length === 0 && geo.journey_density.length === 0 && geo.popular_treks.length === 0;
  if (allEmpty) return <EmptyState message="No geographic data available" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <GeoCard title="Active Countries" subtitle="Top regions" entries={geo.countries} />
      <GeoCard title="Active States" subtitle="Regional breakdown" entries={geo.states} />
      <GeoCard title="Journey Density" subtitle="Most planned routes" entries={geo.journey_density} />
      <GeoCard title="Popular Treks" subtitle="Most saved routes" entries={geo.popular_treks} />
    </div>
  );
}
