import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface Props {
  autoState: 'idle' | 'running' | 'success' | 'error';
  autoResult: { fetched: number; processed: number; failed: number; skipped: number } | null;
  autoError: string;
  onClose: () => void;
  onRetry: () => void;
}

export function AutomationModal({ autoState, autoResult, autoError, onClose, onRetry }: Props) {
  return (
    <AnimatePresence>
      {autoState !== 'idle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Automation Demo
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {autoState === 'running' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mx-auto mb-3" />
                <p className="text-sm font-medium">Processing journey tasks...</p>
                <p className="text-xs text-black/50 mt-1">Invoking process-journey-tasks edge function</p>
              </div>
            )}

            {autoState === 'success' && autoResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium mb-3">
                  <CheckCircle className="w-5 h-5" />
                  Automation completed successfully
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{autoResult.fetched}</p>
                    <p className="text-[11px] text-black/50">Tasks Fetched</p>
                  </div>
                  <div className="bg-black/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{autoResult.processed}</p>
                    <p className="text-[11px] text-black/50">Processed</p>
                  </div>
                  <div className="bg-black/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{autoResult.failed}</p>
                    <p className="text-[11px] text-black/50">Failed</p>
                  </div>
                  <div className="bg-black/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-600">{autoResult.skipped}</p>
                    <p className="text-[11px] text-black/50">Skipped</p>
                  </div>
                </div>
              </div>
            )}

            {autoState === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  Automation failed
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-700">{autoError}</p>
                </div>
                <button onClick={onRetry}
                  className="w-full py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-semibold hover:bg-yellow-600 transition-all">
                  Retry
                </button>
              </div>
            )}

            <button onClick={onClose}
              className="w-full mt-3 py-2.5 border border-black/10 rounded-xl text-sm font-medium hover:bg-black/5 transition-all">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
