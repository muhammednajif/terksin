/**
 * @deprecated Will be removed in the next major release. Use `src/features/analytics/` instead.
 * All RPC calls have been migrated to `src/features/analytics/services.ts` and
 * related hooks in `src/features/analytics/hooks/`.
 */
import { supabase } from './supabase';

export interface KpiStats {
  total_users: number;
  total_posts: number;
  total_journeys: number;
  total_bookings: number;
  total_completed_journeys: number;
  total_xp_all: number;
  total_distance_all: number;
  pending_reports: number;
  pending_safety: number;
}

export interface DailyTrend {
  date: string;
  users: number;
  posts: number;
  journeys: number;
  bookings: number;
  notifications: number;
}

export interface WeeklyGrowth {
  users: { this_week: number; last_week: number };
  posts: { this_week: number; last_week: number };
  journeys: { this_week: number; last_week: number };
  bookings: { this_week: number; last_week: number };
}

export interface GeoStats {
  countries: { country: string; count: number }[];
  top_treks: { trek_name: string; count: number }[];
}

export interface JourneyAnalytics {
  planned: number; active: number; completed: number; cancelled: number;
  avg_distance_km: number; longest_trek: string;
}

export interface CommunityAnalytics {
  posts_today: number; comments_today: number;
  follows_today: number; stories_active: number;
  top_creator_name: string;
}

export interface PlatformStatus {
  active_journeys: number; pending_reports: number;
  unread_notifications: number; pending_safety: number;
  confirmed_bookings: number; system_status: string;
}

export interface TrekPulseAnalytics {
  high_risk_trails: number; low_score_trails: number;
  avg_trail_score: number; reports_7d: number; weather_alerts: number;
}

export interface TopTrek {
  trek_id: string; trek_name: string; count: number;
}

export interface AdminActivityEntry {
  id: string; admin_id: string | null; action: string;
  entity_type: string; entity_id: string | null;
  details: Record<string, unknown> | null; created_at: string;
  admin?: { display_name: string | null; avatar_url: string | null };
}

// ─── Helpers ────────────────────────────────────────────

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const weekStart = (offset = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - offset * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const countAll = async (table: string): Promise<number> => {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return count ?? 0;
};

const countSince = async (table: string, col: string, since: string): Promise<number> => {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).gte(col, since);
  return count ?? 0;
};

const countBetween = async (table: string, col: string, start: string, end: string): Promise<number> => {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).gte(col, start).lt(col, end);
  return count ?? 0;
};

// ─── KPI Stats ─────────────────────────────────────────

export async function fetchKpiStats(): Promise<KpiStats> {
  const [totalUsers, totalPosts, totalJourneys, totalBookings, completedJourneys, xpSum, distSum, reportsPending, safetyPending] = await Promise.all([
    countAll('profiles'),
    countAll('posts'),
    countAll('trek_journeys'),
    countAll('expedition_bookings'),
    supabase.from('trek_journeys').select('*', { count: 'exact', head: true }).eq('status', 'completed').then(r => r.count ?? 0),
    supabase.from('profiles').select('xp').then(r => (r.data || []).reduce((s: number, p: any) => s + (p.xp || 0), 0)),
    supabase.from('profiles').select('total_distance_km').then(r => (r.data || []).reduce((s: number, p: any) => s + (p.total_distance_km || 0), 0)),
    supabase.from('community_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
    supabase.from('safety_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
  ]);

  return {
    total_users: totalUsers,
    total_posts: totalPosts,
    total_journeys: totalJourneys,
    total_bookings: totalBookings,
    total_completed_journeys: completedJourneys,
    total_xp_all: xpSum,
    total_distance_all: Math.round(distSum * 10) / 10,
    pending_reports: reportsPending,
    pending_safety: safetyPending,
  };
}

// ─── Daily Trends ─────────────────────────────────────

export async function fetchDailyTrends(days = 30): Promise<DailyTrend[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const startStr = start.toISOString();

  const dayMap: Record<string, DailyTrend> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayMap[key] = { date: key, users: 0, posts: 0, journeys: 0, bookings: 0, notifications: 0 };
  }

  const [usersRaw, postsRaw, journeysRaw, bookingsRaw, notifsRaw] = await Promise.all([
    supabase.from('profiles').select('created_at').gte('created_at', startStr),
    supabase.from('posts').select('created_at').gte('created_at', startStr),
    supabase.from('trek_journeys').select('created_at').gte('created_at', startStr),
    supabase.from('expedition_bookings').select('created_at').gte('created_at', startStr),
    supabase.from('notifications').select('created_at').gte('created_at', startStr),
  ]);

  const inc = (rows: any[] | null, key: 'users' | 'posts' | 'journeys' | 'bookings' | 'notifications') => {
    if (!rows) return;
    for (const row of rows) {
      const dateKey = row.created_at?.slice(0, 10);
      if (dateKey && dayMap[dateKey]) dayMap[dateKey][key]++;
    }
  };

  inc(usersRaw.data, 'users');
  inc(postsRaw.data, 'posts');
  inc(journeysRaw.data, 'journeys');
  inc(bookingsRaw.data, 'bookings');
  inc(notifsRaw.data, 'notifications');

  return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Weekly Growth ────────────────────────────────────

export async function fetchWeeklyGrowth(): Promise<WeeklyGrowth> {
  const thisWeek = weekStart(0);
  const lastWeekStart = weekStart(1);
  const lastWeekEnd = weekStart(0);

  const [thisUsers, lastUsers, thisPosts, lastPosts, thisJourneys, lastJourneys, thisBookings, lastBookings] = await Promise.all([
    countSince('profiles', 'created_at', thisWeek),
    countBetween('profiles', 'created_at', lastWeekStart, lastWeekEnd),
    countSince('posts', 'created_at', thisWeek),
    countBetween('posts', 'created_at', lastWeekStart, lastWeekEnd),
    countSince('trek_journeys', 'created_at', thisWeek),
    countBetween('trek_journeys', 'created_at', lastWeekStart, lastWeekEnd),
    countSince('expedition_bookings', 'created_at', thisWeek),
    countBetween('expedition_bookings', 'created_at', lastWeekStart, lastWeekEnd),
  ]);

  return {
    users: { this_week: thisUsers, last_week: lastUsers },
    posts: { this_week: thisPosts, last_week: lastPosts },
    journeys: { this_week: thisJourneys, last_week: lastJourneys },
    bookings: { this_week: thisBookings, last_week: lastBookings },
  };
}

// ─── Top Treks ───────────────────────────────────────

export async function fetchTopTreks(): Promise<TopTrek[]> {
  const { data } = await supabase.from('trek_journeys').select('trek_id, trek_name');
  if (!data) return [];

  const counts: Record<string, { trek_id: string; trek_name: string; count: number }> = {};
  for (const j of data) {
    const id = j.trek_id || 'unknown';
    if (!counts[id]) counts[id] = { trek_id: id, trek_name: j.trek_name || 'Unknown', count: 0 };
    counts[id].count++;
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ trek_id, trek_name, count }) => ({ trek_id, trek_name, count }));
}

// ─── Geo Stats ───────────────────────────────────────

export async function fetchGeoStats(): Promise<GeoStats> {
  const { data: profiles } = await supabase.from('profiles').select('location').not('location', 'is', null).not('location', 'eq', '');
  const countries: Record<string, number> = {};
  for (const p of profiles || []) {
    const loc = p.location || 'Unknown';
    countries[loc] = (countries[loc] || 0) + 1;
  }

  const { data: journeys } = await supabase.from('trek_journeys').select('trek_name').not('trek_name', 'is', null);
  const topTreks: Record<string, number> = {};
  for (const j of journeys || []) {
    const name = j.trek_name || 'Unknown';
    topTreks[name] = (topTreks[name] || 0) + 1;
  }

  return {
    countries: Object.entries(countries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([country, count]) => ({ country, count })),
    top_treks: Object.entries(topTreks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([trek_name, count]) => ({ trek_name, count })),
  };
}

// ─── Journey Analytics ───────────────────────────────

export async function fetchJourneyAnalytics(): Promise<JourneyAnalytics> {
  const statuses = ['planned', 'active', 'completed', 'cancelled'] as const;
  const [planned, active, completed, cancelled] = await Promise.all(
    statuses.map(s =>
      supabase.from('trek_journeys').select('*', { count: 'exact', head: true }).eq('status', s).then(r => r.count ?? 0)
    )
  );

  let longestTrek = 'N/A';
  const { data: journeys } = await supabase
    .from('trek_journeys')
    .select('trek_name, end_date, start_date')
    .eq('status', 'completed')
    .not('end_date', 'is', null)
    .not('start_date', 'is', null);
  if (journeys && journeys.length > 0) {
    let maxDays = 0;
    for (const j of journeys) {
      const days = (new Date(j.end_date).getTime() - new Date(j.start_date).getTime()) / (1000 * 60 * 60 * 24);
      if (days > maxDays) {
        maxDays = days;
        longestTrek = j.trek_name || 'N/A';
      }
    }
  }

  return {
    planned,
    active,
    completed,
    cancelled,
    avg_distance_km: 0,
    longest_trek: longestTrek,
  };
}

// ─── Community Analytics ─────────────────────────────

export async function fetchCommunityAnalytics(): Promise<CommunityAnalytics> {
  const todayStr = today();

  const [postsToday, commentsToday, followsToday, storiesActive] = await Promise.all([
    countSince('posts', 'created_at', todayStr),
    countSince('post_comments', 'created_at', todayStr),
    countSince('follows', 'created_at', todayStr),
    supabase.from('stories').select('*', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString()).then(r => r.count ?? 0),
  ]);

  let topCreatorName = '';
  const { data: topCreator } = await supabase
    .from('profiles')
    .select('display_name')
    .order('followers_count', { ascending: false })
    .limit(1);
  if (topCreator && topCreator.length > 0) {
    topCreatorName = topCreator[0].display_name || 'Unknown';
  }

  return {
    posts_today: postsToday,
    comments_today: commentsToday,
    follows_today: followsToday,
    stories_active: storiesActive,
    top_creator_name: topCreatorName,
  };
}

// ─── Platform Status ─────────────────────────────────

export async function fetchPlatformStatus(): Promise<PlatformStatus> {
  const [activeJourneys, pendingReports, unreadNotifs, pendingSafety, confirmedBookings] = await Promise.all([
    supabase.from('trek_journeys').select('*', { count: 'exact', head: true }).eq('status', 'active').then(r => r.count ?? 0),
    supabase.from('community_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false).then(r => r.count ?? 0),
    supabase.from('safety_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
    supabase.from('expedition_bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed').then(r => r.count ?? 0),
  ]);

  return {
    active_journeys: activeJourneys,
    pending_reports: pendingReports,
    unread_notifications: unreadNotifs,
    pending_safety: pendingSafety,
    confirmed_bookings: confirmedBookings,
    system_status: 'healthy',
  };
}

// ─── TrekPulse Analytics ─────────────────────────────

export async function fetchTrekPulseAnalytics(): Promise<TrekPulseAnalytics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [highRisk, lowScore, avgScore, reports7d, weatherAlerts] = await Promise.all([
    supabase.from('trekpulse_trail_scores').select('*', { count: 'exact', head: true }).in('trail_risk', ['high', 'extreme']).then(r => r.count ?? 0),
    supabase.from('trekpulse_trail_scores').select('*', { count: 'exact', head: true }).lt('score', 50).then(r => r.count ?? 0),
    supabase.from('trekpulse_trail_scores').select('score').then(r => {
      const scores = (r.data || []).map((s: any) => s.score).filter(Boolean);
      return scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 85;
    }),
    supabase.from('trekpulse_reports').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).then(r => r.count ?? 0),
    supabase.from('trekpulse_trail_scores').select('*', { count: 'exact', head: true }).eq('weather_status', 'poor').then(r => r.count ?? 0),
  ]);

  return {
    high_risk_trails: highRisk,
    low_score_trails: lowScore,
    avg_trail_score: avgScore,
    reports_7d: reports7d,
    weather_alerts: weatherAlerts,
  };
}

// ─── XP Distribution ─────────────────────────────────

export async function fetchXpDistribution(): Promise<{ range: string; count: number }[]> {
  const { data: profiles } = await supabase.from('profiles').select('xp');
  const ranges: Record<string, number> = { '0-100': 0, '100-500': 0, '500-2000': 0, '2000-5000': 0, '5000-15000': 0, '15000+': 0 };

  for (const p of profiles || []) {
    const xp = p.xp || 0;
    if (xp <= 100) ranges['0-100']++;
    else if (xp <= 500) ranges['100-500']++;
    else if (xp <= 2000) ranges['500-2000']++;
    else if (xp <= 5000) ranges['2000-5000']++;
    else if (xp <= 15000) ranges['5000-15000']++;
    else ranges['15000+']++;
  }

  return Object.entries(ranges).map(([range, count]) => ({ range, count }));
}

// ─── Recent signups ──────────────────────────────────

export interface UserSignup {
  id: string; display_name: string | null; avatar_url: string | null;
  xp: number; completed_treks: number; created_at: string;
}

export async function fetchRecentSignups(limit = 10): Promise<UserSignup[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, xp, completed_treks, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as UserSignup[];
}

// ─── Admin Activity ──────────────────────────────────

export async function fetchAdminActivity(limit = 50): Promise<AdminActivityEntry[]> {
  const { data } = await supabase
    .from('admin_audit_log')
    .select('*, admin:profiles!admin_id(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as AdminActivityEntry[];
}

// ─── Smart Insights (rules-based) ────────────────────

export interface SmartInsight {
  priority: 'critical' | 'warning' | 'suggestion' | 'information';
  title: string;
  message: string;
  metric?: string;
  change?: number;
  direction?: 'up' | 'down';
}

export function generateSmartInsights(
  growth: WeeklyGrowth,
  community: CommunityAnalytics,
  trekpulse: TrekPulseAnalytics,
  journey: JourneyAnalytics,
  kpi: KpiStats,
): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // Community activity
  const totalActivity = community.posts_today + community.comments_today + community.follows_today;
  if (totalActivity > 50) {
    insights.push({
      priority: 'information',
      title: 'Community activity is thriving',
      message: `${totalActivity} interactions today — posts, comments, and follows are trending.`,
      metric: 'Community Activity',
      direction: 'up',
    });
  }

  // User growth
  const userGrowth = growth.users.last_week > 0
    ? Math.round(((growth.users.this_week - growth.users.last_week) / growth.users.last_week) * 100)
    : 0;
  if (userGrowth > 20) {
    insights.push({
      priority: 'suggestion',
      title: `User growth spiked ${userGrowth}% this week`,
      message: `${growth.users.this_week} new users joined this week vs ${growth.users.last_week} last week.`,
      metric: 'User Growth',
      change: userGrowth,
      direction: 'up',
    });
  }

  // TrekPulse
  if (trekpulse.high_risk_trails > 2) {
    insights.push({
      priority: 'warning',
      title: `${trekpulse.high_risk_trails} trails at high risk`,
      message: `Trail confidence is dropping. ${trekpulse.weather_alerts} weather alerts active.`,
      metric: 'Trail Risk',
      direction: 'down',
    });
  }

  // Journey completion
  const totalJourneys = journey.planned + journey.active + journey.completed + journey.cancelled;
  if (totalJourneys > 0) {
    const completionRate = Math.round((journey.completed / totalJourneys) * 100);
    if (completionRate > 50) {
      insights.push({
        priority: 'information',
        title: `Journey completion rate at ${completionRate}%`,
        message: `${journey.completed} of ${totalJourneys} journeys completed. Users are staying engaged.`,
        metric: 'Completion Rate',
        direction: 'up',
      });
    }
  }

  // Pending moderation
  if (kpi.pending_reports > 5) {
    insights.push({
      priority: 'warning',
      title: `${kpi.pending_reports} community reports pending`,
      message: 'Moderation queue is growing. Review pending reports to keep the community healthy.',
      metric: 'Pending Reports',
      direction: 'up',
    });
  }

  // Booking vs journey ratio
  if (kpi.total_bookings > 0 && kpi.total_journeys > 0) {
    const ratio = Math.round((kpi.total_bookings / kpi.total_journeys) * 100);
    if (ratio > 30) {
      insights.push({
        priority: 'information',
        title: `Bookings are ${ratio}% of total journeys`,
        message: 'Expedition bookings are converting well from planned journeys.',
        metric: 'Booking Ratio',
        direction: 'up',
      });
    }
  }

  return insights;
}

// ─── All-in-one fetch ────────────────────────────────

export interface AllAnalytics {
  kpi: KpiStats;
  trends: DailyTrend[];
  growth: WeeklyGrowth;
  topTreks: TopTrek[];
  geo: GeoStats;
  journey: JourneyAnalytics;
  community: CommunityAnalytics;
  status: PlatformStatus;
  trekpulse: TrekPulseAnalytics;
  xpDistribution: { range: string; count: number }[];
  recentSignups: UserSignup[];
  adminActivity: AdminActivityEntry[];
  insights: SmartInsight[];
}

export async function fetchAllAnalytics(days = 30): Promise<AllAnalytics> {
  const [kpi, trends, growth, topTreks, geo, journey, community, status, trekpulse, xpDist, signups, activity] = await Promise.all([
    fetchKpiStats(),
    fetchDailyTrends(days),
    fetchWeeklyGrowth(),
    fetchTopTreks(),
    fetchGeoStats(),
    fetchJourneyAnalytics(),
    fetchCommunityAnalytics(),
    fetchPlatformStatus(),
    fetchTrekPulseAnalytics(),
    fetchXpDistribution(),
    fetchRecentSignups(),
    fetchAdminActivity(),
  ]);

  return {
    kpi, trends, growth, topTreks, geo, journey, community, status, trekpulse,
    xpDistribution: xpDist,
    recentSignups: signups,
    adminActivity: activity,
    insights: generateSmartInsights(growth, community, trekpulse, journey, kpi),
  };
}
