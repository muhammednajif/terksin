import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, TrendingUp, TrendingDown, Users, AlertTriangle, CloudSun, Route } from 'lucide-react';
import type { TrailScore } from '@/lib/trekpulse';
import { getMarkerColor, fetchTrekPulseReports, fetchTrailScore } from '@/lib/trekpulse';
import type { TrekPulseReport } from '@/lib/trekpulse';
import { supabase } from '@/lib/supabase';

interface TrekPulseMapProps {
  scores: TrailScore[];
}

const continents: Record<string, { x: number; y: number }> = {
  'everest-base-camp': { x: 75, y: 22 },
  'annapurna-circuit': { x: 74, y: 23 },
  'mount-fuji-yoshida': { x: 82, y: 20 },
  'inca-trail': { x: 32, y: 68 },
  'patagonia-o-circuit': { x: 28, y: 75 },
  'tour-du-mont-blanc': { x: 54, y: 24 },
  'camino-frances': { x: 52, y: 21 },
  'kilimanjaro-machame': { x: 58, y: 58 },
  'john-muir-trail': { x: 18, y: 28 },
  'west-coast-trail': { x: 16, y: 30 },
  'milford-track': { x: 88, y: 72 },
};

export function TrekPulseMap({ scores }: TrekPulseMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<TrailScore | null>(null);
  const [reports, setReports] = useState<TrekPulseReport[]>([]);

  const handleSelect = async (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedScore(null);
      setReports([]);
      return;
    }
    setSelectedId(id);
    const score = scores.find(s => s.trek_id === id) || null;
    setSelectedScore(score);
    const r = await fetchTrekPulseReports(id);
    setReports(r);
  };

  const trekNames: Record<string, string> = useMemo(() => {
    const names: Record<string, string> = {};
    scores.forEach(s => {
      names[s.trek_id] = s.trek_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    });
    return names;
  }, [scores]);

  return (
    <div className="relative w-full aspect-[2/1] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-white/10">
      {/* Simplified world map background dots */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 200 }).map((_, i) => (
          <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() * 0.5 + 0.3 }}
          />
        ))}
      </div>

      {/* Continent outlines (simplified) */}
      <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M10,20 Q30,15 40,25 Q50,35 60,30 Q70,25 75,20 Q85,15 90,25" fill="none" stroke="white" strokeWidth="0.3" />
        <path d="M15,35 Q25,30 35,35 Q45,40 55,35 Q65,30 75,35 Q85,40 90,35" fill="none" stroke="white" strokeWidth="0.3" />
        <path d="M20,50 Q30,45 40,50 Q45,55 35,60 Q25,65 20,50" fill="none" stroke="white" strokeWidth="0.3" />
        <path d="M55,45 Q65,40 75,45 Q80,55 70,60 Q60,65 55,45" fill="none" stroke="white" strokeWidth="0.3" />
        <path d="M30,65 Q40,60 50,65 Q55,75 45,80 Q35,85 30,65" fill="none" stroke="white" strokeWidth="0.3" />
        <path d="M60,70 Q70,65 80,70 Q85,80 75,85 Q65,90 60,70" fill="none" stroke="white" strokeWidth="0.3" />
      </svg>

      {/* Markers */}
      {scores.map(score => {
        const pos = continents[score.trek_id];
        if (!pos) return null;
        const color = getMarkerColor(score.score, score.group_trek_available, score.popular);
        const isSelected = selectedId === score.trek_id;
        return (
          <div key={score.trek_id}>
            <button
              onClick={() => handleSelect(score.trek_id)}
              className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-125"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div className={`relative ${isSelected ? 'scale-125' : ''}`}>
                <MapPin className={`w-6 h-6 drop-shadow-lg ${isSelected ? 'animate-bounce' : ''}`} style={{ color }} />
                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${score.recent_incidents ? 'bg-red-500 animate-pulse' : ''}`}
                  style={{ backgroundColor: color }} />
              </div>
            </button>
            {/* Label */}
            <div className="absolute pointer-events-none transform -translate-x-1/2" style={{ left: `${pos.x}%`, top: `${pos.y + 3}%` }}>
              <span className="text-[8px] text-white/60 whitespace-nowrap font-medium drop-shadow-lg">
                {trekNames[score.trek_id]}
              </span>
            </div>
          </div>
        );
      })}

      {/* Selected popup */}
      <AnimatePresence>
        {selectedId && selectedScore && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-4 left-4 right-4 z-20 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-white/10 p-4 max-h-60 overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">{trekNames[selectedId]}</p>
                <p className="text-[10px] text-white/40">TrekPulse Intelligence</p>
              </div>
              <button onClick={() => { setSelectedId(null); setSelectedScore(null); setReports([]); }} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10">
                <span className="text-lg font-bold text-white">{selectedScore.score}</span>
                <span className="text-[10px] text-white/40">/100</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${selectedScore.trail_confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' : selectedScore.trail_confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                {(selectedScore.trail_confidence || 'unknown').charAt(0).toUpperCase() + (selectedScore.trail_confidence || 'unknown').slice(1)} Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <CloudSun className="w-3.5 h-3.5 text-emerald-400" />
                <div><p className="text-[10px] text-white/40">Weather</p><p className="text-xs text-white font-medium capitalize">{selectedScore.weather_status}</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                <div><p className="text-[10px] text-white/40">Trail Risk</p><p className="text-xs text-white font-medium capitalize">{selectedScore.trail_risk}</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <div><p className="text-[10px] text-white/40">Trekkers</p><p className="text-xs text-white font-medium">{selectedScore.journey_activity_count}</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <Route className="w-3.5 h-3.5 text-purple-400" />
                <div><p className="text-[10px] text-white/40">Group Trek</p><p className="text-xs text-white font-medium">{selectedScore.group_trek_available ? 'Available' : 'N/A'}</p></div>
              </div>
            </div>

            {reports.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white/60 mb-1">Recent Reports ({reports.length})</p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {reports.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                      <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${r.severity === 'danger' ? 'text-red-400' : r.severity === 'warning' ? 'text-orange-400' : 'text-yellow-400'}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-white font-medium truncate">{r.title}</p>
                        <p className="text-[8px] text-white/40 truncate">{r.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => window.location.href = `/treks/${selectedId}`}
              className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white font-medium transition-colors">
              View Trek Details
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        {[
          { color: '#10b981', label: 'Good Conditions' },
          { color: '#eab308', label: 'Review Before Trekking' },
          { color: '#ef4444', label: 'Important Reports' },
          { color: '#3b82f6', label: 'Active Group Trek' },
          { color: '#8b5cf6', label: 'Popular Destination' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[8px] text-white/60">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
