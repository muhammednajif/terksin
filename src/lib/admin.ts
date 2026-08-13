import { supabase } from './supabase';
import type { Profile } from './database.types';
import type { PostWithAuthor, Challenge, TrekEvent } from './database.types';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface CommunityReport {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: Profile;
  post?: PostWithAuthor;
}

export interface SafetyReport {
  id: string;
  user_id: string;
  report_type: 'dangerous_area' | 'wildlife' | 'trail_closure' | 'weather_hazard' | 'other';
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  photo_url: string | null;
  is_anonymous: boolean;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin?: Profile;
}

export interface Announcement {
  id: string;
  author_id: string | null;
  title: string;
  content: string;
  target_audience: 'all' | 'trekkers' | 'moderators' | 'admins';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalBookings: number;
  totalDepartures: number;
  pendingReports: number;
  pendingSafety: number;
  newUsersThisWeek: number;
  totalExpeditionRevenue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [users, posts, bookings, departures, reports, safetyReports] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('expedition_bookings').select('total_price', { count: 'exact' }),
    supabase.from('expedition_departures').select('id', { count: 'exact', head: true }),
    supabase.from('community_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('safety_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: newUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString());

  const totalRevenue = bookings.data?.reduce((sum: number, b: { total_price: number }) => sum + (b.total_price || 0), 0) || 0;

  return {
    totalUsers: users.count || 0,
    totalPosts: posts.count || 0,
    totalBookings: bookings.count || 0,
    totalDepartures: departures.count || 0,
    pendingReports: reports.count || 0,
    pendingSafety: safetyReports.count || 0,
    newUsersThisWeek: newUsers || 0,
    totalExpeditionRevenue: totalRevenue,
  };
}

export async function fetchAllUsers(): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return (data as Profile[]) || [];
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await supabase.from('profiles').update({ role }).eq('id', userId);
  await supabase.rpc('log_admin_action', {
    p_action: 'update_user_role',
    p_entity_type: 'profile',
    p_entity_id: userId,
    p_details: JSON.stringify({ new_role: role }),
  });
}

export async function fetchPendingReports(): Promise<CommunityReport[]> {
  const { data } = await supabase
    .from('community_reports')
    .select('*, reporter:profiles!reporter_id(*)')
    .order('created_at', { ascending: false });
  return (data as CommunityReport[]) || [];
}

export async function updateReportStatus(
  reportId: string,
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  note?: string
): Promise<void> {
  await supabase.from('community_reports').update({ status }).eq('id', reportId);
  await supabase.rpc('log_admin_action', {
    p_action: `report_${status}`,
    p_entity_type: 'community_report',
    p_entity_id: reportId,
    p_details: note ? JSON.stringify({ note }) : null,
  });
}

export async function fetchSafetyReports(status?: string): Promise<SafetyReport[]> {
  let query = supabase.from('safety_reports').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return (data as SafetyReport[]) || [];
}

export async function updateSafetyReportStatus(
  reportId: string,
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
): Promise<void> {
  await supabase.from('safety_reports').update({ status }).eq('id', reportId);
  await supabase.rpc('log_admin_action', {
    p_action: `safety_${status}`,
    p_entity_type: 'safety_report',
    p_entity_id: reportId,
  });
}

export async function fetchDepartures(): Promise<any[]> {
  const { data } = await supabase.from('expedition_departures').select('*').order('departure_date');
  return data || [];
}

export async function createDeparture(departure: {
  trek_id: string;
  departure_date: string;
  return_date: string;
  total_seats: number;
  price: number;
  currency?: string;
}): Promise<void> {
  const { data } = await supabase.from('expedition_departures').insert({
    ...departure,
    available_seats: departure.total_seats,
  }).select().single();
  await supabase.rpc('log_admin_action', {
    p_action: 'create_departure',
    p_entity_type: 'expedition_departure',
    p_entity_id: data?.id,
    p_details: JSON.stringify({ trek_id: departure.trek_id }),
  });
}

export async function updateDeparture(id: string, updates: Partial<any>): Promise<void> {
  await supabase.from('expedition_departures').update(updates).eq('id', id);
  await supabase.rpc('log_admin_action', {
    p_action: 'update_departure',
    p_entity_type: 'expedition_departure',
    p_entity_id: id,
  });
}

export async function deleteDeparture(id: string): Promise<void> {
  await supabase.from('expedition_departures').delete().eq('id', id);
  await supabase.rpc('log_admin_action', {
    p_action: 'delete_departure',
    p_entity_type: 'expedition_departure',
    p_entity_id: id,
  });
}

export async function fetchAllBookings(): Promise<any[]> {
  const { data } = await supabase
    .from('expedition_bookings')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
): Promise<void> {
  await supabase.from('expedition_bookings').update({ status }).eq('id', bookingId);
  await supabase.rpc('log_admin_action', {
    p_action: `booking_${status}`,
    p_entity_type: 'expedition_booking',
    p_entity_id: bookingId,
  });
}

export async function fetchGroupTreks(): Promise<any[]> {
  const { data } = await supabase
    .from('trek_events')
    .select('*, organizer:profiles!organizer_id(*)')
    .order('event_date', { ascending: false });
  return data || [];
}

export async function fetchChallenges(): Promise<Challenge[]> {
  const { data } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
  return (data as Challenge[]) || [];
}

export async function createChallenge(challenge: Partial<Challenge>): Promise<void> {
  const { data } = await supabase.from('challenges').insert(challenge).select().single();
  await supabase.rpc('log_admin_action', {
    p_action: 'create_challenge',
    p_entity_type: 'challenge',
    p_entity_id: data?.id,
  });
}

export async function updateChallenge(id: string, updates: Partial<Challenge>): Promise<void> {
  await supabase.from('challenges').update(updates).eq('id', id);
  await supabase.rpc('log_admin_action', {
    p_action: 'update_challenge',
    p_entity_type: 'challenge',
    p_entity_id: id,
  });
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data } = await supabase
    .from('announcements')
    .select('*, author:profiles!author_id(*)')
    .order('created_at', { ascending: false });
  return (data as Announcement[]) || [];
}

export async function createAnnouncement(announcement: {
  title: string;
  content: string;
  target_audience?: string;
  priority?: string;
}): Promise<void> {
  const { data: profile } = await supabase.auth.getUser();
  const { data } = await supabase.from('announcements').insert({
    ...announcement,
    author_id: profile.user?.id,
  }).select().single();
  await supabase.rpc('log_admin_action', {
    p_action: 'create_announcement',
    p_entity_type: 'announcement',
    p_entity_id: data?.id,
  });
}

export async function publishAnnouncement(id: string): Promise<void> {
  await supabase.from('announcements').update({
    is_published: true,
    published_at: new Date().toISOString(),
  }).eq('id', id);
  await supabase.rpc('log_admin_action', {
    p_action: 'publish_announcement',
    p_entity_type: 'announcement',
    p_entity_id: id,
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await supabase.from('announcements').delete().eq('id', id);
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const { data } = await supabase
    .from('admin_audit_log')
    .select('*, admin:profiles!admin_id(*)')
    .order('created_at', { ascending: false })
    .limit(200);
  return (data as AuditLogEntry[]) || [];
}

export async function deletePost(postId: string): Promise<void> {
  await supabase.from('posts').delete().eq('id', postId);
  await supabase.rpc('log_admin_action', {
    p_action: 'delete_post',
    p_entity_type: 'post',
    p_entity_id: postId,
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  await supabase.from('post_comments').delete().eq('id', commentId);
  await supabase.rpc('log_admin_action', {
    p_action: 'delete_comment',
    p_entity_type: 'post_comment',
    p_entity_id: commentId,
  });
}

import { getAllTreks as getAllGlobalTreks } from '@/data/globalTreks';
import type { Trek as GlobalTrek } from '@/data/globalTreks';

export interface DbTrek {
  id: string;
  title: string;
  description: string | null;
  location: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Extreme';
  rating: number;
  reviews: number;
  price: number;
  image: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];
  continent: string | null;
  country: string | null;
  distance: string | null;
  elevation: string | null;
  source: string | null;
  booking_type: string | null;
  is_bookable: boolean;
  best_season: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

let cachedDbTreks: DbTrek[] | null = null;

export async function fetchDbTreks(forceRefresh = false): Promise<DbTrek[]> {
  if (cachedDbTreks && !forceRefresh) return cachedDbTreks;
  try {
    const { data, error } = await supabase.from('treks').select('*').order('title');
    if (error || !data || data.length === 0) {
      cachedDbTreks = null;
      return [];
    }
    cachedDbTreks = data.map(mapDbTrek);
    return cachedDbTreks!;
  } catch {
    cachedDbTreks = null;
    return [];
  }
}

function mapDbTrek(d: any): DbTrek {
  return {
    id: d.id, title: d.title, description: d.description,
    location: d.location, duration: d.duration, difficulty: d.difficulty,
    rating: Number(d.rating), reviews: Number(d.reviews), price: Number(d.price),
    image: d.image,
    lat: d.lat ? Number(d.lat) : null, lng: d.lng ? Number(d.lng) : null,
    tags: d.tags || [], continent: d.continent, country: d.country,
    distance: d.distance, elevation: d.elevation,
    source: d.source, booking_type: d.booking_type,
    is_bookable: Boolean(d.is_bookable), best_season: d.best_season,
    is_active: Boolean(d.is_active),
    created_at: d.created_at, updated_at: d.updated_at,
  };
}

export function getAllTreks(): any[] {
  if (cachedDbTreks && cachedDbTreks.length > 0) return cachedDbTreks;
  return getAllGlobalTreks();
}

export async function seedTreksFromStatic(): Promise<number> {
  const staticTreks = getAllGlobalTreks();
  const rows = staticTreks.map(t => ({
    id: t.id, title: t.title, description: t.description || null,
    location: t.location, duration: t.duration, difficulty: t.difficulty,
    rating: t.rating, reviews: t.reviews, price: t.price,
    image: t.image || null, lat: t.lat ?? null, lng: t.lng ?? null,
    tags: t.tags || [], continent: t.continent || null, country: t.country || null,
    distance: t.distance || null, elevation: t.elevation || null,
    source: t.source || 'canonical', booking_type: t.bookingType || 'none',
    is_bookable: t.isBookable ?? false, best_season: t.bestSeason || null,
  }));
  const { error } = await supabase.from('treks').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  cachedDbTreks = null;
  return rows.length;
}

export async function createTrek(trek: {
  id: string; title: string; description?: string | null; location: string;
  duration: string; difficulty: string; rating?: number; reviews?: number;
  price?: number; image?: string | null; lat?: number | null; lng?: number | null;
  tags?: string[]; continent?: string | null; country?: string | null;
  distance?: string | null; elevation?: string | null;
  booking_type?: string; is_bookable?: boolean; best_season?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('treks').insert({
    id: trek.id, title: trek.title, description: trek.description || null,
    location: trek.location, duration: trek.duration, difficulty: trek.difficulty,
    rating: trek.rating ?? 0, reviews: trek.reviews ?? 0, price: trek.price ?? 0,
    image: trek.image || null, lat: trek.lat ?? null, lng: trek.lng ?? null,
    tags: trek.tags || [], continent: trek.continent || null, country: trek.country || null,
    distance: trek.distance || null, elevation: trek.elevation || null,
    booking_type: trek.booking_type || 'none', is_bookable: trek.is_bookable ?? false,
    best_season: trek.best_season || null,
  });
  if (error) throw error;
  cachedDbTreks = null;
}

export async function updateTrek(id: string, updates: Partial<DbTrek>): Promise<void> {
  const { error } = await supabase.from('treks').update({
    title: updates.title, description: updates.description,
    location: updates.location, duration: updates.duration, difficulty: updates.difficulty,
    rating: updates.rating, reviews: updates.reviews, price: updates.price,
    image: updates.image, lat: updates.lat, lng: updates.lng,
    tags: updates.tags, continent: updates.continent, country: updates.country,
    distance: updates.distance, elevation: updates.elevation,
    booking_type: updates.booking_type, is_bookable: updates.is_bookable,
    best_season: updates.best_season, is_active: updates.is_active,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
  cachedDbTreks = null;
}

export async function deleteTrek(id: string): Promise<void> {
  const { error } = await supabase.from('treks').delete().eq('id', id);
  if (error) throw error;
  cachedDbTreks = null;
}
