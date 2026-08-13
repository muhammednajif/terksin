import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeoDashboardData, ModuleStatus } from '../types';
import { fetchGeoHeatmap } from '../services';

export function useGeoDashboard(
  onStatusReport?: (status: ModuleStatus) => void,
) {
  const [data, setData] = useState<GeoDashboardData>({ geo: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusReport?.({ moduleName: 'Geo Dashboard', status: 'loading', lastSuccessAt: null, error: null, lastRealtimeEvent: null, rpcDurationMs: null });

    const start = performance.now();
    try {
      const geo = await fetchGeoHeatmap();
      if (!mountedRef.current) return;
      setData({ geo });
      setIsLoading(false);
      const duration = Math.round(performance.now() - start);
      onStatusReport?.({ moduleName: 'Geo Dashboard', status: 'healthy', lastSuccessAt: new Date(), error: null, lastRealtimeEvent: null, rpcDurationMs: duration });
    } catch (e) {
      if (!mountedRef.current) return;
      const err = e instanceof Error ? e : new Error('Geo dashboard failed');
      setError(err);
      setIsLoading(false);
      onStatusReport?.({ moduleName: 'Geo Dashboard', status: 'failed', lastSuccessAt: null, error: err.message, lastRealtimeEvent: null, rpcDurationMs: null });
    }
  }, [onStatusReport]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
