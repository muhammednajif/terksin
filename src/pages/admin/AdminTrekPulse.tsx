import { useState, useEffect } from 'react';
import { fetchAllTrailScores, fetchAllTrekPulseReports } from '@/lib/trekpulse';
import type { TrailScore, TrekPulseReport } from '@/lib/trekpulse';
import { getScoreColor } from '@/lib/trekpulse';
import { supabase } from '@/lib/supabase';

export function AdminTrekPulse() {
  const [scores, setScores] = useState<TrailScore[]>([]);
  const [reports, setReports] = useState<TrekPulseReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, r] = await Promise.all([fetchAllTrailScores(), fetchAllTrekPulseReports()]);
    setScores(s);
    setReports(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const recalculate = async (trekId: string) => {
    await supabase.rpc('calculate_trekpulse_score', { p_trek_id: trekId });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Trail Intelligence</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-sm">
              <p className="text-sm opacity-80">Average Score</p>
              <p className="text-3xl font-bold mt-1">
                {scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-sm">
              <p className="text-sm opacity-80">Tracked Trails</p>
              <p className="text-3xl font-bold mt-1">{scores.length}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-sm">
              <p className="text-sm opacity-80">Active Reports</p>
              <p className="text-3xl font-bold mt-1">{reports.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 mb-6">
            <h2 className="font-semibold mb-3">Trail Scores</h2>
            <div className="space-y-2">
              {scores.map(s => (
                <div key={s.trek_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${getScoreColor(s.score)}`}>{s.score}</span>
                    <div>
                      <p className="text-sm font-medium">{s.trek_id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p className="text-xs text-gray-500">
                        Risk: {s.trail_risk} · Confidence: {s.trail_confidence} · Trekkers: {s.journey_activity_count}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => recalculate(s.trek_id)} className="px-3 py-1 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">
                    Refresh
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold mb-3">Community Reports ({reports.length})</h2>
            <div className="space-y-2">
              {reports.slice(0, 20).map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.severity === 'danger' ? 'bg-red-100 text-red-700' :
                    r.severity === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  }`}>{r.severity}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-gray-500 truncate">{r.message}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{r.trek_id} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
