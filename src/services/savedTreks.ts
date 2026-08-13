import { supabase } from '@/lib/supabase';
import { resolveTrek } from '@/lib/trekRepository';
import type { UnifiedTrek } from '@/lib/trek-types';

export interface SavedTrekRecord {
  id: string;
  user_id: string;
  trek_id: string;
  created_at: string;
}

export async function fetchSavedTrekRecords(): Promise<SavedTrekRecord[]> {
  const { data, error } = await supabase
    .from('saved_treks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as SavedTrekRecord[];
}

export async function fetchSavedTreks(): Promise<(SavedTrekRecord & { trek: UnifiedTrek | null })[]> {
  const records = await fetchSavedTrekRecords();
  return records.map(r => ({
    ...r,
    trek: resolveTrek(r.trek_id),
  }));
}

export async function unsaveTrek(trekId: string): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('saved_treks')
    .delete()
    .eq('user_id', userId)
    .eq('trek_id', trekId);
  if (error) throw error;
}
