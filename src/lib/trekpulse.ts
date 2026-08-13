import { supabase } from './supabase';

export interface TrailScore {
  trek_id: string;
  score: number;
  weather_status: string;
  community_activity: string;
  trail_risk: string;
  group_trek_available: boolean;
  journey_activity_count: number;
  trail_confidence: string;
  last_updated: string;
  popular: boolean;
  recent_incidents: boolean;
}

export interface TrekPulseReport {
  id: string;
  trek_id: string;
  user_id: string;
  report_type: string;
  severity: string;
  title: string;
  message: string;
  source: string;
  is_resolved: boolean;
  created_at: string;
}

export async function fetchAllTrailScores(): Promise<TrailScore[]> {
  const { data } = await supabase.from('trekpulse_trail_scores').select('*').order('score', { ascending: false });
  return (data as TrailScore[]) || [];
}

export async function fetchTrailScore(trekId: string): Promise<TrailScore | null> {
  const { data } = await supabase.from('trekpulse_trail_scores').select('*').eq('trek_id', trekId).maybeSingle();
  return data as TrailScore | null;
}

export async function fetchTrekPulseReports(trekId: string): Promise<TrekPulseReport[]> {
  const { data } = await supabase.from('trekpulse_reports').select('*').eq('trek_id', trekId).order('created_at', { ascending: false }).limit(20);
  return (data as TrekPulseReport[]) || [];
}

export async function fetchAllTrekPulseReports(): Promise<TrekPulseReport[]> {
  const { data } = await supabase.from('trekpulse_reports').select('*').order('created_at', { ascending: false }).limit(50);
  return (data as TrekPulseReport[]) || [];
}

export async function submitTrekPulseReport(input: {
  trek_id: string;
  report_type: string;
  severity: string;
  title: string;
  message: string;
}) {
  const { data, error } = await supabase.from('trekpulse_reports').insert(input).select().single();
  if (error) throw error;
  return data as TrekPulseReport;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getMarkerColor(score: number, hasGroupTrek: boolean, popular: boolean): string {
  if (hasGroupTrek) return '#3b82f6';
  if (popular) return '#8b5cf6';
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'info': return 'bg-blue-100 text-blue-700';
    case 'advisory': return 'bg-yellow-100 text-yellow-700';
    case 'warning': return 'bg-orange-100 text-orange-700';
    case 'danger': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}
