import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, TrendingUp, Lightbulb, Globe, Zap, Gauge,
  Command, Calendar, Clock, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnalyticsHealthProvider, useAnalyticsHealth } from '@/features/analytics';
import { useTimeRange } from '@/features/analytics/hooks/useTimeRange';
import { usePlatformDashboard } from '@/features/analytics/hooks/usePlatformDashboard';
import { useCommunityDashboard } from '@/features/analytics/hooks/useCommunityDashboard';
import { useJourneyDashboard } from '@/features/analytics/hooks/useJourneyDashboard';
import { useUserDashboard } from '@/features/analytics/hooks/useUserDashboard';
import { useAiDashboard } from '@/features/analytics/hooks/useAiDashboard';
import { useGeoDashboard } from '@/features/analytics/hooks/useGeoDashboard';

import { PlatformHealthCard } from './components/PlatformHealthCard';
import { PlatformKpiGrid } from './components/PlatformKpiGrid';
import { AnalyticsChartGrid } from './components/AnalyticsChartGrid';
import { ActivityFeedCard } from './components/ActivityFeedCard';
import { TrekPulseCard } from './components/TrekPulseCard';
import { AiInsightCards } from './components/AiInsightCards';
import { GeoDistributionCards } from './components/GeoDistributionCards';
import { SystemHealthCard } from './components/SystemHealthCard';
import { ModerationSummaryCard } from './components/ModerationSummaryCard';
import { UserInsightsCard } from './components/UserInsightsCard';
import { ExpeditionInsightsCard } from './components/ExpeditionInsightsCard';
import { AdventureLogCard } from './components/AdventureLogCard';
import { QuickActionCenter } from './components/QuickActionCenter';
import { AutomationModal } from './components/AutomationModal';
import { AnalyticsHealthPanel } from './components/AnalyticsHealthPanel';
import { runAllRpcDiagnostics } from '@/features/analytics/rpc-diagnostics';

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-brand-emerald" />
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function DashboardInner() {
  const navigate = useNavigate();
  const { timeRange, changeTimeRange } = useTimeRange(30);
  const { dispatch } = useAnalyticsHealth();

  useEffect(() => {
    runAllRpcDiagnostics().then(results => {
      const firstFail = results.find(r => r.status === 'fail');
      if (firstFail) {
        console.error('========================================');
        console.error('FIRST FAILING RPC:', firstFail.name);
        console.error('Error:', firstFail.error?.message);
        console.error('Code:', firstFail.error?.code);
        console.error('Details:', firstFail.error?.details);
        console.error('RLS blocked:', firstFail.rlsBlocked);
        console.error('Permission error:', firstFail.permissionError);
        console.error('Params:', firstFail.params);
        console.error('========================================');
      } else {
        console.log('All analytics RPCs passed.');
      }
    });
  }, []);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoState, setAutoState] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [autoResult, setAutoResult] = useState<{ fetched: number; processed: number; failed: number; skipped: number } | null>(null);
  const [autoError, setAutoError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const onRealtimeEvent = useCallback(() => {
    dispatch({ type: 'REALTIME_EVENT' });
  }, [dispatch]);

  const onStatusReport = useCallback((moduleName: string) => (status: any) => {
    dispatch({ type: 'REPORT_STATUS', payload: { ...status, moduleName } });
  }, [dispatch]);

  const platformStatusReport = useMemo(() => onStatusReport('Platform Dashboard'), [onStatusReport]);
  const communityStatusReport = useMemo(() => onStatusReport('Community Dashboard'), [onStatusReport]);
  const journeyStatusReport = useMemo(() => onStatusReport('Journey Dashboard'), [onStatusReport]);
  const userStatusReport = useMemo(() => onStatusReport('User Dashboard'), [onStatusReport]);
  const aiStatusReport = useMemo(() => onStatusReport('AI Dashboard'), [onStatusReport]);
  const geoStatusReport = useMemo(() => onStatusReport('Geo Dashboard'), [onStatusReport]);

  const platform = usePlatformDashboard(platformStatusReport);
  const community = useCommunityDashboard(communityStatusReport, onRealtimeEvent);
  const journey = useJourneyDashboard(timeRange, journeyStatusReport, onRealtimeEvent);
  const user = useUserDashboard(userStatusReport, onRealtimeEvent);
  const ai = useAiDashboard(aiStatusReport);
  const geo = useGeoDashboard(geoStatusReport);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      platform.refetch(),
      community.refetch(),
      journey.refetch(),
      user.refetch(),
      ai.refetch(),
      geo.refetch(),
    ]);
    setRefreshing(false);
  }, [platform.refetch, community.refetch, journey.refetch, user.refetch, ai.refetch, geo.refetch]);

  const runAutomation = async () => {
    setAutoState('running');
    setAutoError('');
    setAutoResult(null);
    try {
      const { data: result, error } = await supabase.functions.invoke('process-journey-tasks', { method: 'POST' });
      if (error) throw new Error(error.message);
      const r = result as { fetched: number; processed: number; failed: number; skipped: number };
      setAutoResult(r);
      setAutoState(r.fetched > 0 ? 'success' : 'error');
      if (r.fetched === 0) setAutoError('No pending tasks found to process.');
    } catch (e: any) {
      setAutoState('error');
      setAutoError(e?.message || 'Failed to run automation');
    }
  };

  // Build sparkline trend map
  const trendMap: Record<string, number[]> = {};
  if (journey.data.trends?.daily) {
    const days = journey.data.trends.daily;
    for (const key of ['users', 'posts', 'bookings', 'notifications', 'journeys'] as const) {
      trendMap[key] = days.filter(d => d[key] > 0).slice(-14).map(d => d[key]);
    }
  }

  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const health = platform.data.platform;
  const kpis = community.data.kpis;
  const activityFeed = community.data.activityFeed;
  const moderation = community.data.moderation;
  const trends = journey.data.trends;
  const expedition = journey.data.expedition;
  const adventure = journey.data.adventure;
  const trekpulse = journey.data.trekpulse;
  const infrastructure = platform.data.infrastructure;
  const userInsights = user.data.userInsights;
  const xpDistribution = user.data.xpDistribution;
  const insights = ai.data.insights;
  const geoData = geo.data.geo;

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8">
      {/* ── TOP HEADER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Command className="w-6 h-6 text-brand-emerald" />
            <h1 className="text-2xl lg:text-3xl font-bold font-heading text-gray-900">Treksin Control Center</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(currentTime)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatTime(currentTime)}</span>
            <span className={`flex items-center gap-1.5 ${health?.all_systems_operational ? 'text-emerald-600' : 'text-orange-600'}`}>
              <span className={`w-2 h-2 rounded-full ${health?.all_systems_operational ? 'bg-emerald-500' : 'bg-orange-500'} inline-block`} />
              {health?.all_systems_operational ? 'All Systems Operational' : 'Service Disruption'}
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Last Sync: {formatTime(currentTime)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={timeRange} onChange={e => changeTimeRange(Number(e.target.value) as any)}
            className="bg-white border border-black/10 rounded-xl px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-brand-emerald">
            <option value={7}>7 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
          </select>
          <button onClick={refreshAll} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/10 rounded-xl text-xs text-gray-600 hover:bg-black/5 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Dashboard
          </button>
        </div>
      </motion.div>

      {/* ── SECTION 1: PLATFORM HEALTH + LIVE KPIs ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <SectionHeader icon={Activity} title="Platform Health" subtitle="Service status overview" />
        <PlatformHealthCard health={health} isLoading={platform.isLoading} />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <SectionHeader icon={Gauge} title="Live Platform Overview" subtitle="Real-time ecosystem metrics" />
        <PlatformKpiGrid
          kpis={kpis}
          trendMap={trendMap}
          isLoading={community.isLoading}
        />
      </motion.div>

      {/* ── SECTION 2: ANALYTICS CHARTS ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-6">
        <SectionHeader icon={TrendingUp} title="Executive Analytics" subtitle="Growth and performance trends" />
        <AnalyticsChartGrid
          trends={trends}
          xpDistribution={xpDistribution}
          infrastructure={infrastructure}
          kpis={kpis}
          isLoading={journey.isLoading}
        />
      </motion.div>

      {/* ── SECTION 3: ACTIVITY FEED + TREKPULSE ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ActivityFeedCard entries={activityFeed} isLoading={community.isLoading} />
          <TrekPulseCard trekpulse={trekpulse} trends={trends} isLoading={journey.isLoading} />
        </div>
      </motion.div>

      {/* ── SECTION 4: AI INSIGHTS ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <SectionHeader icon={Lightbulb} title="AI Intelligence" subtitle="Automated platform insights" />
        <AiInsightCards insights={insights} isLoading={ai.isLoading} />
      </motion.div>

      {/* ── SECTION 5: GEO DISTRIBUTION ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <SectionHeader icon={Globe} title="Geographic Distribution" subtitle="Platform activity by region" />
        <GeoDistributionCards geo={geoData} isLoading={geo.isLoading} />
      </motion.div>

      {/* ── QUICK ACTION CENTER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        <SectionHeader icon={Zap} title="Quick Action Center" subtitle="Command shortcuts" />
        <QuickActionCenter autoState={autoState} onRunAutomation={runAutomation} />
      </motion.div>

      {/* ── SYSTEM HEALTH + MODERATION + USER INSIGHTS ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <SystemHealthCard infrastructure={infrastructure} isLoading={platform.isLoading} />
          <ModerationSummaryCard moderation={moderation} isLoading={community.isLoading} />
          <UserInsightsCard userInsights={userInsights} isLoading={user.isLoading} />
        </div>
      </motion.div>

      {/* ── EXPEDITION + ADVENTURE LOG ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ExpeditionInsightsCard expedition={expedition} isLoading={journey.isLoading} />
          <AdventureLogCard adventure={adventure} isLoading={journey.isLoading} />
        </div>
      </motion.div>

      {/* ── FOOTER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-center text-[10px] text-gray-400 pt-6 border-t border-black/5">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span>Treksin Executive Command Center v2.0</span>
          <span className="text-gray-300">·</span>
          <span>Data refreshes on demand</span>
          <span className="text-gray-300">·</span>
          <span>{health?.all_systems_operational ? 'All Systems Operational' : 'Degraded Performance'}</span>
        </div>
      </motion.div>

      {/* ── ANALYTICS HEALTH PANEL ── */}
      <AnalyticsHealthPanel />

      {/* ── AUTOMATION MODAL ── */}
      <AutomationModal
        autoState={autoState}
        autoResult={autoResult}
        autoError={autoError}
        onClose={() => setAutoState('idle')}
        onRetry={runAutomation}
      />
    </div>
  );
}

export function ExecutiveCommandCenter() {
  return (
    <AnalyticsHealthProvider>
      <DashboardInner />
    </AnalyticsHealthProvider>
  );
}
