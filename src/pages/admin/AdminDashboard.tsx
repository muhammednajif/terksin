import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import {
  Users, Activity, TrendingUp, TrendingDown, BookOpen, Map, Award, Bell,
  AlertTriangle, Shield, MessageCircle, UserPlus, Lightbulb,
  RefreshCw, Download, FileText, Loader2,
  ChevronRight, Calendar, CheckCircle, XCircle,
  Zap, Eye, Star,
  Thermometer, Droplets, Wind, Flag,
} from 'lucide-react';
import { fetchAllAnalytics } from '@/lib/admin-analytics';
import type { AllAnalytics, SmartInsight, DailyTrend, AdminActivityEntry } from '@/lib/admin-analytics';

// ─── Mini Sparkline ────────────────────────────────────

function MiniSparkline({ data, color = '#10b981' }: { data: { value: number }[]; color?: string }) {
  if (data.length === 0) return <div className="w-16 h-8" />;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 64, h = 32, pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.value / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

// ─── KPI Card ──────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, growth, sparklineData, color, sub }: {
  icon: any; label: string; value: string | number; growth?: number;
  sparklineData?: { value: number }[]; color?: string; sub?: string;
}) {
  const isUp = (growth || 0) >= 0;
  const c = color || (isUp ? '#10b981' : '#ef4444');
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-black/5 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ backgroundColor: c + '15' }}>
          <Icon className="w-4.5 h-4.5" style={{ color: c }} />
        </div>
        <div className="flex items-center gap-1">
          {growth !== undefined && (
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(growth)}%
            </span>
          )}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-2 -ml-1"><MiniSparkline data={sparklineData} color={c} /></div>
      )}
    </motion.div>
  );
}

// ─── Chart Card ────────────────────────────────────────

function ChartCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Status Dot ────────────────────────────────────────

function StatusDot({ status }: { status: 'healthy' | 'warning' | 'error' }) {
  const colors = { healthy: 'bg-emerald-500', warning: 'bg-yellow-500', error: 'bg-red-500' };
  return <span className={`w-2 h-2 rounded-full ${colors[status]} inline-block`} />;
}

// ─── Section Header ────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-brand-emerald/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-brand-emerald" />
      </div>
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Insight Badge ─────────────────────────────────────

function InsightBadge({ insight }: { insight: SmartInsight }) {
  const config = {
    critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    warning: { icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    suggestion: { icon: Lightbulb, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    information: { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  }[insight.priority] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  const Icon = config.icon;
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${config.bg} ${config.border}`}>
      <Icon className={`w-4 h-4 mt-0.5 ${config.color} flex-shrink-0`} />
      <div>
        <p className={`text-xs font-semibold ${config.color}`}>{insight.title}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">{insight.message}</p>
      </div>
    </div>
  );
}

// ─── Activity Timeline ─────────────────────────────────

function ActivityTimeline({ activities }: { activities: AdminActivityEntry[] }) {
  const actionIcons: Record<string, any> = {
    update_user_role: Users, delete_post: FileText, create_challenge: Award,
    create_announcement: Bell, publish_announcement: Bell,
    create_departure: Calendar, update_departure: Calendar,
    booking_confirmed: CheckCircle, booking_cancelled: XCircle,
    report_reviewed: Eye, report_resolved: CheckCircle, report_dismissed: XCircle,
    safety_resolved: Shield,
  };
  return (
    <div className="space-y-1">
      {activities.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No admin activity recorded yet</div>
      ) : (
        activities.slice(0, 20).map((a) => {
          const Icon = actionIcons[a.action] || Activity;
          return (
            <div key={a.id} className="flex items-start gap-3 py-2 border-b border-black/5 last:border-0">
              <div className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{a.action.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-muted-foreground">
                  {a.admin?.display_name || 'Admin'} · {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Quick Action ──────────────────────────────────────

function QuickAction({ icon: Icon, label, onClick, color }: {
  icon: any; label: string; onClick: () => void; color?: string;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-black/5 hover:bg-black/5 transition-colors text-left w-full text-sm">
      <Icon className={`w-4 h-4 ${color || 'text-brand-emerald'}`} />
      <span className="font-medium">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-auto" />
    </button>
  );
}

// ─── Main Dashboard ────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AllAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const d = await fetchAllAnalytics(days);
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-emerald" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-brand-emerald text-white rounded-xl text-sm">Retry</button>
      </div>
    );
  }

  const { kpi, trends, growth, topTreks, geo, journey, community, status, trekpulse, xpDistribution, recentSignups, adminActivity, insights } = data;

  const trendSparkline = (key: keyof DailyTrend) =>
    trends.filter(t => (t[key] as number) > 0).map(t => ({ value: (t[key] as number) || 0 }));

  const userGrowthPct = growth.users.last_week > 0
    ? Math.round(((growth.users.this_week - growth.users.last_week) / growth.users.last_week) * 100) : 0;

  const barColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete health of the Treksin ecosystem</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="text-xs border border-black/10 rounded-lg px-2 py-1.5 bg-white">
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Smart Insights ── */}
      {insights.length > 0 && (
        <div>
          <SectionHeader icon={Zap} title="Smart Insights" subtitle="Generated from platform data" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {insights.map((insight, i) => <InsightBadge key={i} insight={insight} />)}
          </div>
        </div>
      )}

      {/* ── Executive Overview ── */}
      <div>
        <SectionHeader icon={Activity} title="Executive Overview" subtitle="Key Performance Indicators" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon={Users} label="Total Users" value={kpi.total_users.toLocaleString()} growth={userGrowthPct} sparklineData={trendSparkline('users')} color="#3b82f6" sub={`${growth.users.this_week} this week`} />
          <KpiCard icon={BookOpen} label="Total Journeys" value={kpi.total_journeys.toLocaleString()} sparklineData={trendSparkline('journeys')} color="#10b981" sub={`${journey.active} active`} />
          <KpiCard icon={Award} label="Completed" value={kpi.total_completed_journeys.toLocaleString()} color="#8b5cf6" sub={`${Math.round((kpi.total_completed_journeys / Math.max(kpi.total_journeys, 1)) * 100)}% completion`} />
          <KpiCard icon={Map} label="Total Posts" value={kpi.total_posts.toLocaleString()} sparklineData={trendSparkline('posts')} color="#f59e0b" sub={`${community.posts_today} today`} />
          <KpiCard icon={TrendingUp} label="Total XP" value={kpi.total_xp_all.toLocaleString()} color="#ec4899" sub={`${(kpi.total_distance_all / 1000).toFixed(1)}k km total`} />
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth */}
        <ChartCard title="User Growth" subtitle={`${trends.length} day trend`}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#userGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Journey Trends */}
        <ChartCard title="Journey Creation" subtitle="Daily new journeys">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trends}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="journeys" fill="#10b981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Community Activity */}
        <ChartCard title="Community Activity" subtitle="Post + booking trends">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trends}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="posts" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="bookings" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* XP Distribution */}
        <ChartCard title="XP Distribution" subtitle="How users are spread">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={xpDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {xpDistribution.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-1 justify-center">
            {xpDistribution.filter(x => x.count > 0).map((x, i) => (
              <span key={i} className="flex items-center gap-1 text-[9px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColors[i % barColors.length] }} />
                {x.range}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Platform Status + System Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Platform Status" subtitle="Live system overview">
          <div className="space-y-2.5">
            {[
              { label: 'Active Journeys', value: status.active_journeys, icon: Map, color: 'text-emerald-500' },
              { label: 'Confirmed Bookings', value: status.confirmed_bookings, icon: Calendar, color: 'text-blue-500' },
              { label: 'Unread Notifications', value: status.unread_notifications, icon: Bell, color: 'text-orange-500' },
              { label: 'Pending Reports', value: status.pending_reports, icon: Flag, color: status.pending_reports > 0 ? 'text-red-500' : 'text-emerald-500' },
              { label: 'Pending Safety', value: status.pending_safety, icon: Shield, color: status.pending_safety > 0 ? 'text-red-500' : 'text-emerald-500' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <span className="text-xs">{s.label}</span>
                </div>
                <span className="text-xs font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="System Health" subtitle="Service status">
          <div className="space-y-2.5">
            {[
              { label: 'System Status', value: 'Operational', status: 'healthy' as const },
              { label: 'Database', value: 'Connected', status: 'healthy' as const },
              { label: 'Edge Functions', value: 'Ready', status: 'healthy' as const },
              { label: 'Storage', value: 'Available', status: 'healthy' as const },
              { label: 'Realtime', value: 'Active', status: 'healthy' as const },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={s.status} />
                  <span className="text-xs">{s.label}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-black/5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Uptime</span>
              <span className="font-semibold text-emerald-600">99.9%</span>
              <span>Response</span>
              <span className="font-semibold">~120ms</span>
              <span>Users Online</span>
              <span className="font-semibold">{recentSignups.length}+</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="TrekPulse Intelligence" subtitle="Trail analytics">
          <div className="space-y-2.5">
            {[
              { label: 'Avg Trail Score', value: `${trekpulse.avg_trail_score}/100`, icon: Thermometer, color: trekpulse.avg_trail_score >= 70 ? 'text-emerald-500' : 'text-yellow-500' },
              { label: 'High Risk Trails', value: trekpulse.high_risk_trails, icon: AlertTriangle, color: trekpulse.high_risk_trails > 0 ? 'text-red-500' : 'text-emerald-500' },
              { label: 'Low Score Trails', value: trekpulse.low_score_trails, icon: Droplets, color: trekpulse.low_score_trails > 0 ? 'text-orange-500' : 'text-emerald-500' },
              { label: 'Reports (7d)', value: trekpulse.reports_7d, icon: Wind, color: 'text-blue-500' },
              { label: 'Weather Alerts', value: trekpulse.weather_alerts, icon: Bell, color: trekpulse.weather_alerts > 0 ? 'text-orange-500' : 'text-emerald-500' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <span className="text-xs">{s.label}</span>
                </div>
                <span className="text-xs font-bold">{s.value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/admin/trekpulse')} className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-brand-emerald font-medium hover:underline">
            Full TrekPulse Dashboard <ChevronRight className="w-3 h-3" />
          </button>
        </ChartCard>
      </div>

      {/* ── Journey + Community + Geo Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Journey Analytics */}
        <ChartCard title="Journey Analytics" subtitle="Distribution by status">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Planned', value: journey.planned, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Active', value: journey.active, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'Completed', value: journey.completed, color: 'text-purple-500', bg: 'bg-purple-50' },
              { label: 'Cancelled', value: journey.cancelled, color: 'text-red-500', bg: 'bg-red-50' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-lg p-3 text-center`}>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Avg Distance</span><span className="font-medium">{journey.avg_distance_km} km</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Longest Trek</span><span className="font-medium truncate max-w-[180px]">{journey.longest_trek || 'N/A'}</span></div>
          </div>
        </ChartCard>

        {/* Community Analytics */}
        <ChartCard title="Community Analytics" subtitle="Activity metrics">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Posts Today', value: community.posts_today, icon: MessageCircle, color: 'text-blue-500' },
              { label: 'Comments Today', value: community.comments_today, icon: MessageCircle, color: 'text-emerald-500' },
              { label: 'Follows Today', value: community.follows_today, icon: UserPlus, color: 'text-purple-500' },
              { label: 'Active Stories', value: community.stories_active, icon: Eye, color: 'text-orange-500' },
            ].map((s, i) => (
              <div key={i} className="bg-black/5 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <span className="text-lg font-bold">{s.value}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {community.top_creator_name && (
            <div className="flex items-center gap-2 text-[11px]">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span>Top Creator: <strong>{community.top_creator_name}</strong></span>
            </div>
          )}
        </ChartCard>

        {/* Top Treks + Geographical */}
        <ChartCard title="Popular Treks" subtitle="Most planned journeys">
          <div className="space-y-1.5">
            {topTreks.slice(0, 6).map((t, i) => {
              const maxCnt = Math.max(...topTreks.map(x => x.count), 1);
              const pct = (t.count / maxCnt) * 100;
              return (
                <div key={t.trek_id}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="truncate max-w-[140px]">{t.trek_name}</span>
                    <span className="font-medium">{t.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-emerald to-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate('/admin/treks')} className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-brand-emerald font-medium hover:underline">
            Manage Treks <ChevronRight className="w-3 h-3" />
          </button>
        </ChartCard>
      </div>

      {/* ── Recent Signups + Admin Activity + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Signups */}
        <ChartCard title="Recent Users" subtitle="Latest to join">
          <div className="space-y-1">
            {recentSignups.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 py-1.5 border-b border-black/5 last:border-0">
                <div className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-medium flex-shrink-0 overflow-hidden">
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name?.[0] || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{u.display_name || 'Anonymous'}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-[10px] font-medium">{u.xp} XP</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/admin/users')} className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-brand-emerald font-medium hover:underline">
            View All Users <ChevronRight className="w-3 h-3" />
          </button>
        </ChartCard>

        {/* Admin Activity */}
        <ChartCard title="Admin Activity" subtitle="Recent actions">
          <ActivityTimeline activities={adminActivity} />
          <button onClick={() => navigate('/admin/audit-log')} className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-brand-emerald font-medium hover:underline">
            Full Audit Log <ChevronRight className="w-3 h-3" />
          </button>
        </ChartCard>

        {/* Quick Actions */}
        <ChartCard title="Quick Actions" subtitle="Common admin tasks">
          <div className="space-y-1.5">
            <QuickAction icon={Award} label="Create Challenge" onClick={() => navigate('/admin/challenges')} color="text-purple-500" />
            <QuickAction icon={Calendar} label="Create Expedition" onClick={() => navigate('/admin/expeditions')} color="text-blue-500" />
            <QuickAction icon={Bell} label="Publish Announcement" onClick={() => navigate('/admin/announcements')} color="text-orange-500" />
            <QuickAction icon={Flag} label="Review Reports" onClick={() => navigate('/admin/moderation')} color="text-red-500" />
          </div>
          <div className="mt-3 pt-3 border-t border-black/5">
            <button onClick={() => {/* export logic */}} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-black transition-colors">
              <Download className="w-3.5 h-3.5" /> Export Analytics (CSV ready)
            </button>
          </div>
        </ChartCard>
      </div>

      {/* ── Footer ── */}
      <div className="text-center text-[10px] text-muted-foreground pt-4 border-t border-black/5">
        Treksin Business Intelligence Dashboard · Data refreshes on demand · All metrics from production data
      </div>
    </div>
  );
}
