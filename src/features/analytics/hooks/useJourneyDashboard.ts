import { useState, useEffect, useCallback, useRef } from 'react';
import type { JourneyDashboardData, ModuleStatus, TimeRange } from '../types';
import { fetchTrends, fetchJourneyAnalytics, fetchTrekPulseAnalytics, fetchExpeditionInsights, fetchAdventureLogStats } from '../services';
import { createAnalyticsChannel, removeAnalyticsChannel } from '../subscriptions';

export function useJourneyDashboard(
  timeRange: TimeRange,
  onStatusReport?: (status: ModuleStatus) => void,
  onRealtimeEvent?: () => void,
) {
  const [data, setData] = useState<JourneyDashboardData>({
    trends: null, journey: null, trekpulse: null, expedition: null, adventure: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusReport?.({ moduleName: 'Journey Dashboard', status: 'loading', lastSuccessAt: null, error: null, lastRealtimeEvent: null, rpcDurationMs: null });

    const start = performance.now();
    try {
      const [trends, journey, trekpulse, expedition, adventure] = await Promise.all([
        fetchTrends(timeRange),
        fetchJourneyAnalytics(),
        fetchTrekPulseAnalytics(),
        fetchExpeditionInsights(),
        fetchAdventureLogStats(),
      ]);
      if (!mountedRef.current) return;
      setData({ trends, journey, trekpulse, expedition, adventure });
      setIsLoading(false);
      const duration = Math.round(performance.now() - start);
      onStatusReport?.({ moduleName: 'Journey Dashboard', status: 'healthy', lastSuccessAt: new Date(), error: null, lastRealtimeEvent: null, rpcDurationMs: duration });
    } catch (e) {
      if (!mountedRef.current) return;
      const err = e instanceof Error ? e : new Error('Journey dashboard failed');
      setError(err);
      setIsLoading(false);
      onStatusReport?.({ moduleName: 'Journey Dashboard', status: 'failed', lastSuccessAt: null, error: err.message, lastRealtimeEvent: null, rpcDurationMs: null });
    }
  }, [timeRange, onStatusReport]);

  useEffect(() => {
    mountedRef.current = true;
    load();

    const channel = createAnalyticsChannel('journey-live', [
      { table: 'trek_journeys', event: 'INSERT' },
    ], () => onRealtimeEvent?.());

    return () => {
      mountedRef.current = false;
      removeAnalyticsChannel(channel);
    };
  }, [load, onRealtimeEvent]);

  return { data, isLoading, error, refetch: load };
}
