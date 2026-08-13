import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { AnalyticsHealthState, AnalyticsHealthAction, AnalyticsHealthContextValue } from '../types';
import { analyticsCache } from '../cache';

const initialState: AnalyticsHealthState = {
  modules: {},
  cacheEntries: 0,
  cacheExpired: 0,
  activeChannels: 0,
  lastRealtimeEvent: null,
};

function healthReducer(state: AnalyticsHealthState, action: AnalyticsHealthAction): AnalyticsHealthState {
  switch (action.type) {
    case 'REPORT_STATUS': {
      const m = action.payload;
      const prev = state.modules[m.moduleName];
      if (prev && prev.status === m.status && prev.rpcDurationMs === m.rpcDurationMs && prev.error === m.error) {
        return state;
      }
      return {
        ...state,
        modules: { ...state.modules, [m.moduleName]: m },
        cacheEntries: analyticsCache.size,
        cacheExpired: analyticsCache.expiredCount,
      };
    }
    case 'REALTIME_EVENT':
      return { ...state, lastRealtimeEvent: new Date() };
    case 'CACHE_UPDATE':
      return { ...state, cacheEntries: action.entries, cacheExpired: action.expired };
    case 'CHANNELS_UPDATE':
      return { ...state, activeChannels: action.count };
    default:
      return state;
  }
}

const AnalyticsHealthContext = createContext<AnalyticsHealthContextValue | null>(null);

export function AnalyticsHealthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(healthReducer, initialState);

  const clearCache = useCallback(() => {
    analyticsCache.clear();
    dispatch({ type: 'CACHE_UPDATE', entries: 0, expired: 0 });
  }, []);

  return (
    <AnalyticsHealthContext.Provider value={{ state, dispatch, clearCache }}>
      {children}
    </AnalyticsHealthContext.Provider>
  );
}

export function useAnalyticsHealthContext(): AnalyticsHealthContextValue {
  const ctx = useContext(AnalyticsHealthContext);
  if (!ctx) throw new Error('useAnalyticsHealthContext must be used within AnalyticsHealthProvider');
  return ctx;
}
