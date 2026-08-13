import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Radar, Activity, RefreshCw, AlertTriangle, TrendingUp, Globe } from 'lucide-react';
import { fetchAllTrailScores, fetchAllTrekPulseReports, submitTrekPulseReport } from '@/lib/trekpulse';
import type { TrailScore, TrekPulseReport } from '@/lib/trekpulse';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrailIntelligenceCard } from '@/components/trekpulse/TrailIntelligenceCard';
import { TrekPulseMap } from '@/components/trekpulse/TrekPulseMap';
import { ReportCard } from '@/components/trekpulse/ReportCard';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type ViewMode = 'map' | 'grid' | 'reports';

export const TrekPulse = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<TrailScore[]>([]);
  const [reports, setReports] = useState<TrekPulseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [s, r] = await Promise.all([fetchAllTrailScores(), fetchAllTrekPulseReports()]);
    setScores(s);
    setReports(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = scores.filter(s =>
    s.trek_id.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;
  const totalTrekkers = scores.reduce((a, s) => a + s.journey_activity_count, 0);
  const highRisk = scores.filter(s => s.trail_risk === 'high' || s.trail_risk === 'extreme').length;
  const pulseRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const statVals = pulseRef.current?.querySelectorAll('.pulse-stat-val');
    const cardGrid = pulseRef.current?.querySelector('.pulse-grid');
    const cards = cardGrid?.children;

    if (statVals) {
      statVals.forEach(el => {
        const text = el.textContent || '';
        const num = parseInt(text.replace(/[^0-9]/g, ''));
        if (isNaN(num)) return;
        const suffix = text.replace(/[0-9]/g, '');
        el.textContent = '0' + suffix;
        gsap.to(el, {
          duration: 1.5, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          onUpdate: function () { el.textContent = Math.round(this.progress() * num) + suffix; },
        });
      });
    }

    if (cards?.length) {
      gsap.fromTo(cards as Element[],
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out',
          scrollTrigger: { trigger: cards[0], start: 'top 88%', toggleActions: 'play none none none' },
        }
      );
    }
  }, [scores, viewMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PageHeader
          subtitle="Trail Intelligence System"
          actions={
            <button onClick={load} disabled={loading} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-brand-emerald" />
            <h1 className="text-xl md:text-2xl font-bold font-heading">TrekPulse</h1>
          </div>
        </PageHeader>

        {/* Stats bar */}
        <div ref={pulseRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="pulse-stat p-3 md:p-4 rounded-xl bg-white border">
            <p className="pulse-stat-val text-xl md:text-2xl font-bold text-brand-emerald">{avgScore}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground">Avg Score</p>
          </div>
          <div className="pulse-stat p-3 md:p-4 rounded-xl bg-white border">
            <p className="pulse-stat-val text-xl md:text-2xl font-bold">{totalTrekkers}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground">Active Trekkers</p>
          </div>
          <div className="pulse-stat p-3 md:p-4 rounded-xl bg-white border">
            <p className="pulse-stat-val text-xl md:text-2xl font-bold text-orange-500">{highRisk}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground">High Risk Trails</p>
          </div>
          <div className="pulse-stat p-3 md:p-4 rounded-xl bg-white border">
            <p className="pulse-stat-val text-xl md:text-2xl font-bold">{reports.length}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground">Recent Reports</p>
          </div>
        </div>

        {/* View toggles + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-none">
            {(['map', 'grid', 'reports'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                  viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {mode === 'map' && <Globe className="w-3.5 h-3.5 inline mr-1.5" />}
                {mode === 'grid' && <Activity className="w-3.5 h-3.5 inline mr-1.5" />}
                {mode === 'reports' && <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />}
                {mode === 'map' ? 'Intelligence Map' : mode === 'grid' ? 'Trail Scores' : 'Reports'}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search trails..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-white border border-black/10 rounded-xl text-xs focus:outline-none focus:border-brand-emerald" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'map' ? (
          <TrekPulseMap scores={scores} />
        ) : viewMode === 'grid' ? (
          <div className="pulse-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(score => (
              <TrailIntelligenceCard key={score.trek_id} score={score} onClick={() => navigate(`/treks/${score.trek_id}`)} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 p-4">
            <h3 className="text-sm font-semibold mb-3">Community Reports</h3>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No reports yet.</p>
            ) : (
              <div className="divide-y divide-black/5">
                {reports.filter(r => r.trek_id.toLowerCase().includes(search.toLowerCase())).map(r => (
                  <ReportCard key={r.id} report={r} onClick={() => navigate(`/treks/${r.trek_id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          TrekPulse updates automatically based on community activity and reports. Last updated: {scores.length > 0 ? new Date(Math.max(...scores.map(s => new Date(s.last_updated).getTime()))).toLocaleTimeString() : 'N/A'}
        </p>
      </div>
    </div>
  );
};
