import { motion, AnimatePresence } from 'framer-motion';
import { IconNavigation, IconCurrentLocation, IconSpeedboat, IconBattery, IconTemperature, IconCloud, IconClock } from '@tabler/icons-react';
import type { ChatLiveTrek } from '@/lib/database.types';

interface LiveTrekCardProps {
  trek: ChatLiveTrek | null;
  userId: string;
  conversationId: string;
  onStart: () => void;
  onStop: () => void;
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

export function LiveTrekCard({ trek, userId, conversationId, onStart, onStop }: LiveTrekCardProps) {
  return (
    <AnimatePresence mode="wait">
      {!trek?.is_active ? (
        <motion.div
          key="inactive"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="rounded-2xl bg-gradient-to-br from-brand-emerald to-emerald-600 p-5 text-white shadow-lg shadow-brand-emerald/25"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <IconNavigation className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Live Trek</h4>
              <p className="text-sm text-emerald-100">Share your trek in real-time</p>
            </div>
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-white text-brand-emerald font-semibold rounded-full text-sm hover:shadow-xl hover:shadow-black/20 transition-all active:scale-95"
            >
              Start Live Trek
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="active"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 p-5 text-white shadow-lg shadow-emerald-500/30"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LiveDot />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Live</span>
            </div>
            <button
              onClick={onStop}
              className="text-[11px] px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors font-medium"
            >
              Stop
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <IconCurrentLocation className="w-5 h-5 mx-auto mb-1 text-emerald-200" />
              <p className="text-lg font-bold">{trek.elevation ?? '-'}</p>
              <p className="text-[10px] text-emerald-200">Elevation</p>
            </div>
            <div className="text-center">
              <IconNavigation className="w-5 h-5 mx-auto mb-1 text-emerald-200" />
              <p className="text-lg font-bold">{trek.distance_km?.toFixed(1) ?? '-'}</p>
              <p className="text-[10px] text-emerald-200">km</p>
            </div>
            <div className="text-center">
              <IconSpeedboat className="w-5 h-5 mx-auto mb-1 text-emerald-200" />
              <p className="text-lg font-bold">{trek.avg_speed_kmh?.toFixed(1) ?? '-'}</p>
              <p className="text-[10px] text-emerald-200">km/h</p>
            </div>
            <div className="text-center">
              <IconBattery className="w-5 h-5 mx-auto mb-1 text-emerald-200" />
              <p className="text-lg font-bold">{trek.battery_pct ?? '-'}%</p>
              <p className="text-[10px] text-emerald-200">Battery</p>
            </div>
            <div className="text-center">
              <IconTemperature className="w-5 h-5 mx-auto mb-1 text-emerald-200" />
              <p className="text-lg font-bold">{trek.weather_temp_c ?? '-'}°</p>
              <p className="text-[10px] text-emerald-200">{trek.weather_condition ?? '--'}</p>
            </div>
            <div className="text-center">
              <IconClock className="w-5 h-5 mx-auto mb-1 text-emerald-200" />
              <p className="text-lg font-bold text-sm">{trek.eta ? new Date(trek.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
              <p className="text-[10px] text-emerald-200">ETA</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
