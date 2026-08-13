import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Thermometer, AlertTriangle, Wind, Droplets, ChevronRight } from 'lucide-react';
import type { TrekPulseAnalytics, TrendData } from '@/features/analytics/types';
import { EmptyState } from './shared/EmptyState';
import { SkeletonChart } from './shared/SkeletonGrid';

interface Props {
  trekpulse: TrekPulseAnalytics | null;
  trends: TrendData | null;
  isLoading: boolean;
}

const tooltipStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11, color: '#111' };

export function TrekPulseCard({ trekpulse, trends, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) return <SkeletonChart height={300} />;

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">TrekPulse Command</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Trail intelligence summary</p>
        </div>
      </div>

      {!trekpulse ? (
        <EmptyState message="No trail intelligence data" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Trail Score', value: `${trekpulse.avg_trail_score}/100`, icon: Thermometer, color: trekpulse.avg_trail_score >= 70 ? 'text-brand-emerald' : 'text-orange-600' },
              { label: 'High Risk Trails', value: trekpulse.high_risk_trails, icon: AlertTriangle, color: trekpulse.high_risk_trails > 0 ? 'text-red-600' : 'text-brand-emerald' },
              { label: 'Trail Reports (7d)', value: trekpulse.reports_7d, icon: Wind, color: 'text-blue-600' },
              { label: 'Weather Alerts', value: trekpulse.weather_alerts, icon: Droplets, color: trekpulse.weather_alerts > 0 ? 'text-orange-600' : 'text-brand-emerald' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 border border-black/5">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
                <p className={`text-base font-bold ${s.color}`}>
                  {s.value === 0 || s.value === '0/100' ? <span className="text-gray-300">—</span> : s.value}
                </p>
              </div>
            ))}
          </div>

          {trends && trends.daily.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={trends.daily.slice(-14)}>
                <XAxis dataKey="date" tick={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="journeys" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[100px] flex items-center justify-center"><span className="text-xs text-muted-foreground">No journey trend data</span></div>
          )}

          <button onClick={() => navigate('/admin/trekpulse')} className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-brand-emerald font-medium hover:underline">
            Full TrekPulse Analysis <ChevronRight className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}
