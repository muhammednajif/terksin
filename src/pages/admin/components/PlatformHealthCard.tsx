import type { PlatformHealth } from '@/features/analytics/types';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { EmptyState } from './shared/EmptyState';

interface Props {
  health: PlatformHealth | null;
  isLoading: boolean;
}

export function PlatformHealthCard({ health, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-4 mb-6 animate-pulse">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-100 rounded-full mx-auto lg:mx-0" />
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-4 bg-gray-50 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!health) return <EmptyState message="Unable to load platform health" />;

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 lg:w-24 lg:h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(health.health_percentage / 100) * 264} 264`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl lg:text-3xl font-bold text-brand-emerald"><AnimatedCounter value={health.health_percentage} suffix="%" /></span>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Platform Health</p>
            <p className="text-xs text-muted-foreground">{health.all_systems_operational ? 'All Systems Operational' : 'Some Systems Degraded'}</p>
            <p className="text-[10px] text-gray-400 mt-1">{health.services.filter(s => s.healthy).length} of {health.services.length} services healthy</p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3">
          {health.services.map((s) => (
            <div key={s.name} className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${s.healthy ? 'bg-emerald-500' : 'bg-red-500'} inline-block`} />
              <span className="text-xs text-gray-600">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
