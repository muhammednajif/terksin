import { motion, AnimatePresence } from 'framer-motion';
import { IconAlertTriangle, IconLifebuoy, IconBattery, IconMapPin, IconArrowUp, IconX, IconCheck, IconShieldCheck } from '@tabler/icons-react';
import type { ChatSosAlert } from '@/lib/database.types';

interface SOSAlertProps {
  alert: ChatSosAlert | null;
  userId: string;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onClose: () => void;
}

function formatTimestamp(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function SOSAlert({ alert, userId, onAcknowledge, onResolve, onClose }: SOSAlertProps) {
  const isCreator = alert?.user_id === userId;
  const isAcknowledgedByMe = alert?.acknowledged_by?.includes(userId);
  const isResolved = alert?.status === 'resolved' || alert?.status === 'false_alarm';

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="relative w-full max-w-md mx-4"
          >
            {/* Pulsing red background */}
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(220,38,38,0.6)', '0 0 0 30px rgba(220,38,38,0)', '0 0 0 0 rgba(220,38,38,0.6)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="rounded-3xl bg-gradient-to-br from-red-600 to-red-800 p-6 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <IconAlertTriangle className="w-8 h-8 text-red-200" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-bold">SOS Emergency</h2>
                    <p className="text-xs text-red-200">
                      {alert.status === 'resolved' ? 'Resolved' : alert.status === 'acknowledged' ? 'Acknowledged' : 'Active'}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Emergency message */}
              {alert.emergency_message && (
                <div className="bg-white/10 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
                  <IconLifebuoy className="w-4 h-4 inline mr-2" />
                  {alert.emergency_message}
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/10 rounded-xl p-3">
                  <IconMapPin className="w-4 h-4 mb-1 text-red-200" />
                  <p className="text-[10px] text-red-200">Coordinates</p>
                  <p className="text-xs font-mono font-semibold">
                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <IconArrowUp className="w-4 h-4 mb-1 text-red-200" />
                  <p className="text-[10px] text-red-200">Altitude</p>
                  <p className="text-sm font-bold">{alert.altitude ?? 'N/A'}m</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <IconBattery className="w-4 h-4 mb-1 text-red-200" />
                  <p className="text-[10px] text-red-200">Battery</p>
                  <p className="text-sm font-bold">{alert.battery_pct ?? 'N/A'}%</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <IconMapPin className="w-4 h-4 mb-1 text-red-200" />
                  <p className="text-[10px] text-red-200">Nearest Trail</p>
                  <p className="text-xs font-semibold truncate">{alert.nearest_trail ?? 'Unknown'}</p>
                </div>
              </div>

              {/* Timestamp */}
              <p className="text-[10px] text-red-200 mb-4">
                Sent {formatTimestamp(alert.created_at)}
              </p>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {!isResolved && !isAcknowledgedByMe && !isCreator && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <IconCheck className="w-4 h-4" /> Acknowledge
                  </button>
                )}
                {isCreator && !isResolved && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <IconShieldCheck className="w-4 h-4" /> Resolve Alert
                  </button>
                )}
                {isResolved && (
                  <div className="text-center text-sm text-emerald-300 font-medium py-1">
                    Alert resolved
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
