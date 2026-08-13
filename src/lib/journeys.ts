import { supabase } from './supabase';

export type JourneyStatus = 'planned' | 'preparing' | 'active' | 'awaiting_completion' | 'completed' | 'cancelled';
export type JourneySource = 'manual_plan' | 'expedition_booking' | 'group_trek';
export type TaskType = 'preparation_7_days' | 'conditions_3_days' | 'readiness_1_day' | 'trek_start' | 'expected_completion' | 'share_experience';
export type TaskStatus = 'pending' | 'processing' | 'sent' | 'cancelled' | 'failed';

export interface TrekJourney {
  id: string;
  user_id: string;
  trek_id: string;
  trek_name: string;
  trek_location: string | null;
  trek_image_url: string | null;
  start_date: string;
  end_date: string;
  experience_level: string | null;
  emergency_contact: string | null;
  source: JourneySource;
  source_booking_id: string | null;
  status: JourneyStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyTask {
  id: string;
  journey_id: string;
  user_id: string;
  task_type: TaskType;
  title: string;
  message: string | null;
  scheduled_for: string;
  status: TaskStatus;
  sent_at: string | null;
  metadata: Record<string, unknown>;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

export interface JourneyGearItem {
  id: string;
  journey_id: string;
  user_id: string;
  item_name: string;
  category: string;
  is_essential: boolean;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
}

export interface JourneyReadinessItem {
  id: string;
  journey_id: string;
  user_id: string;
  label: string;
  is_checked: boolean;
  created_at: string;
}

const getUserId = async (): Promise<string> => {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.id) throw new Error('Not authenticated');
  return data.session.user.id;
};

// ---- JOURNEYS ----

export async function fetchMyJourneys(): Promise<TrekJourney[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('trek_journeys')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data || []) as TrekJourney[];
}

export async function fetchJourneyById(id: string): Promise<TrekJourney | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('trek_journeys')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data as TrekJourney;
}

export async function createJourney(input: {
  trek_id: string;
  trek_name: string;
  trek_location?: string;
  trek_image_url?: string;
  start_date: string;
  end_date: string;
  experience_level?: string;
  emergency_contact?: string;
  source?: JourneySource;
  source_booking_id?: string;
}): Promise<TrekJourney> {
  const userId = await getUserId();

  // Check for existing non-cancelled journey with same trek + booking source
  if (input.source_booking_id) {
    const { data: existing } = await supabase
      .from('trek_journeys')
      .select('id, status')
      .eq('user_id', userId)
      .eq('trek_id', input.trek_id)
      .eq('source_booking_id', input.source_booking_id)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existing) {
      throw new Error('A journey for this booking already exists');
    }
  }

  const { data, error } = await supabase
    .from('trek_journeys')
    .insert({
      user_id: userId,
      trek_id: input.trek_id,
      trek_name: input.trek_name,
      trek_location: input.trek_location || null,
      trek_image_url: input.trek_image_url || null,
      start_date: input.start_date,
      end_date: input.end_date,
      experience_level: input.experience_level || null,
      emergency_contact: input.emergency_contact || null,
      source: input.source || 'manual_plan',
      source_booking_id: input.source_booking_id || null,
      status: 'planned',
    })
    .select()
    .single();

  if (error) throw error;
  const journey = data as TrekJourney;

  // Create automation tasks
  await supabase.rpc('create_journey_tasks', { p_journey_id: journey.id }).catch(e => {
    console.error('Failed to create journey tasks:', e);
  });

  // Create default gear items
  await supabase.rpc('create_default_gear_items', { p_journey_id: journey.id }).catch(e => {
    console.error('Failed to create gear items:', e);
  });

  // Create default readiness items
  await supabase.rpc('create_default_readiness_items', { p_journey_id: journey.id }).catch(e => {
    console.error('Failed to create readiness items:', e);
  });

  return journey;
}

export async function updateJourney(id: string, updates: Partial<{
  start_date: string;
  end_date: string;
  experience_level: string;
  emergency_contact: string;
  status: JourneyStatus;
  completed_at: string;
}>): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('trek_journeys')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function cancelJourney(id: string): Promise<void> {
  const userId = await getUserId();
  await supabase
    .from('trek_journeys')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', userId);

  // Cancel pending tasks
  await supabase
    .from('journey_tasks')
    .update({ status: 'cancelled' })
    .eq('journey_id', id)
    .eq('status', 'pending');
}

export async function confirmJourneyCompletion(id: string): Promise<{ xp_awarded: number }> {
  const userId = await getUserId();
  const { data: journey } = await supabase
    .from('trek_journeys')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!journey) throw new Error('Journey not found');
  if (journey.status !== 'awaiting_completion') throw new Error('Journey is not awaiting completion');

  await supabase
    .from('trek_journeys')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  // Award XP
  let xpAwarded = 0;
  try {
    const { data: xpResult } = await supabase.rpc('award_journey_xp', { p_journey_id: id });
    xpAwarded = (xpResult as number) || 0;
  } catch (e) {
    console.error('XP award failed:', e);
  }

  // Create trek stamp
  await supabase.rpc('create_trek_stamp', { p_journey_id: id }).catch(e => {
    console.error('Stamp creation failed:', e);
  });

  // Check & award achievements
  await supabase.rpc('check_and_award_achievements', { p_user_id: userId, p_journey_id: id }).catch(e => {
    console.error('Achievement check failed:', e);
  });

  // Create share experience task
  await supabase.from('journey_tasks').insert({
    journey_id: id,
    user_id: userId,
    task_type: 'share_experience',
    title: 'Share Your Journey',
    message: 'Congratulations! Share your trek experience with the community.',
    scheduled_for: new Date().toISOString(),
    status: 'pending',
  }).catch(() => {});

  return { xp_awarded: xpAwarded };
}

// ---- GEAR ----

export async function fetchGearItems(journeyId: string): Promise<JourneyGearItem[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('journey_gear_items')
    .select('*')
    .eq('journey_id', journeyId)
    .eq('user_id', userId)
    .order('category', { ascending: true });
  if (error) throw error;
  return (data || []) as JourneyGearItem[];
}

export async function toggleGearItem(id: string): Promise<void> {
  const userId = await getUserId();
  const { data: item } = await supabase
    .from('journey_gear_items')
    .select('is_checked')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (!item) throw new Error('Item not found');
  await supabase
    .from('journey_gear_items')
    .update({ is_checked: !item.is_checked, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
}

export async function addCustomGearItem(journeyId: string, itemName: string, category?: string, isEssential?: boolean): Promise<JourneyGearItem> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('journey_gear_items')
    .insert({
      journey_id: journeyId,
      user_id: userId,
      item_name: itemName,
      category: category || 'other',
      is_essential: isEssential || false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as JourneyGearItem;
}

export async function deleteCustomGearItem(id: string): Promise<void> {
  const userId = await getUserId();
  await supabase
    .from('journey_gear_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
}

export async function getGearProgress(journeyId: string): Promise<{ total: number; checked: number; essentialTotal: number; essentialChecked: number }> {
  const items = await fetchGearItems(journeyId);
  const total = items.length;
  const checked = items.filter(i => i.is_checked).length;
  const essentialTotal = items.filter(i => i.is_essential).length;
  const essentialChecked = items.filter(i => i.is_essential && i.is_checked).length;
  return { total, checked, essentialTotal, essentialChecked };
}

// ---- READINESS ----

export async function fetchReadinessItems(journeyId: string): Promise<JourneyReadinessItem[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('journey_readiness_items')
    .select('*')
    .eq('journey_id', journeyId)
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as JourneyReadinessItem[];
}

export async function toggleReadinessItem(id: string): Promise<void> {
  const userId = await getUserId();
  const { data: item } = await supabase
    .from('journey_readiness_items')
    .select('is_checked')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (!item) throw new Error('Item not found');
  await supabase
    .from('journey_readiness_items')
    .update({ is_checked: !item.is_checked })
    .eq('id', id)
    .eq('user_id', userId);
}

export async function getReadinessProgress(journeyId: string): Promise<{ total: number; checked: number }> {
  const items = await fetchReadinessItems(journeyId);
  return { total: items.length, checked: items.filter(i => i.is_checked).length };
}

// ---- TASKS (read-only for users) ----

export async function fetchJourneyTasks(journeyId: string): Promise<JourneyTask[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('journey_tasks')
    .select('*')
    .eq('journey_id', journeyId)
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true });
  if (error) throw error;
  return (data || []) as JourneyTask[];
}

// Create booking-based journey after expedition is confirmed
export async function ensureJourneyForBooking(booking: {
  id: string;
  trek_id: string;
  trek_name: string | null;
  trek_location: string | null;
  departure_date: string | null;
  return_date: string | null;
}): Promise<TrekJourney | null> {
  if (!booking.departure_date || !booking.return_date) return null;

  try {
    return await createJourney({
      trek_id: booking.trek_id,
      trek_name: booking.trek_name || 'Unknown Trek',
      trek_location: booking.trek_location || undefined,
      start_date: booking.departure_date,
      end_date: booking.return_date,
      source: 'expedition_booking',
      source_booking_id: booking.id,
    });
  } catch (e: any) {
    if (e?.message?.includes('already exists')) return null;
    console.error('Failed to create journey for booking:', e);
    return null;
  }
}

export async function handleBookingCancellation(bookingId: string): Promise<void> {
  const userId = await getUserId();
  const { data: journey } = await supabase
    .from('trek_journeys')
    .select('id, status')
    .eq('source_booking_id', bookingId)
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (journey) {
    await cancelJourney(journey.id);
  }
}
