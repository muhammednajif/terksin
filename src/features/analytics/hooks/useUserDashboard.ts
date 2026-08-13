import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserDashboardData, ModuleStatus } from '../types';
import { fetchUserInsights, fetchXpDistribution, fetchRecentSignups } from '../services';
import { createAnalyticsChannel, removeAnalyticsChannel } from '../subscriptions';

export function useUserDashboard(
  onStatusReport?: (status: ModuleStatus) => void,
  onRealtimeEvent?: () => void,
) {
  const [data, setData] = useState<UserDashboardData>({ userInsights: null, xpDistribution: [], recentSignups: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusReport?.({ moduleName: 'User Dashboard', status: 'loading', lastSuccessAt: null, error: null, lastRealtimeEvent: null, rpcDurationMs: null });

    const start = performance.now();
    try {
      const [userInsights, xpDistribution, recentSignups] = await Promise.all([
        fetchUserInsights(),
        fetchXpDistribution(),
        fetchRecentSignups(),
      ]);
      if (!mountedRef.current) return;
      setData({ userInsights, xpDistribution, recentSignups });
      setIsLoading(false);
      const duration = Math.round(performance.now() - start);
      onStatusReport?.({ moduleName: 'User Dashboard', status: 'healthy', lastSuccessAt: new Date(), error: null, lastRealtimeEvent: null, rpcDurationMs: duration });
    } catch (e) {
      if (!mountedRef.current) return;
      const err = e instanceof Error ? e : new Error('User dashboard failed');
      setError(err);
      setIsLoading(false);
      onStatusReport?.({ moduleName: 'User Dashboard', status: 'failed', lastSuccessAt: null, error: err.message, lastRealtimeEvent: null, rpcDurationMs: null });
    }
  }, [onStatusReport]);

  useEffect(() => {
    mountedRef.current = true;
    load();

    const channel = createAnalyticsChannel('user-live', [
      { table: 'profiles', event: 'INSERT' },
    ], () => onRealtimeEvent?.());

    return () => {
      mountedRef.current = false;
      removeAnalyticsChannel(channel);
    };
  }, [load, onRealtimeEvent]);

  return { data, isLoading, error, refetch: load };
}
