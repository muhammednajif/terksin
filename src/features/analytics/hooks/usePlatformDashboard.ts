import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlatformDashboardData, ModuleStatus } from '../types';
import { fetchPlatformHealth, fetchInfrastructureMetrics } from '../services';

export function usePlatformDashboard(
  onStatusReport?: (status: ModuleStatus) => void,
) {
  const [data, setData] = useState<PlatformDashboardData>({ platform: null, infrastructure: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusReport?.({ moduleName: 'Platform Dashboard', status: 'loading', lastSuccessAt: null, error: null, lastRealtimeEvent: null, rpcDurationMs: null });

    const start = performance.now();
    try {
      const [platform, infrastructure] = await Promise.all([
        fetchPlatformHealth(),
        fetchInfrastructureMetrics(),
      ]);
      if (!mountedRef.current) return;
      setData({ platform, infrastructure });
      setIsLoading(false);
      const duration = Math.round(performance.now() - start);
      onStatusReport?.({ moduleName: 'Platform Dashboard', status: 'healthy', lastSuccessAt: new Date(), error: null, lastRealtimeEvent: null, rpcDurationMs: duration });
    } catch (e) {
      if (!mountedRef.current) return;
      const err = e instanceof Error ? e : new Error('Platform dashboard failed');
      setError(err);
      setIsLoading(false);
      onStatusReport?.({ moduleName: 'Platform Dashboard', status: 'failed', lastSuccessAt: null, error: err.message, lastRealtimeEvent: null, rpcDurationMs: null });
    }
  }, [onStatusReport]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
