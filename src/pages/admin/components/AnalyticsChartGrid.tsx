import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { TrendData, XpDistribution, InfrastructureMetrics, CommunityKpis } from '@/features/analytics/types';
import { EmptyState } from './shared/EmptyState';
import { SkeletonChart } from './shared/SkeletonGrid';

const BAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const tooltipStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11, color: '#111' };

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-black/5 p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = 'bg-brand-emerald', label, sub }: { value: number; max?: number; color?: string; label: string; sub?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-800 font-medium">{sub || `${value}`}</span>
      </div>
      <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Props {
  trends: TrendData | null;
  xpDistribution: XpDistribution[];
  infrastructure: InfrastructureMetrics | null;
  kpis: CommunityKpis | null;
  isLoading: boolean;
}

export function AnalyticsChartGrid({ trends, xpDistribution, infrastructure, kpis, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 9 }).map((_, i) => <SkeletonChart key={i} height={180} />)}
      </div>
    );
  }

  const trendData = trends?.daily || [];
  const weeklyData = trends?.weekly || [];
  const monthlyData = trends?.monthly || [];

  const hasTrends = trendData.length > 0 && trendData.some(d => d.users > 0 || d.journeys > 0 || d.posts > 0 || d.bookings > 0);

  if (!hasTrends && (!xpDistribution || xpDistribution.length === 0) && !infrastructure) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card title="Daily Users" subtitle="New user registrations">
          <EmptyState message="No user registration data yet" />
        </Card>
        <Card title="Weekly Users" subtitle="Weekly aggregation">
          <EmptyState message="No weekly data yet" />
        </Card>
        <Card title="Monthly Users" subtitle="Monthly aggregation">
          <EmptyState message="No monthly data yet" />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <Card title="Daily Users" subtitle="New user registrations">
        {hasTrends ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs><linearGradient id="du" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.15} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fill="url(#du)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Card>

      <Card title="Weekly Users" subtitle="Weekly aggregation">
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="users" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Card>

      <Card title="Monthly Users" subtitle="Monthly aggregation">
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="users" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Card>

      <Card title="Journey Growth" subtitle="Daily journey creation">
        {hasTrends ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData}>
              <defs><linearGradient id="jg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="journeys" stroke="#f59e0b" strokeWidth={2} fill="url(#jg)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Card>

      <Card title="Booking Growth" subtitle="Daily expedition bookings">
        {hasTrends ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendData}>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="bookings" fill="#ec4899" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Card>

      <Card title="Community Growth" subtitle="Daily post activity">
        {hasTrends ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="posts" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Card>

      <Card title="XP Distribution" subtitle="User experience levels">
        {xpDistribution.length > 0 && xpDistribution.some(x => x.count > 0) ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={xpDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                  {xpDistribution.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {xpDistribution.filter(x => x.count > 0).map((x, i) => (
                <span key={i} className="flex items-center gap-1 text-[9px] text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />{x.range}
                </span>
              ))}
            </div>
          </>
        ) : <EmptyState />}
      </Card>

      <Card title="Achievement Unlock Trend" subtitle="Daily unlocks">
        {hasTrends ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData}>
              <defs><linearGradient id="au" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} tickFormatter={v => v?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="achievements" stroke="#8b5cf6" strokeWidth={2} fill="url(#au)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Card>

      <Card title="Performance Summary" subtitle="Automation & delivery">
        {infrastructure ? (
          <div className="space-y-3 pt-2">
            <ProgressBar value={Math.min(infrastructure.cron_success_percentage, 100)} max={100} label="Automation Success Rate" sub={`${infrastructure.cron_success_percentage.toFixed(1)}%`} color="bg-brand-emerald" />
            <ProgressBar value={kpis?.notifications_sent_today ?? 0} max={Math.max(kpis?.notifications_sent_today ?? 0, 1)} label="Notifications Today" sub={`${kpis?.notifications_sent_today ?? 0}`} color="bg-purple-500" />
            <ProgressBar value={infrastructure.notification_queue_size} max={Math.max(infrastructure.notification_queue_size, 10)} label="Notification Queue" sub={`${infrastructure.notification_queue_size}`} color="bg-blue-500" />
            <ProgressBar value={infrastructure.automation_queue_size} max={Math.max(infrastructure.automation_queue_size, 5)} label="Automation Queue" sub={`${infrastructure.automation_queue_size}`} color="bg-amber-500" />
          </div>
        ) : <EmptyState message="No infrastructure metrics" />}
      </Card>
    </div>
  );
}
