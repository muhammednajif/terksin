import type { UserInsights } from '@/features/analytics/types';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { EmptyState } from './shared/EmptyState';

interface Props {
  userInsights: UserInsights | null;
  isLoading: boolean;
}

export function UserInsightsCard({ userInsights, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
        <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}
        </div>
        <div className="h-4 w-full bg-gray-50 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-50 rounded" />
      </div>
    );
  }

  if (!userInsights) return <EmptyState message="No user insights data" />;

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">User Insights</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Community analytics</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-brand-emerald"><AnimatedCounter value={userInsights.total_users} /></p>
            <p className="text-[10px] text-muted-foreground">Total Users</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-blue-600"><AnimatedCounter value={userInsights.retention_rate} suffix="%" /></p>
            <p className="text-[10px] text-muted-foreground">Retention Rate</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-purple-600"><AnimatedCounter value={userInsights.returning_users} /></p>
            <p className="text-[10px] text-muted-foreground">Returning Users</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-amber-600"><AnimatedCounter value={userInsights.new_registrations_30d} /></p>
            <p className="text-[10px] text-muted-foreground">New (30d)</p>
          </div>
        </div>

        {userInsights.top_explorers.length > 0 && (
          <div>
            <p className="text-[11px] text-gray-500 font-medium mb-2">Top Explorers</p>
            <div className="space-y-1">
              {userInsights.top_explorers.slice(0, 3).map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-medium overflow-hidden flex-shrink-0">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name?.[0] || '?')}
                  </div>
                  <span className="text-gray-700 truncate flex-1">{u.display_name || 'Anonymous'}</span>
                  <span className="text-brand-emerald font-medium">{u.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {userInsights.explorer_levels.length > 0 && (
        <div className="mt-3 pt-3 border-t border-black/5">
          <p className="text-[11px] text-gray-500 font-medium mb-2">Explorer Levels</p>
          <div className="space-y-1">
            {userInsights.explorer_levels.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{l.level}</span>
                <span className="text-gray-900 font-medium">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
