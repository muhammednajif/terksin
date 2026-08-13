import { useState, useEffect, useCallback, useRef } from 'react';
import type { CommunityDashboardData, ModuleStatus } from '../types';
import { fetchCommunityKpis, fetchModerationSummary, fetchActivityFeed } from '../services';
import { createAnalyticsChannel, removeAnalyticsChannel } from '../subscriptions';

export function useCommunityDashboard(
  onStatusReport?: (status: ModuleStatus) => void,
  onRealtimeEvent?: () => void,
) {
  const [data, setData] = useState<CommunityDashboardData>({ kpis: null, activityFeed: [], moderation: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusReport?.({ moduleName: 'Community Dashboard', status: 'loading', lastSuccessAt: null, error: null, lastRealtimeEvent: null, rpcDurationMs: null });

    const start = performance.now();
    try {
      const results = await Promise.allSettled([
        fetchCommunityKpis(),
        fetchModerationSummary(),
        fetchActivityFeed(),
      ]);
      if (!mountedRef.current) return;
      const kpis = results[0].status === 'fulfilled' ? results[0].value : null;
      const moderation = results[1].status === 'fulfilled' ? results[1].value : null;
      const activityFeed = results[2].status === 'fulfilled' ? results[2].value : [];
      const hadError = results.some(r => r.status === 'rejected');
      setData({ kpis, moderation, activityFeed });
      setIsLoading(false);
      if (hadError) {
        const failedNames = ['fetchCommunityKpis', 'fetchModerationSummary', 'fetchActivityFeed']
          .filter((_, i) => results[i].status === 'rejected');
        const errMsg = `Community dashboard partially failed: ${failedNames.join(', ')}`;
        console.warn(errMsg, results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason));
        setError(new Error(errMsg));
        onStatusReport?.({ moduleName: 'Community Dashboard', status: 'failed', lastSuccessAt: null, error: errMsg, lastRealtimeEvent: null, rpcDurationMs: null });
      } else {
        const duration = Math.round(performance.now() - start);
        onStatusReport?.({ moduleName: 'Community Dashboard', status: 'healthy', lastSuccessAt: new Date(), error: null, lastRealtimeEvent: null, rpcDurationMs: duration });
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const err = e instanceof Error ? e : new Error('Community dashboard failed');
      setError(err);
      setIsLoading(false);
      onStatusReport?.({ moduleName: 'Community Dashboard', status: 'failed', lastSuccessAt: null, error: err.message, lastRealtimeEvent: null, rpcDurationMs: null });
    }
  }, [onStatusReport]);

  useEffect(() => {
    mountedRef.current = true;
    load();

    const handleEvent = (table: string) => {
      onRealtimeEvent?.();
      if (table === 'posts' || table === 'expedition_bookings') {
        setData(prev => prev);
      }
    };

    const channel = createAnalyticsChannel('community-live', [
      { table: 'posts', event: 'INSERT' },
      { table: 'expedition_bookings', event: 'INSERT' },
      { table: 'safety_reports', event: 'INSERT' },
      { table: 'community_reports', event: 'INSERT' },
    ], (table) => handleEvent(table));

    return () => {
      mountedRef.current = false;
      removeAnalyticsChannel(channel);
    };
  }, [load, onRealtimeEvent]);

  return { data, isLoading, error, refetch: load };
}
