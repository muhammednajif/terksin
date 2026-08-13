import type { ExpeditionInsights } from '@/features/analytics/types';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { EmptyState } from './shared/EmptyState';

function ProgressBar({ value, max = 100, color = 'bg-brand-emerald', label, sub }: { value: number; max?: number; color?: string; label: string; sub?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-800 font-medium">{sub || `${value}`}</span>
      </div>
      <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Props {
  expedition: ExpeditionInsights | null;
  isLoading: boolean;
}

export function ExpeditionInsightsCard({ expedition, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
        <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}
        </div>
        <div className="h-4 w-full bg-gray-50 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-50 rounded" />
      </div>
    );
  }

  if (!expedition) return <EmptyState message="No expedition data" />;

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Expedition Insights</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Booking and capacity analytics</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Seats', value: expedition.total_seats, color: 'text-blue-600' },
          { label: 'Filled', value: expedition.filled_seats, color: 'text-brand-emerald' },
          { label: 'Available', value: expedition.available_seats, color: expedition.available_seats > 0 ? 'text-amber-600' : 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-black/5">
            <p className={`text-lg font-bold ${s.color}`}><AnimatedCounter value={s.value} /></p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Most Popular</span>
          <span className="text-gray-800 font-medium truncate max-w-[200px]">{expedition.popular_expedition}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Avg Booking Value</span>
          <span className="text-gray-800 font-medium">₹{expedition.average_booking_value.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Cancellation Rate</span>
          <span className={`font-medium ${expedition.cancellation_rate > 10 ? 'text-red-600' : 'text-brand-emerald'}`}>{expedition.cancellation_rate}%</span>
        </div>
        <div className="mt-2 pt-2 border-t border-black/5">
          <ProgressBar value={expedition.filled_seats} max={Math.max(expedition.total_seats, 1)} label="Seat Fill Rate" sub={`${expedition.total_seats > 0 ? Math.round((expedition.filled_seats / expedition.total_seats) * 100) : 0}%`} color="bg-brand-emerald" />
        </div>
      </div>
    </div>
  );
}
