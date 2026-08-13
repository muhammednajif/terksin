import { supabase } from './supabase';

export interface UserEmail {
  id: string;
  email: string;
}

export interface UserEvent {
  id: string;
  user_id: string;
  event_type: string;
  page_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  display_name: string | null;
  email: string | null;
}

export async function fetchUserEmails(): Promise<UserEmail[]> {
  const { data, error } = await supabase.rpc('get_user_emails');
  if (error) throw error;
  return (data as UserEmail[]) || [];
}

export async function fetchUserEvents(params?: {
  userId?: string;
  eventType?: string;
  limit?: number;
}): Promise<UserEvent[]> {
  const { data, error } = await supabase.rpc('get_user_events', {
    p_user_id: params?.userId ?? null,
    p_event_type: params?.eventType ?? null,
    p_limit: params?.limit ?? 500,
  });
  if (error) throw error;
  return (data as UserEvent[]) || [];
}

let analyticsEnabled = true;

export function disableAnalytics() {
  analyticsEnabled = false;
}

export function enableAnalytics() {
  analyticsEnabled = true;
}

export async function trackEvent(eventType: string, pagePath?: string, metadata?: Record<string, unknown>) {
  if (!analyticsEnabled) return;
  try {
    await supabase.rpc('log_user_event', {
      p_event_type: eventType,
      p_page_path: pagePath ?? null,
      p_metadata: metadata ?? {},
    });
  } catch {
    // silent fail
  }
}

export function usePageTracking() {
  const path = window.location.pathname;
  trackEvent('page_view', path);
}
