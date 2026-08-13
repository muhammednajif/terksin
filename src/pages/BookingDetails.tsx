import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Loader2, Check, Mountain, DollarSign, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { useStore } from '@/store/useStore';
import { fetchBookingById, fetchParticipants, cancelBooking } from '@/lib/expeditions';
import type { ExpeditionBooking, BookingParticipant } from '@/lib/expeditions';

export const BookingDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const [booking, setBooking] = useState<ExpeditionBooking | null>(null);
  const [participants, setParticipants] = useState<BookingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!requireAuth()) return;
    if (!bookingId) return;
    setLoading(true);
    Promise.all([
      fetchBookingById(bookingId),
      fetchParticipants(bookingId).catch(() => [] as BookingParticipant[]),
    ]).then(([b, p]) => {
      if (!b) { showToast('Booking not found'); navigate('/my-expeditions'); return; }
      setBooking(b);
      setParticipants(p);
      setLoading(false);
    }).catch(() => {
      showToast('Failed to load booking');
      navigate('/my-expeditions');
    });
  }, [bookingId]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      await cancelBooking(booking.id);
      showToast('Booking cancelled');
      setBooking(prev => prev ? { ...prev, status: 'cancelled' as const } : null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel');
    }
    setCancelling(false);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 md:pt-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-24">
      <div className="max-w-3xl mx-auto px-4">
        <PageHeader backTo="/my-expeditions" actions={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-emerald/10 flex items-center justify-center flex-shrink-0">
              <Mountain className="w-5 h-5 text-brand-emerald" />
            </div>
          </div>
        }>
            <h1 className="text-xl md:text-2xl font-bold font-heading truncate">{booking.trek_name || 'Expedition'}</h1>
        </PageHeader>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4"><MapPin className="w-3 h-3" />{booking.trek_location || 'Location not specified'}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <h3 className="font-semibold text-sm mb-4">Booking Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono font-bold text-brand-emerald">{booking.booking_reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  booking.status === 'confirmed' ? 'bg-brand-emerald/10 text-brand-emerald' :
                  booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-600'
                }`}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Booked on</span>
                <span className="font-medium">{new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <h3 className="font-semibold text-sm mb-4">Trip Details</h3>
            <div className="space-y-3">
              {booking.departure_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Departure</span>
                  <span className="font-medium">{new Date(booking.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {booking.return_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Return</span>
                  <span className="font-medium">{new Date(booking.return_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Participants</span>
                <span className="font-medium">{booking.participant_count} {booking.participant_count === 1 ? 'person' : 'people'}</span>
              </div>
            </div>
          </div>
        </div>

        {participants.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 p-6 mb-6">
            <h3 className="font-semibold text-sm mb-4">Participants</h3>
            <div className="space-y-3">
              {participants.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-black/5">
                  <div>
                    <p className="font-medium text-sm">{i + 1}. {p.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.age ? `${p.age} yrs` : '', p.nationality, p.experience_level].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-black/5 p-6 mb-6">
          <h3 className="font-semibold text-sm mb-4">Pricing</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per person</span>
              <span>${booking.price_per_person}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Participants</span>
              <span>{booking.participant_count}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-black/5">
              <span>Total</span>
              <span>${booking.total_price}</span>
            </div>
          </div>
        </div>

        {booking.status === 'confirmed' && (
          <div className="flex gap-3">
            <button onClick={() => navigate(`/treks/${booking.trek_id}`)} className="flex-1 py-3 border border-black/10 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors">
              View Expedition
            </button>
            <button onClick={handleCancel} disabled={cancelling}
              className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
