import type { Dispatch } from 'react';

export type TimeRange = 7 | 30 | 90;

export type ModuleStatusType = 'loading' | 'healthy' | 'stale' | 'failed';

export interface ModuleStatus {
  moduleName: string;
  status: ModuleStatusType;
  lastSuccessAt: Date | null;
  error: string | null;
  lastRealtimeEvent: Date | null;
  rpcDurationMs: number | null;
}

export interface AnalyticsHealthState {
  modules: Record<string, ModuleStatus>;
  cacheEntries: number;
  cacheExpired: number;
  activeChannels: number;
  lastRealtimeEvent: Date | null;
}

export type AnalyticsHealthAction =
  | { type: 'REPORT_STATUS'; payload: ModuleStatus }
  | { type: 'REALTIME_EVENT' }
  | { type: 'CACHE_UPDATE'; entries: number; expired: number }
  | { type: 'CHANNELS_UPDATE'; count: number };

export interface AnalyticsHealthContextValue {
  state: AnalyticsHealthState;
  dispatch: Dispatch<AnalyticsHealthAction>;
  clearCache: () => void;
}

export interface ServiceStatus {
  name: string;
  healthy: boolean;
}

export interface PlatformHealth {
  health_percentage: number;
  all_systems_operational: boolean;
  services: ServiceStatus[];
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

export interface CommunityKpis {
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

export interface ModerationSummary {
  pending_reports: number;
  pending_safety_reviews: number;
  reported_users: number;
  hidden_posts: number;
  community_flags: number;
  today_moderation_actions: number;
}

export interface ActivityFeedEntry {
  timestamp: string;
  type: string;
  subject: string;
  detail: string;
  created_at: string;
}

export interface DailyTrend {
  date: string;
  users: number;
  journeys: number;
  posts: number;
  bookings: number;
  notifications: number;
  achievements: number;
}

export interface WeeklyTrend {
  week: string;
  users: number;
  journeys: number;
  posts: number;
  bookings: number;
}

export interface MonthlyTrend {
  month: string;
  users: number;
  journeys: number;
  posts: number;
  bookings: number;
}

export interface TrendData {
  daily: DailyTrend[];
  weekly: WeeklyTrend[];
  monthly: MonthlyTrend[];
}

export interface JourneyAnalytics {
  planned: number;
  active: number;
  completed: number;
  cancelled: number;
  avg_distance_km: number;
  longest_trek: string;
}

export interface TrekPulseAnalytics {
  high_risk_trails: number;
  low_score_trails: number;
  avg_trail_score: number;
  reports_7d: number;
  weather_alerts: number;
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

export interface ExplorerLevel {
  level: string;
  count: number;
}

export interface TopUser {
  id: string;
  display_name: string;
  avatar_url: string;
  xp: number;
  post_count?: number;
  completed_treks?: number;
}

export interface UserInsights {
  total_users: number;
  explorer_levels: ExplorerLevel[];
  most_active_users: TopUser[];
  fastest_growing: TopUser[];
  top_explorers: TopUser[];
  returning_users: number;
  new_registrations_30d: number;
  retention_rate: number;
}

export interface XpDistribution {
  range: string;
  count: number;
}

export interface UserSignup {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  completed_treks: number;
  created_at: string;
}

export interface AiCommandInsight {
  title: string;
  message: string;
  change: number;
  direction: 'up' | 'down';
}

export interface GeoEntry {
  name: string;
  count: number;
}

export interface GeoHeatmapData {
  countries: GeoEntry[];
  states: GeoEntry[];
  journey_density: GeoEntry[];
  popular_treks: GeoEntry[];
}

export interface PlatformDashboardData {
  platform: PlatformHealth | null;
  infrastructure: InfrastructureMetrics | null;
}

export interface CommunityDashboardData {
  kpis: CommunityKpis | null;
  activityFeed: ActivityFeedEntry[];
  moderation: ModerationSummary | null;
}

export interface JourneyDashboardData {
  trends: TrendData | null;
  journey: JourneyAnalytics | null;
  trekpulse: TrekPulseAnalytics | null;
  expedition: ExpeditionInsights | null;
  adventure: AdventureLogStats | null;
}

export interface UserDashboardData {
  userInsights: UserInsights | null;
  xpDistribution: XpDistribution[];
  recentSignups: UserSignup[];
}

export interface AiDashboardData {
  insights: AiCommandInsight[];
}

export interface GeoDashboardData {
  geo: GeoHeatmapData | null;
}
