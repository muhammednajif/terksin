import { supabase } from './supabase';
import type { Database } from './database.types';

export interface Departure {
  id: string;
  trek_id: string;
  departure_date: string;
  return_date: string;
  total_seats: number;
  available_seats: number;
  price: number;
  currency: string;
  status: 'scheduled' | 'sold_out' | 'cancelled' | 'completed';
}

export interface ExpeditionBooking {
  id: string;
  user_id: string;
  trek_id: string;
  trek_name: string | null;
  trek_location: string | null;
  departure_id: string;
  departure_date: string | null;
  return_date: string | null;
  participant_count: number;
  price_per_person: number;
  total_price: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  booking_reference: string;
  readiness_confirmed: boolean;
  created_at: string;
}

export interface BookingParticipant {
  id: string;
  booking_id: string;
  full_name: string;
  age: number | null;
  nationality: string | null;
  emergency_contact: string | null;
  experience_level: string | null;
}

export async function fetchDepartures(trekId: string, includeSoldOut = false): Promise<Departure[]> {
  let query = supabase
    .from('expedition_departures')
    .select('*')
    .eq('trek_id', trekId)
    .in('status', includeSoldOut ? ['scheduled', 'sold_out'] : ['scheduled'])
    .order('departure_date', { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Departure[];
}

export async function createBooking(params: {
  trekId: string;
  trekName: string | null;
  trekLocation: string | null;
  departureId: string;
  participantCount: number;
  pricePerPerson: number;
  participants: Omit<BookingParticipant, 'id' | 'booking_id'>[];
}): Promise<ExpeditionBooking> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const reference = `TRK-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const totalPrice = params.pricePerPerson * params.participantCount;

  const { data: reserveResult, error: reserveError } = await supabase.rpc(
    'reserve_expedition_seats',
    { p_departure_id: params.departureId, p_seats_needed: params.participantCount }
  );

  if (reserveError) throw new Error(reserveError.message);
  if (!reserveResult.success) {
    throw new Error(reserveResult.error === 'Not enough seats'
      ? `Sorry, there are no longer enough seats available for this departure. Please choose another date or reduce the number of participants.`
      : reserveResult.error || 'Reservation failed');
  }

  const depResult = await supabase
    .from('expedition_departures')
    .select('departure_date, return_date, price, currency')
    .eq('id', params.departureId)
    .single();
  const dep = depResult.data;

  const { data: booking, error: bookingError } = await supabase
    .from('expedition_bookings')
    .insert({
      user_id: userId,
      trek_id: params.trekId,
      trek_name: params.trekName,
      trek_location: params.trekLocation,
      departure_id: params.departureId,
      departure_date: dep?.departure_date || null,
      return_date: dep?.return_date || null,
      participant_count: params.participantCount,
      price_per_person: params.pricePerPerson,
      total_price: totalPrice,
      currency: dep?.currency || 'USD',
      status: 'confirmed',
      booking_reference: reference,
      readiness_confirmed: false,
    })
    .select()
    .single();

  if (bookingError) throw bookingError;

  if (params.participants.length > 0) {
    const participantRows = params.participants.map(p => ({
      booking_id: booking.id,
      full_name: p.full_name,
      age: p.age,
      nationality: p.nationality,
      emergency_contact: p.emergency_contact,
      experience_level: p.experience_level,
    }));
    const { error: partError } = await supabase
      .from('booking_participants')
      .insert(participantRows);
    if (partError) console.error('Failed to save participants:', partError);
  }

  return booking as ExpeditionBooking;
}

export async function fetchMyBookings(): Promise<ExpeditionBooking[]> {
  const { data, error } = await supabase
    .from('expedition_bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ExpeditionBooking[];
}

export async function fetchBookingById(id: string): Promise<ExpeditionBooking | null> {
  const { data, error } = await supabase
    .from('expedition_bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as ExpeditionBooking;
}

export async function fetchParticipants(bookingId: string): Promise<BookingParticipant[]> {
  const { data, error } = await supabase
    .from('booking_participants')
    .select('*')
    .eq('booking_id', bookingId);
  if (error) throw error;
  return (data || []) as BookingParticipant[];
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { data: booking, error: fetchError } = await supabase
    .from('expedition_bookings')
    .select('departure_id, participant_count, status')
    .eq('id', bookingId)
    .single();
  if (fetchError) throw fetchError;
  if (booking.status === 'cancelled') throw new Error('Booking is already cancelled');

  const { error: updateError } = await supabase
    .from('expedition_bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (updateError) throw updateError;

  const { error: restoreError } = await supabase.rpc('restore_expedition_seats', {
    p_departure_id: booking.departure_id,
    p_seats: booking.participant_count,
  });
  if (restoreError) console.error('Failed to restore seats:', restoreError);
}
