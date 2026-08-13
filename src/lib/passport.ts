import { supabase } from './supabase';

export interface PassportStamp {
  id: string;
  user_id: string;
  journey_id: string;
  trek_id: string;
  trek_name: string;
  completed_at: string;
  difficulty: string | null;
  distance_km: number | null;
  xp_earned: number;
  location: string | null;
  image_url: string | null;
  country: string | null;
  continent: string | null;
  summary: string | null;
}

export interface PassportStats {
  user_id: string;
  total_xp: number;
  completed_treks: number;
  countries: number;
  states: number;
  cities: number;
  peaks: number;
  waterfalls: number;
  forests: number;
  deserts: number;
  highest_altitude_m: number;
  longest_trek_km: number;
  lifetime_distance_km: number;
  lifetime_elevation_m: number;
  current_streak: number;
  longest_streak: number;
}

export interface AchievementDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  requirement_type: string;
  requirement_value: number;
  sort_order: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  journey_id: string | null;
  unlocked_at: string;
  achievement?: AchievementDefinition;
}

export async function fetchPassportStamps(userId: string): Promise<PassportStamp[]> {
  const { data } = await supabase.from('passport_stamps').select('*').eq('user_id', userId).order('completed_at', { ascending: false });
  return (data as PassportStamp[]) || [];
}

export async function fetchPassportStats(userId: string): Promise<PassportStats | null> {
  const { data } = await supabase.from('passport_stats').select('*').eq('user_id', userId).maybeSingle();
  return data as PassportStats | null;
}

export async function fetchUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data } = await supabase.from('user_achievements').select('*, achievement:achievements_definitions(*)').eq('user_id', userId);
  return (data as UserAchievement[]) || [];
}

export async function fetchAllAchievements(): Promise<AchievementDefinition[]> {
  const { data } = await supabase.from('achievements_definitions').select('*').order('sort_order');
  return (data as AchievementDefinition[]) || [];
}

export async function fetchJourneyStamp(journeyId: string): Promise<PassportStamp | null> {
  const { data } = await supabase.from('passport_stamps').select('*').eq('journey_id', journeyId).maybeSingle();
  return data as PassportStamp | null;
}

export function getLevel(xp: number): { level: number; title: string; progress: number; next: number } {
  const levels = [
    { min: 0, title: 'Explorer' },
    { min: 500, title: 'Adventurer' },
    { min: 2000, title: 'Trail Seeker' },
    { min: 5000, title: 'Mountain Scout' },
    { min: 15000, title: 'Summit Hunter' },
    { min: 50000, title: 'Trekking Master' },
  ];
  let level = 1;
  let title = levels[0].title;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) { level = i + 1; title = levels[i].title; break; }
  }
  const currentMin = level > 1 ? levels[level - 1].min : 0;
  const nextMin = level < levels.length ? levels[level].min : currentMin;
  const progress = nextMin > currentMin ? ((xp - currentMin) / (nextMin - currentMin)) * 100 : 100;
  return { level, title, progress: Math.min(100, progress), next: nextMin };
}
