import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Loader2, Check, X, ArrowRight, Mountain, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { fetchMyBookings, cancelBooking } from '@/lib/expeditions';
import { handleBookingCancellation } from '@/lib/journeys';
import type { ExpeditionBooking } from '@/lib/expeditions';

export const MyExpeditions = () => {
  const navigate = useNavigate();
  const { user, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const [bookings, setBookings] = useState<ExpeditionBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!requireAuth()) return;
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await fetchMyBookings();
      setBookings(data);
    } catch { showToast('Failed to load expeditions'); }
    setLoading(false);
  };

  const handleCancel = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      await cancelBooking(bookingId);
      handleBookingCancellation(bookingId);
      showToast('Booking cancelled');
      loadBookings();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel');
    }
    setCancelling(null);
  };

  if (!user) return null;

  const upcoming = bookings.filter(b => b.status === 'confirmed');
  const past = bookings.filter(b => b.status === 'completed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-24">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold font-heading mb-8">My Expeditions</h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
              <Mountain className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No expeditions booked yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Explore expeditions and book your next adventure.</p>
            <button onClick={() => navigate('/explore')} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-semibold">Explore Expeditions</button>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Upcoming</h2>
                <div className="space-y-4">
                  {upcoming.map(b => (
                    <BookingCard key={b.id} booking={b} navigate={navigate} handleCancel={handleCancel} cancelling={cancelling} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Past</h2>
                <div className="space-y-4">
                  {past.map(b => (
                    <BookingCard key={b.id} booking={b} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Cancelled</h2>
                <div className="space-y-4">
                  {cancelled.map(b => (
                    <BookingCard key={b.id} booking={b} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function BookingCard({ booking, navigate, handleCancel, cancelling }: {
  booking: ExpeditionBooking;
  navigate: (path: string) => void;
  handleCancel?: (id: string) => void;
  cancelling?: string | null;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-black/5 p-5 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => navigate(`/my-expeditions/${booking.id}`)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold">{booking.trek_name || 'Expedition'}</h3>
          {booking.trek_location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{booking.trek_location}</p>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          booking.status === 'confirmed' ? 'bg-brand-emerald/10 text-brand-emerald' :
          booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
          'bg-red-100 text-red-600'
        }`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        {booking.departure_date && (
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(booking.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        )}
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.participant_count} {booking.participant_count === 1 ? 'person' : 'people'}</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-black/5">
        <div>
          <p className="text-xs text-muted-foreground">Reference</p>
          <p className="text-sm font-mono font-semibold">{booking.booking_reference}</p>
        </div>
        <div className="flex items-center gap-2">
          {handleCancel && booking.status === 'confirmed' && (
            <button onClick={(e) => { e.stopPropagation(); handleCancel(booking.id); }} disabled={cancelling === booking.id}
              className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
              {cancelling === booking.id ? '...' : 'Cancel'}
            </button>
          )}
          <button className="p-2 hover:bg-black/5 rounded-xl transition-colors"><ArrowRight className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>
    </motion.div>
  );
}
