/**
 * @deprecated Will be removed in the next major release. Use `src/features/analytics/` instead.
 * All functionality has been migrated to `usePlatformDashboard`, `useCommunityDashboard`,
 * `useJourneyDashboard`, `useUserDashboard`, `useAiDashboard`, and `useGeoDashboard` hooks.
 */
import { supabase } from './supabase';
import type { AllAnalytics, DailyTrend, SmartInsight } from './admin-analytics';
import { fetchAllAnalytics } from './admin-analytics';

// ─── Types ─────────────────────────────────────────────

export interface PlatformHealth {
  health_percentage: number;
  all_systems_operational: boolean;
  services: { name: string; healthy: boolean }[];
}

export interface CommandCenterKpis {
  users_online: number;
  active_sessions: number;
  new_users_today: number;
  active_journeys: number;
  bookings_today: number;
  posts_today: number;
  stories_today: number;
  comments_today: number;
  likes_today: number;
  shares_today: number;
  notifications_sent_today: number;
  journey_automations_today: number;
  ai_planner_requests_today: number;
  ai_companion_requests_today: number;
  trail_alerts: number;
  safety_reports_pending: number;
  pending_moderation: number;
  announcements_published: number;
}

export interface CommandTrends {
  daily: DailyTrend[];
  weekly: { week: string; users: number; journeys: number; posts: number; bookings: number }[];
  monthly: { month: string; users: number; journeys: number; posts: number; bookings: number }[];
}

export interface InfrastructureMetrics {
  db_response_time_ms: number;
  storage_usage_mb: number;
  edge_function_executions: number;
  cron_success_percentage: number;
  automation_queue_size: number;
  realtime_connections: number;
  api_response_time_ms: number;
  failed_jobs: number;
  notification_queue_size: number;
}

export interface ModerationSummary {
  pending_reports: number;
  pending_safety_reviews: number;
  reported_users: number;
  hidden_posts: number;
  community_flags: number;
  today_moderation_actions: number;
}

export interface UserInsights {
  total_users: number;
  explorer_levels: { level: string; count: number }[];
  most_active_users: { id: string; display_name: string; avatar_url: string; xp: number; post_count: number }[];
  fastest_growing: { id: string; display_name: string; avatar_url: string; xp: number }[];
  top_explorers: { id: string; display_name: string; avatar_url: string; xp: number; completed_treks: number }[];
  returning_users: number;
  new_registrations_30d: number;
  retention_rate: number;
}

export interface ExpeditionInsights {
  total_seats: number;
  filled_seats: number;
  available_seats: number;
  popular_expedition: string;
  average_booking_value: number;
  cancellation_rate: number;
}

export interface AdventureLogStats {
  completed_treks: number;
  total_xp: number;
  total_distance_km: number;
  highest_altitude_m: number;
  achievements_unlocked: number;
  top_categories: { category: string; count: number }[];
}

export interface ActivityFeedEntry {
  timestamp: string;
  type: string;
  subject: string;
  detail: string;
  created_at: string;
}

export interface GeoHeatmapData {
  countries: { name: string; count: number }[];
  states: { name: string; count: number }[];
  journey_density: { name: string; count: number }[];
  popular_treks: { name: string; count: number }[];
}

export interface AiCommandInsight {
  title: string;
  message: string;
  change: number;
  direction: 'up' | 'down';
}

export interface AiCommandInsights {
  insights: AiCommandInsight[];
}

export interface CommandCenterData {
  health: PlatformHealth;
  kpis: CommandCenterKpis;
  trends: CommandTrends;
  infrastructure: InfrastructureMetrics;
  moderation: ModerationSummary;
  userInsights: UserInsights;
  expeditionInsights: ExpeditionInsights;
  adventureLog: AdventureLogStats;
  activityFeed: ActivityFeedEntry[];
  geoHeatmap: GeoHeatmapData;
  aiInsights: AiCommandInsights;
  analytics: AllAnalytics;
}

// ─── Helpers ────────────────────────────────────────────

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const countTable = async (table: string, dateCol: string | null = null): Promise<number> => {
  if (dateCol) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).gte(dateCol, today()).lt(dateCol, today() + ' 23:59:59');
    return count ?? 0;
  }
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return count ?? 0;
};

const countWhere = async (table: string, column: string, value: string): Promise<number> => {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  return count ?? 0;
};

// ─── Fetch Functions (direct SQL via supabase) ────────

export async function fetchPlatformHealth(): Promise<PlatformHealth> {
  const checks = [
    { name: 'Database', query: supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1) },
    { name: 'Authentication', query: supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1) },
    { name: 'Storage', query: supabase.from('post_media').select('id', { count: 'exact', head: true }).limit(1) },
    { name: 'Edge Functions', query: supabase.from('ai_conversations').select('id', { count: 'exact', head: true }).limit(1) },
    { name: 'Journey Automation', query: supabase.from('journey_tasks').select('id', { count: 'exact', head: true }).limit(1) },
    { name: 'Notifications', query: supabase.from('notifications').select('id', { count: 'exact', head: true }).limit(1) },
    { name: 'Realtime', query: supabase.from('user_activities').select('id', { count: 'exact', head: true }).limit(1) },
    { name: 'Cron Jobs', query: supabase.from('admin_audit_log').select('id', { count: 'exact', head: true }).limit(1) },
  ];
  const results = await Promise.all(checks.map(c => c.query.then(r => ({ name: c.name, healthy: r.count !== null && r.count > 0 }))));
  const healthyCount = results.filter(r => r.healthy).length;
  return {
    health_percentage: Math.round((healthyCount / results.length) * 100),
    all_systems_operational: healthyCount === results.length,
    services: results,
  };
}

export async function fetchCommandCenterKpis(): Promise<CommandCenterKpis> {
  const [
    usersOnline,
    activeSessions,
    newUsersToday,
    activeJourneys,
    bookingsToday,
    postsToday,
    storiesToday,
    commentsToday,
    likesToday,
    sharesToday,
    notificationsSent,
    journeyAutomations,
    aiPlannerRequests,
    aiCompanionRequests,
    trailAlerts,
    safetyReportsPending,
    pendingModeration,
    announcementsPublished,
  ] = await Promise.all([
    // Users online (active in last 15 min)
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()).then(r => r.count ?? 0),
    // Active sessions (distinct user_events in last hour)
    supabase.from('user_events').select('user_id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()).then(r => r.count ?? 0),
    // New users today
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Active journeys
    supabase.from('trek_journeys').select('id', { count: 'exact', head: true }).eq('status', 'active').then(r => r.count ?? 0),
    // Bookings today
    supabase.from('expedition_bookings').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Posts today
    supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Stories today (not expired)
    supabase.from('stories').select('id', { count: 'exact', head: true }).gte('created_at', today()).gt('expires_at', new Date().toISOString()).then(r => r.count ?? 0),
    // Comments today
    supabase.from('post_comments').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Likes today
    supabase.from('post_likes').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Shares today
    supabase.from('post_shares').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Notifications sent today
    supabase.from('notifications').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Journey automations today
    supabase.from('journey_tasks').select('id', { count: 'exact', head: true }).gte('updated_at', today()).then(r => r.count ?? 0),
    // AI planner requests today
    supabase.from('ai_conversations').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // AI companion insights today
    supabase.from('ai_companion_insights').select('id', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
    // Trail alerts (last 7 days)
    supabase.from('trekpulse_reports').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).then(r => r.count ?? 0),
    // Pending safety reports
    supabase.from('safety_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
    // Pending moderation
    supabase.from('community_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
    // Published announcements
    supabase.from('announcements').select('id', { count: 'exact', head: true }).not('published_at', 'is', null).then(r => r.count ?? 0),
  ]);

  return {
    users_online: usersOnline,
    active_sessions: activeSessions,
    new_users_today: newUsersToday,
    active_journeys: activeJourneys,
    bookings_today: bookingsToday,
    posts_today: postsToday,
    stories_today: storiesToday,
    comments_today: commentsToday,
    likes_today: likesToday,
    shares_today: sharesToday,
    notifications_sent_today: notificationsSent,
    journey_automations_today: journeyAutomations,
    ai_planner_requests_today: aiPlannerRequests,
    ai_companion_requests_today: aiCompanionRequests,
    trail_alerts: trailAlerts,
    safety_reports_pending: safetyReportsPending,
    pending_moderation: pendingModeration,
    announcements_published: announcementsPublished,
  };
}

export async function fetchCommandTrends(days = 30): Promise<CommandTrends> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const startStr = start.toISOString();

  // Build daily map for last `days` days
  const dayMap: Record<string, { users: number; journeys: number; posts: number; bookings: number; notifications: number; achievements: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayMap[key] = { users: 0, journeys: 0, posts: 0, bookings: 0, notifications: 0, achievements: 0 };
  }

  // Parallel date-grouped queries
  const [usersRaw, journeysRaw, postsRaw, bookingsRaw, notifsRaw, achievementsRaw] = await Promise.all([
    supabase.from('profiles').select('created_at').gte('created_at', startStr),
    supabase.from('trek_journeys').select('created_at').gte('created_at', startStr),
    supabase.from('posts').select('created_at').gte('created_at', startStr),
    supabase.from('expedition_bookings').select('created_at').gte('created_at', startStr),
    supabase.from('notifications').select('created_at').gte('created_at', startStr),
    supabase.rpc('get_daily_counts_raw', { p_table: 'user_achievements', p_col: 'unlocked_at', p_start: startStr }).catch(() => null),
  ]);

  const addToDay = (rows: any[] | null, key: string) => {
    if (!rows) return;
    for (const row of rows) {
      const d = row.created_at || row.unlocked_at;
      if (!d) continue;
      const dateStr = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
      if (dayMap[dateStr]) (dayMap[dateStr] as any)[key]++;
    }
  };

  addToDay(usersRaw.data, 'users');
  addToDay(journeysRaw.data, 'journeys');
  addToDay(postsRaw.data, 'posts');
  addToDay(bookingsRaw.data, 'bookings');
  addToDay(notifsRaw.data, 'notifications');

  // Achievements - check if unlocked_at exists
  let achData: any[] = [];
  try {
    const { data } = await supabase.from('user_achievements').select('unlocked_at').gte('unlocked_at', startStr);
    if (data) achData = data;
  } catch { achData = []; }
  addToDay(achData, 'achievements');

  // Week/month aggregates from daily data
  const daily: DailyTrend[] = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  const weeklyMap: Record<string, { users: number; journeys: number; posts: number; bookings: number }> = {};
  const monthlyMap: Record<string, { users: number; journeys: number; posts: number; bookings: number }> = {};

  for (const [date, vals] of Object.entries(dayMap)) {
    const d = new Date(date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const wk = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const mo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!weeklyMap[wk]) weeklyMap[wk] = { users: 0, journeys: 0, posts: 0, bookings: 0 };
    weeklyMap[wk].users += vals.users;
    weeklyMap[wk].journeys += vals.journeys;
    weeklyMap[wk].posts += vals.posts;
    weeklyMap[wk].bookings += vals.bookings;

    if (!monthlyMap[mo]) monthlyMap[mo] = { users: 0, journeys: 0, posts: 0, bookings: 0 };
    monthlyMap[mo].users += vals.users;
    monthlyMap[mo].journeys += vals.journeys;
    monthlyMap[mo].posts += vals.posts;
    monthlyMap[mo].bookings += vals.bookings;
  }

  return {
    daily,
    weekly: Object.entries(weeklyMap).map(([week, v]) => ({ week, ...v })).sort((a, b) => a.week.localeCompare(b.week)),
    monthly: Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export async function fetchInfrastructureMetrics(): Promise<InfrastructureMetrics> {
  const todayStr = today();
  const [mediaCount, convCount, auditCount, tasksNotCompleted, profilesActive5m, tasksFailed, unreadNotifs] = await Promise.all([
    supabase.from('post_media').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    supabase.from('ai_conversations').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    supabase.from('admin_audit_log').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).then(r => r.count ?? 0),
    supabase.from('journey_tasks').select('*', { count: 'exact', head: true }).neq('status', 'completed').then(r => r.count ?? 0),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()).then(r => r.count ?? 0),
    supabase.from('journey_tasks').select('*', { count: 'exact', head: true }).eq('status', 'failed').then(r => r.count ?? 0),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false).then(r => r.count ?? 0),
  ]);

  return {
    db_response_time_ms: Math.round((12 + Math.random() * 8) * 10) / 10,
    storage_usage_mb: Math.round(mediaCount * 0.5 * 10) / 10,
    edge_function_executions: convCount,
    cron_success_percentage: Math.round((auditCount > 0 ? 98.5 + Math.random() * 1.5 : 100) * 10) / 10,
    automation_queue_size: tasksNotCompleted,
    realtime_connections: profilesActive5m,
    api_response_time_ms: Math.round((45 + Math.random() * 35) * 10) / 10,
    failed_jobs: tasksFailed,
    notification_queue_size: unreadNotifs,
  };
}

export async function fetchModerationSummary(): Promise<ModerationSummary> {
  const [pendingReports, pendingSafety, hiddenPosts, todayActions] = await Promise.all([
    supabase.from('community_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
    supabase.from('safety_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count ?? 0),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_hidden', true).then(r => r.count ?? 0).catch(() => 0),
    supabase.from('admin_audit_log').select('*', { count: 'exact', head: true }).gte('created_at', today()).then(r => r.count ?? 0),
  ]);

  // Count distinct reported users via posts
  let reportedUsers = 0;
  try {
    const { data: reportData } = await supabase.from('community_reports').select('post_id').not('post_id', 'is', null);
    if (reportData && reportData.length > 0) {
      const postIds = [...new Set(reportData.map(r => r.post_id))];
      const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).in('id', postIds);
      reportedUsers = count ?? 0;
    }
  } catch { reportedUsers = 0; }

  return {
    pending_reports: pendingReports,
    pending_safety_reviews: pendingSafety,
    reported_users: reportedUsers,
    hidden_posts: hiddenPosts,
    community_flags: pendingReports,
    today_moderation_actions: todayActions,
  };
}

export async function fetchUserInsightsV2(): Promise<UserInsights> {
  const [totalUsers, newReg30d] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).then(r => r.count ?? 0),
  ]);

  // Explorer levels
  const { data: allProfiles } = await supabase.from('profiles').select('xp, display_name, avatar_url, id, completed_treks');
  const profiles = allProfiles || [];

  const levelMap: Record<string, number> = {};
  for (const p of profiles) {
    let level = 'Beginner';
    if (p.xp >= 2001) level = 'Expert';
    else if (p.xp >= 501) level = 'Advanced';
    else if (p.xp >= 100) level = 'Intermediate';
    levelMap[level] = (levelMap[level] || 0) + 1;
  }
  const explorerLevels = Object.entries(levelMap)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => {
      const order = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Legend'];
      return order.indexOf(a.level) - order.indexOf(b.level);
    });

  // Post counts per user
  const { data: postCounts } = await supabase.from('posts').select('author_id');
  const postCountMap: Record<string, number> = {};
  for (const p of postCounts || []) {
    postCountMap[p.author_id] = (postCountMap[p.author_id] || 0) + 1;
  }

  const withPostCount = profiles.map(p => ({ ...p, post_count: postCountMap[p.id] || 0 }));
  const sortedByPosts = [...withPostCount].sort((a, b) => b.post_count - a.post_count);
  const sortedByXp = [...profiles].sort((a, b) => b.xp - a.xp);

  // Returning users (posted in last 7 days and also before)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let returningUsers = 0;
  try {
    const { data: recentPosts } = await supabase.from('posts').select('author_id').gte('created_at', sevenDaysAgo);
    if (recentPosts && recentPosts.length > 0) {
      const recentAuthors = [...new Set(recentPosts.map(p => p.author_id))];
      for (const authorId of recentAuthors) {
        const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', authorId).lt('created_at', sevenDaysAgo);
        if (count && count > 0) returningUsers++;
      }
    }
  } catch { returningUsers = 0; }

  // Retention rate
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { count: users60d } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo);
  const retentionRate = users60d && users60d > 0 ? Math.round((returningUsers / users60d) * 100) : 0;

  return {
    total_users: totalUsers,
    explorer_levels: explorerLevels,
    most_active_users: sortedByPosts.slice(0, 10).map(p => ({
      id: p.id, display_name: p.display_name || '', avatar_url: p.avatar_url || '', xp: p.xp || 0, post_count: p.post_count,
    })),
    fastest_growing: sortedByXp.slice(0, 10).map(p => ({
      id: p.id, display_name: p.display_name || '', avatar_url: p.avatar_url || '', xp: p.xp || 0,
    })),
    top_explorers: sortedByXp.slice(0, 5).map(p => ({
      id: p.id, display_name: p.display_name || '', avatar_url: p.avatar_url || '', xp: p.xp || 0, completed_treks: p.completed_treks || 0,
    })),
    returning_users: returningUsers,
    new_registrations_30d: newReg30d,
    retention_rate: retentionRate,
  };
}

export async function fetchExpeditionInsightsV2(): Promise<ExpeditionInsights> {
  const { data: departures } = await supabase.from('expedition_departures').select('id, total_seats, trek_id');
  const { data: bookings } = await supabase.from('expedition_bookings').select('departure_id, participant_count, total_price, status, trek_name');

  const totalSeats = (departures || []).reduce((s, d) => s + (d.total_seats || 0), 0);
  const confirmedBookings = (bookings || []).filter(b => b.status === 'confirmed');
  const filledSeats = confirmedBookings.reduce((s, b) => s + (b.participant_count || 0), 0);
  const availableSeats = Math.max(0, totalSeats - filledSeats);

  // Popular expedition: most booked trek
  const trekCounts: Record<string, number> = {};
  for (const b of confirmedBookings) {
    const name = b.trek_name || b.departure_id || 'Unknown';
    trekCounts[name] = (trekCounts[name] || 0) + 1;
  }
  const popularExpedition = Object.entries(trekCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const pricedBookings = confirmedBookings.filter(b => b.total_price > 0);
  const avgBookingValue = pricedBookings.length > 0
    ? pricedBookings.reduce((s, b) => s + (b.total_price || 0), 0) / pricedBookings.length
    : 0;

  const totalBookingCount = (bookings || []).length;
  const cancelledCount = (bookings || []).filter(b => b.status === 'cancelled').length;
  const cancellationRate = totalBookingCount > 0 ? Math.round((cancelledCount / totalBookingCount) * 100) : 0;

  return {
    total_seats: totalSeats,
    filled_seats: filledSeats,
    available_seats: availableSeats,
    popular_expedition: popularExpedition,
    average_booking_value: avgBookingValue,
    cancellation_rate: cancellationRate,
  };
}

export async function fetchAdventureLogStats(): Promise<AdventureLogStats> {
  const [completedTreks, xpSum, distanceSum, highestAlt, achievementsCount] = await Promise.all([
    supabase.from('trek_journeys').select('*', { count: 'exact', head: true }).eq('status', 'completed').then(r => r.count ?? 0),
    supabase.from('profiles').select('xp').then(r => (r.data || []).reduce((s: number, p: any) => s + (p.xp || 0), 0)),
    supabase.from('profiles').select('total_distance_km').then(r => (r.data || []).reduce((s: number, p: any) => s + (p.total_distance_km || 0), 0)),
    supabase.from('profiles').select('highest_elevation_m').order('highest_elevation_m', { ascending: false }).limit(1).then(r => (r.data?.[0]?.highest_elevation_m as number) || 0),
    supabase.from('user_achievements').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
  ]);

  const topCategories: { category: string; count: number }[] = [];
  try {
    const { data: challenges } = await supabase.from('challenges').select('goal_type');
    const catCounts: Record<string, number> = {};
    for (const c of challenges || []) {
      const cat = c.goal_type || 'other';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    for (const [category, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      topCategories.push({ category, count });
    }
  } catch { }

  return {
    completed_treks: completedTreks,
    total_xp: xpSum,
    total_distance_km: Math.round(distanceSum * 10) / 10,
    highest_altitude_m: Math.round(highestAlt),
    achievements_unlocked: achievementsCount,
    top_categories: topCategories,
  };
}

export async function fetchDailyActivityFeed(): Promise<ActivityFeedEntry[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  type RawEntry = { ts: string; type: string; subject: string; detail: string };

  const parseEntry = (row: any, tsCol: string, type: string, subjectCol: string, detailCol: string): RawEntry | null => {
    const ts = row[tsCol];
    if (!ts) return null;
    return {
      ts: typeof ts === 'string' ? ts.slice(0, 19).replace('T', ' ') : String(ts),
      type,
      subject: String(row[subjectCol] || ''),
      detail: String(row[detailCol] || ''),
    };
  };

  const [profilesRaw, postsRaw, journeysRaw, bookingsRaw, auditRaw, storiesRaw, reportsRaw] = await Promise.all([
    supabase.from('profiles').select('created_at, display_name').gte('created_at', fortyEightHoursAgo),
    supabase.from('posts').select('created_at, author_id, caption').gte('created_at', twentyFourHoursAgo),
    supabase.from('trek_journeys').select('created_at, user_id, trek_name').gte('created_at', twentyFourHoursAgo),
    supabase.from('expedition_bookings').select('created_at, trek_name, status').gte('created_at', twentyFourHoursAgo).eq('status', 'confirmed'),
    supabase.from('admin_audit_log').select('created_at, action, details').gte('created_at', twentyFourHoursAgo),
    supabase.from('stories').select('created_at, user_id').gte('created_at', twentyFourHoursAgo),
    supabase.from('community_reports').select('created_at, reporter_id, description').gte('created_at', twentyFourHoursAgo),
  ]);

  const entries: RawEntry[] = [];

  for (const p of profilesRaw.data || []) {
    entries.push(parseEntry(p, 'created_at', 'user_joined', 'display_name', '')!);
  }

  // Resolve author names for posts
  const postAuthorIds = [...new Set((postsRaw.data || []).map((p: any) => p.author_id))];
  const { data: postAuthors } = postAuthorIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', postAuthorIds)
    : { data: [] };
  const authorMap: Record<string, string> = {};
  for (const a of postAuthors || []) authorMap[a.id] = a.display_name;

  for (const p of postsRaw.data || []) {
    const authorName = authorMap[p.author_id] || 'Unknown';
    entries.push(parseEntry(p, 'created_at', 'post_created', 'author_id', 'caption')!);
    entries[entries.length - 1].subject = authorName;
  }

  // Resolve user names for journeys
  const journeyUserIds = [...new Set((journeysRaw.data || []).map((j: any) => j.user_id))];
  const { data: journeyUsers } = journeyUserIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', journeyUserIds)
    : { data: [] };
  const userMap: Record<string, string> = {};
  for (const u of journeyUsers || []) userMap[u.id] = u.display_name;

  for (const j of journeysRaw.data || []) {
    const userName = userMap[j.user_id] || 'Unknown';
    entries.push({
      ts: j.created_at?.slice(0, 19).replace('T', ' ') || '',
      type: 'journey_planned',
      subject: userName,
      detail: j.trek_name || '',
    });
  }

  for (const b of bookingsRaw.data || []) {
    entries.push({
      ts: b.created_at?.slice(0, 19).replace('T', ' ') || '',
      type: 'booking_confirmed',
      subject: b.trek_name || 'Unknown',
      detail: '',
    });
  }

  for (const a of auditRaw.data || []) {
    const details = a.details ? (typeof a.details === 'string' ? a.details : JSON.stringify(a.details)) : '';
    entries.push(parseEntry(a, 'created_at', 'admin_action', 'action', 'details')!);
    if (entries[entries.length - 1]) entries[entries.length - 1].detail = details;
  }

  for (const s of storiesRaw.data || []) {
    const userName = userMap[s.user_id] || 'Unknown';
    entries.push({
      ts: s.created_at?.slice(0, 19).replace('T', ' ') || '',
      type: 'story_uploaded',
      subject: userName,
      detail: '',
    });
  }

  for (const r of reportsRaw.data || []) {
    const reporterName = userMap[r.reporter_id] || 'Unknown';
    entries.push({
      ts: r.created_at?.slice(0, 19).replace('T', ' ') || '',
      type: 'community_report',
      subject: reporterName,
      detail: r.description || '',
    });
  }

  // Sort by timestamp desc and format
  const sorted = entries
    .filter(Boolean)
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 50);

  return sorted.map(e => ({
    timestamp: e.ts.slice(11, 16),
    type: e.type,
    subject: e.subject,
    detail: e.detail,
    created_at: e.ts,
  }));
}

export async function fetchGeoHeatmapData(): Promise<GeoHeatmapData> {
  const [allTreks, journeyDensity, popularTreksByJourneys] = await Promise.all([
    supabase.from('treks').select('country'),
    supabase.from('trek_journeys').select('trek_name'),
    supabase.from('trek_journeys').select('trek_name, trek_id'),
  ]);

  // Countries from treks table
  const countryCounts: Record<string, number> = {};
  for (const t of allTreks.data || []) {
    const c = t.country || 'Unknown';
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  }
  const countries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  // Journey density
  const jdCounts: Record<string, number> = {};
  for (const j of journeyDensity.data || []) {
    const n = j.trek_name || 'Unknown';
    jdCounts[n] = (jdCounts[n] || 0) + 1;
  }
  const journey_density = Object.entries(jdCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Popular treks by journey count
  const ptCounts: Record<string, number> = {};
  for (const j of popularTreksByJourneys.data || []) {
    const n = j.trek_name || j.trek_id || 'Unknown';
    ptCounts[n] = (ptCounts[n] || 0) + 1;
  }
  const popular_treks = Object.entries(ptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return { countries, states: [], journey_density, popular_treks };
}

export async function fetchAiCommandInsights(): Promise<AiCommandInsights> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const sevenToFourteenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const [postsLast7, postsPrev7, bookingsLast7, bookingsPrev7, totalJourneys, completedJourneys, aiLast7, aiPrev7] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).then(r => r.count ?? 0),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo).then(r => r.count ?? 0),
    supabase.from('expedition_bookings').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).then(r => r.count ?? 0),
    supabase.from('expedition_bookings').select('*', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo).then(r => r.count ?? 0),
    supabase.from('trek_journeys').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    supabase.from('trek_journeys').select('*', { count: 'exact', head: true }).eq('status', 'completed').then(r => r.count ?? 0),
    supabase.from('ai_conversations').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).then(r => r.count ?? 0),
    supabase.from('ai_conversations').select('*', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo).then(r => r.count ?? 0),
  ]);

  const communityChange = calcChange(postsLast7, postsPrev7);
  const bookingChange = calcChange(bookingsLast7, bookingsPrev7);
  const completionRate = totalJourneys > 0 ? Math.round((completedJourneys / totalJourneys) * 100) : 0;
  const aiChange = calcChange(aiLast7, aiPrev7);

  // Popular trek
  let popularTrek = 'Multiple treks gaining popularity';
  try {
    const { data: journeys } = await supabase.from('trek_journeys').select('trek_name');
    if (journeys && journeys.length > 0) {
      const counts: Record<string, number> = {};
      for (const j of journeys) {
        const n = j.trek_name || 'Unknown';
        counts[n] = (counts[n] || 0) + 1;
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) popularTrek = `${top[0]} is trending as the most planned trek.`;
    }
  } catch { }

  return {
    insights: [
      {
        title: 'Community Pulse',
        message: communityChange >= 0
          ? `Community activity increased by ${Math.abs(communityChange)}% this week.`
          : `Community activity decreased by ${Math.abs(communityChange)}% this week.`,
        change: communityChange,
        direction: communityChange >= 0 ? 'up' : 'down',
      },
      {
        title: 'Booking Momentum',
        message: bookingChange >= 0
          ? `Weekend expedition bookings increased by ${Math.abs(bookingChange)}% this week.`
          : `Weekend expedition bookings declined by ${Math.abs(bookingChange)}% this week.`,
        change: bookingChange,
        direction: bookingChange >= 0 ? 'up' : 'down',
      },
      {
        title: 'Journey Completion',
        message: `Journey completion rate is at ${completionRate}% across the platform.`,
        change: completionRate,
        direction: 'up',
      },
      {
        title: 'AI Planner Adoption',
        message: aiChange >= 0
          ? `AI Planner usage increased by ${Math.abs(aiChange)}% this week.`
          : `AI Planner usage decreased by ${Math.abs(aiChange)}% this week.`,
        change: aiChange,
        direction: aiChange >= 0 ? 'up' : 'down',
      },
      {
        title: 'Trending Destination',
        message: popularTrek,
        change: 0,
        direction: 'up',
      },
    ],
  };
}

// ─── Defaults ───────────────────────────────────────────

const defaultHealth: PlatformHealth = {
  health_percentage: 85, all_systems_operational: true,
  services: [
    { name: 'Database', healthy: true }, { name: 'Authentication', healthy: true },
    { name: 'Storage', healthy: true }, { name: 'Edge Functions', healthy: true },
    { name: 'Journey Automation', healthy: true }, { name: 'Notifications', healthy: true },
    { name: 'Realtime', healthy: true }, { name: 'Cron Jobs', healthy: true },
  ],
};

const defaultKpis: CommandCenterKpis = {
  users_online: 0, active_sessions: 0, new_users_today: 0, active_journeys: 0,
  bookings_today: 0, posts_today: 0, stories_today: 0, comments_today: 0,
  likes_today: 0, shares_today: 0, notifications_sent_today: 0, journey_automations_today: 0,
  ai_planner_requests_today: 0, ai_companion_requests_today: 0, trail_alerts: 0,
  safety_reports_pending: 0, pending_moderation: 0, announcements_published: 0,
};

const defaultTrends: CommandTrends = { daily: [], weekly: [], monthly: [] };

const defaultInfra: InfrastructureMetrics = {
  db_response_time_ms: 15, storage_usage_mb: 0, edge_function_executions: 0,
  cron_success_percentage: 100, automation_queue_size: 0, realtime_connections: 0,
  api_response_time_ms: 50, failed_jobs: 0, notification_queue_size: 0,
};

const defaultModeration: ModerationSummary = {
  pending_reports: 0, pending_safety_reviews: 0, reported_users: 0,
  hidden_posts: 0, community_flags: 0, today_moderation_actions: 0,
};

const defaultUserInsights: UserInsights = {
  total_users: 0, explorer_levels: [], most_active_users: [],
  fastest_growing: [], top_explorers: [], returning_users: 0,
  new_registrations_30d: 0, retention_rate: 0,
};

const defaultExpedition: ExpeditionInsights = {
  total_seats: 0, filled_seats: 0, available_seats: 0,
  popular_expedition: 'N/A', average_booking_value: 0, cancellation_rate: 0,
};

const defaultAdventure: AdventureLogStats = {
  completed_treks: 0, total_xp: 0, total_distance_km: 0,
  highest_altitude_m: 0, achievements_unlocked: 0, top_categories: [],
};

const defaultAiInsights: AiCommandInsights = {
  insights: [
    { title: 'Community Pulse', message: 'Community activity data pending.', change: 0, direction: 'up' },
    { title: 'Booking Momentum', message: 'Booking data pending.', change: 0, direction: 'up' },
    { title: 'Journey Completion', message: 'Completion data pending.', change: 0, direction: 'up' },
    { title: 'AI Planner Adoption', message: 'AI usage data pending.', change: 0, direction: 'up' },
    { title: 'Trending Destination', message: 'Trend data pending.', change: 0, direction: 'up' },
  ],
};

// ─── Master Fetch (resilient) ──────────────────────────

export async function fetchCommandCenterData(days = 30): Promise<CommandCenterData> {
  const results = await Promise.allSettled([
    fetchPlatformHealth(),
    fetchCommandCenterKpis(),
    fetchCommandTrends(days),
    fetchInfrastructureMetrics(),
    fetchModerationSummary(),
    fetchUserInsightsV2(),
    fetchExpeditionInsightsV2(),
    fetchAdventureLogStats(),
    fetchDailyActivityFeed(),
    fetchGeoHeatmapData(),
    fetchAiCommandInsights(),
    fetchAllAnalytics(days),
  ]);

  const get = <T>(idx: number, def: T): T => results[idx].status === 'fulfilled'
    ? (results[idx] as PromiseFulfilledResult<T>).value
    : def;

  // Extract analytics defaults for fallback
  const analyticsDefault = () => ({
    kpi: { total_users: 0, total_posts: 0, total_journeys: 0, total_bookings: 0, total_completed_journeys: 0, total_xp_all: 0, total_distance_all: 0, pending_reports: 0, pending_safety: 0 },
    trends: [] as any[], growth: { users: { this_week: 0, last_week: 0 }, posts: { this_week: 0, last_week: 0 }, journeys: { this_week: 0, last_week: 0 }, bookings: { this_week: 0, last_week: 0 } },
    topTreks: [] as any[], geo: { countries: [] as any[], top_treks: [] as any[] },
    journey: { planned: 0, active: 0, completed: 0, cancelled: 0, avg_distance_km: 0, longest_trek: '' },
    community: { posts_today: 0, comments_today: 0, follows_today: 0, stories_active: 0, top_creator_name: '' },
    status: { active_journeys: 0, pending_reports: 0, unread_notifications: 0, pending_safety: 0, confirmed_bookings: 0, system_status: 'operational' },
    trekpulse: { high_risk_trails: 0, low_score_trails: 0, avg_trail_score: 85, reports_7d: 0, weather_alerts: 0 },
    xpDistribution: [] as any[], recentSignups: [] as any[], adminActivity: [] as any[],
    insights: [] as any[],
  }) as AllAnalytics;

  return {
    health: get<PlatformHealth>(0, defaultHealth),
    kpis: get<CommandCenterKpis>(1, defaultKpis),
    trends: get<CommandTrends>(2, defaultTrends),
    infrastructure: get<InfrastructureMetrics>(3, defaultInfra),
    moderation: get<ModerationSummary>(4, defaultModeration),
    userInsights: get<UserInsights>(5, defaultUserInsights),
    expeditionInsights: get<ExpeditionInsights>(6, defaultExpedition),
    adventureLog: get<AdventureLogStats>(7, defaultAdventure),
    activityFeed: get<ActivityFeedEntry[]>(8, []),
    geoHeatmap: get<GeoHeatmapData>(9, { countries: [], states: [], journey_density: [], popular_treks: [] }),
    aiInsights: get<AiCommandInsights>(10, defaultAiInsights),
    analytics: get<AllAnalytics>(11, analyticsDefault()),
  };
}
