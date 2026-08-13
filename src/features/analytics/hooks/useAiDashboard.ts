import { useState, useEffect, useCallback, useRef } from 'react';
import type { AiDashboardData, ModuleStatus } from '../types';
import { fetchAiInsights } from '../services';

export function useAiDashboard(
  onStatusReport?: (status: ModuleStatus) => void,
) {
  const [data, setData] = useState<AiDashboardData>({ insights: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusReport?.({ moduleName: 'AI Dashboard', status: 'loading', lastSuccessAt: null, error: null, lastRealtimeEvent: null, rpcDurationMs: null });

    const start = performance.now();
    try {
      const insights = await fetchAiInsights();
      if (!mountedRef.current) return;
      setData({ insights });
      setIsLoading(false);
      const duration = Math.round(performance.now() - start);
      onStatusReport?.({ moduleName: 'AI Dashboard', status: 'healthy', lastSuccessAt: new Date(), error: null, lastRealtimeEvent: null, rpcDurationMs: duration });
    } catch (e) {
      if (!mountedRef.current) return;
      const err = e instanceof Error ? e : new Error('AI dashboard failed');
      setError(err);
      setIsLoading(false);
      onStatusReport?.({ moduleName: 'AI Dashboard', status: 'failed', lastSuccessAt: null, error: err.message, lastRealtimeEvent: null, rpcDurationMs: null });
    }
  }, [onStatusReport]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
