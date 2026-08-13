import { supabase } from '@/lib/supabase';
import type {
  PlatformHealth, InfrastructureMetrics, CommunityKpis, ModerationSummary,
  ActivityFeedEntry, TrendData, JourneyAnalytics, TrekPulseAnalytics,
  ExpeditionInsights, AdventureLogStats, UserInsights, XpDistribution,
  UserSignup, AiCommandInsight, GeoHeatmapData,
} from './types';
import { analyticsCache } from './cache';

function cacheKey(name: string, ...args: (string | number)[]): string {
  return `rpc:${name}${args.length ? ':' + args.join(':') : ''}`;
}

async function rpcFetch<T>(rpcName: string, cacheTtlMs: number, params?: Record<string, unknown>): Promise<T> {
  const key = cacheKey(rpcName, ...Object.values(params || {}));
  const cached = analyticsCache.get<T>(key);
  if (cached) return cached;

  const start = performance.now();
  console.log(`[rpc] >>> ${rpcName}`, params || {});
  const { data, error } = await supabase.rpc(rpcName, params || {});
  const duration = Math.round(performance.now() - start);

  console.log(`[rpc] <<< ${rpcName} (${duration}ms)`, { dataReceived: data !== null && data !== undefined, dataType: typeof data, isArray: Array.isArray(data), error });

  if (error) {
    console.error(`[rpc] FAIL ${rpcName}`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  if (data === null || data === undefined) {
    console.warn(`[rpc] EMPTY ${rpcName} returned null/undefined`);
  }

  analyticsCache.set(key, data as T, cacheTtlMs);
  return data as T;
}

export async function fetchPlatformHealth(): Promise<PlatformHealth> {
  return rpcFetch<PlatformHealth>('get_platform_health', 30_000);
}

export async function fetchInfrastructureMetrics(): Promise<InfrastructureMetrics> {
  return rpcFetch<InfrastructureMetrics>('get_infrastructure_metrics', 30_000);
}

export async function fetchCommunityKpis(): Promise<CommunityKpis> {
  return rpcFetch<CommunityKpis>('get_command_center_kpis', 10_000);
}

export async function fetchModerationSummary(): Promise<ModerationSummary> {
  return rpcFetch<ModerationSummary>('get_moderation_and_safety_summary', 15_000);
}

export async function fetchActivityFeed(): Promise<ActivityFeedEntry[]> {
  const data = await rpcFetch<ActivityFeedEntry[]>('get_daily_activity_feed_v2', 30_000);
  return data || [];
}

export async function fetchTrends(days: number): Promise<TrendData> {
  return rpcFetch<TrendData>('get_command_center_trends', 60_000, { p_days: days });
}

export async function fetchJourneyAnalytics(): Promise<JourneyAnalytics> {
  return rpcFetch<JourneyAnalytics>('get_journey_analytics', 30_000);
}

export async function fetchAdventureLogStats(): Promise<AdventureLogStats> {
  return rpcFetch<AdventureLogStats>('get_adventure_log_stats', 30_000);
}

export async function fetchTrekPulseAnalytics(): Promise<TrekPulseAnalytics> {
  return rpcFetch<TrekPulseAnalytics>('get_trekpulse_analytics', 30_000);
}

export async function fetchExpeditionInsights(): Promise<ExpeditionInsights> {
  return rpcFetch<ExpeditionInsights>('get_expedition_insights_v2', 30_000);
}

export async function fetchUserInsights(): Promise<UserInsights> {
  return rpcFetch<UserInsights>('get_user_insights_v2', 30_000);
}

export async function fetchXpDistribution(): Promise<XpDistribution[]> {
  const data = await rpcFetch<XpDistribution[]>('get_xp_distribution', 60_000);
  return data || [];
}

export async function fetchRecentSignups(): Promise<UserSignup[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, xp, completed_treks, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data || []) as UserSignup[];
}

export async function fetchAiInsights(): Promise<AiCommandInsight[]> {
  const data = await rpcFetch<{ insights: AiCommandInsight[] }>('get_ai_command_insights', 60_000);
  return data?.insights || [];
}

export async function fetchGeoHeatmap(): Promise<GeoHeatmapData> {
  return rpcFetch<GeoHeatmapData>('get_geo_heatmap_data', 60_000);
}
