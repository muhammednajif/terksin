import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, ChevronDown, ChevronRight, RefreshCw, Trash2 } from 'lucide-react';
import { useAnalyticsHealth } from '@/features/analytics/hooks/useAnalyticsHealth';

export function AnalyticsHealthPanel() {
  const { state, clearCache } = useAnalyticsHealth();
  const [expanded, setExpanded] = useState(false);

  const moduleList = Object.values(state.modules);
  const healthyCount = moduleList.filter(m => m.status === 'healthy').length;
  const failedCount = moduleList.filter(m => m.status === 'failed').length;
  const loadingCount = moduleList.filter(m => m.status === 'loading').length;

  return (
    <div className="border-t border-black/5 pt-4 mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-gray-700 transition-colors w-full"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <Gauge className="w-3.5 h-3.5" />
        <span>Analytics Health</span>
        <span className="text-[10px] text-gray-400">
          ({healthyCount} healthy{loadingCount > 0 ? `, ${loadingCount} loading` : ''}{failedCount > 0 ? `, ${failedCount} failed` : ''})
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3">
            <div className="bg-gray-50 rounded-xl border border-black/5 p-4 space-y-3">
              {/* Module Status Table */}
              {moduleList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No analytics modules loaded yet</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center text-[10px] text-gray-400 font-medium pb-1 border-b border-black/5">
                    <span className="w-3 h-3 mr-2" />
                    <span className="flex-1">Module</span>
                    <span className="w-16 text-right">Status</span>
                    <span className="w-16 text-right hidden sm:block">Last OK</span>
                    <span className="w-16 text-right hidden sm:block">Duration</span>
                  </div>
                  {moduleList.map((m) => (
                    <div key={m.moduleName} className="flex items-center text-xs py-1">
                      <span className={`w-3 h-3 rounded-full mr-2 inline-flex flex-shrink-0 ${
                        m.status === 'healthy' ? 'bg-emerald-500'
                        : m.status === 'loading' ? 'bg-amber-400 animate-pulse'
                        : m.status === 'stale' ? 'bg-orange-400'
                        : 'bg-red-500'
                      }`} />
                      <span className="flex-1 text-gray-700 truncate">{m.moduleName}</span>
                      <span className={`w-16 text-right font-medium ${
                        m.status === 'healthy' ? 'text-emerald-600'
                        : m.status === 'loading' ? 'text-amber-600'
                        : m.status === 'stale' ? 'text-orange-600'
                        : 'text-red-600'
                      }`}>
                        {m.status === 'healthy' ? 'Healthy'
                          : m.status === 'loading' ? 'Loading'
                          : m.status === 'stale' ? 'Stale'
                          : 'Failed'}
                      </span>
                      <span className="w-16 text-right text-gray-400 hidden sm:block">
                        {m.lastSuccessAt ? m.lastSuccessAt.toLocaleTimeString() : '—'}
                      </span>
                      <span className="w-16 text-right text-gray-400 hidden sm:block">
                        {m.rpcDurationMs !== null ? `${m.rpcDurationMs}ms` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Error Details */}
              {failedCount > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-red-700 mb-1">Failed Modules</p>
                  {moduleList.filter(m => m.status === 'failed').map(m => (
                    <p key={m.moduleName} className="text-[10px] text-red-600 font-mono">{m.moduleName}: {m.error}</p>
                  ))}
                </div>
              )}

              {/* Stats Row */}
              <div className="flex flex-wrap gap-4 text-[10px] text-gray-500 pt-1 border-t border-black/5">
                <span>Cache: <strong>{state.cacheEntries}</strong> entries ({state.cacheExpired} expired)</span>
                <span>Realtime: <strong>{state.activeChannels}</strong> channels</span>
                <span>Last event: {state.lastRealtimeEvent ? state.lastRealtimeEvent.toLocaleTimeString() : '—'}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={clearCache}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-[10px] text-gray-600 hover:bg-black/5 transition-colors">
                  <Trash2 className="w-3 h-3" /> Clear Cache
                </button>
              </div>

              <p className="text-[9px] text-gray-400 italic">
                This panel is for diagnostic purposes. It shows the health status of all analytics modules.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
