import { motion } from 'framer-motion';
import { CloudSun, Activity, AlertTriangle, Users, Map, ShieldCheck, Clock, TrendingUp, TrendingDown, Minus, Globe, Mountain, Trees, Tent, Route } from 'lucide-react';
import type { TrailScore } from '@/lib/trekpulse';
import { getScoreColor, getScoreBgColor } from '@/lib/trekpulse';

interface TrailIntelligenceCardProps {
  score: TrailScore;
  onClick?: () => void;
}

const statConfig: Record<string, { icon: any; color: string; label: string }> = {
  good: { icon: CloudSun, color: 'text-emerald-500', label: 'Good' },
  moderate: { icon: Activity, color: 'text-yellow-500', label: 'Moderate' },
  poor: { icon: AlertTriangle, color: 'text-red-500', label: 'Poor' },
  unknown: { icon: Minus, color: 'text-gray-400', label: 'Unknown' },
  high: { icon: TrendingUp, color: 'text-emerald-500', label: 'High' },
  low: { icon: TrendingDown, color: 'text-gray-400', label: 'Low' },
  none: { icon: Minus, color: 'text-gray-400', label: 'None' },
};

export function TrailIntelligenceCard({ score, onClick }: TrailIntelligenceCardProps) {
  const getStat = (val: string) => statConfig[val] || statConfig.unknown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-black/40 uppercase tracking-wider">Trail Intelligence</p>
          <p className="text-lg font-bold mt-0.5">{score.trek_id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
        </div>
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="6" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={`${(score.score / 100) * 176} 176`} strokeLinecap="round" className={getScoreColor(score.score)} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${getScoreColor(score.score)}`}>{score.score}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { icon: getStat(score.weather_status).icon, color: getStat(score.weather_status).color, label: 'Weather', value: getStat(score.weather_status).label },
          { icon: getStat(score.community_activity).icon, color: getStat(score.community_activity).color, label: 'Community', value: getStat(score.community_activity).label },
          { icon: AlertTriangle, color: score.trail_risk === 'low' ? 'text-emerald-500' : score.trail_risk === 'moderate' ? 'text-yellow-500' : 'text-red-500', label: 'Trail Risk', value: score.trail_risk.charAt(0).toUpperCase() + score.trail_risk.slice(1) },
          { icon: Users, color: 'text-blue-500', label: 'Trekkers', value: `${score.journey_activity_count} preparing` },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/5">
            <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
            <div className="min-w-0">
              <p className="text-[10px] text-black/40">{s.label}</p>
              <p className="text-xs font-medium truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getScoreBgColor(score.score)} text-white`}>
            {score.trail_confidence?.charAt(0).toUpperCase()}{score.trail_confidence?.slice(1) || 'Unknown'} Confidence
          </span>
          {score.popular && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Popular</span>}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-black/40">
          <Clock className="w-3 h-3" />
          {Math.floor((Date.now() - new Date(score.last_updated).getTime()) / 60000)}m ago
        </div>
      </div>
    </motion.div>
  );
}

export function TrailIntelligenceMini({ score }: { score: TrailScore }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5">
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4"
            strokeDasharray={`${(score.score / 100) * 126} 126`} strokeLinecap="round" className={getScoreColor(score.score)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${getScoreColor(score.score)}`}>{score.score}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">Trail Intelligence</p>
        <p className="text-[10px] text-black/40">
          {score.trail_risk !== 'unknown' && `Risk: ${score.trail_risk}`}
          {score.trail_risk !== 'unknown' && score.journey_activity_count > 0 && ' · '}
          {score.journey_activity_count > 0 && `${score.journey_activity_count} trekkers`}
        </p>
      </div>
    </div>
  );
}
