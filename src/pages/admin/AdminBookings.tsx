import { useState, useEffect } from 'react';
import { fetchAllBookings, updateBookingStatus } from '@/lib/admin';

export function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAllBookings().then(setBookings);
  }, []);

  async function handleStatusChange(id: string, status: string) {
    await updateBookingStatus(id, status as any);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  const filtered = statusFilter ? bookings.filter(b => b.status === statusFilter) : bookings;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-gray-900">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-black/5">
              <th className="pb-3 pr-4 font-medium">Reference</th>
              <th className="pb-3 pr-4 font-medium">User</th>
              <th className="pb-3 pr-4 font-medium">Trek</th>
              <th className="pb-3 pr-4 font-medium">Guests</th>
              <th className="pb-3 pr-4 font-medium">Total</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                <td className="py-3 pr-4 font-mono text-xs">{b.booking_reference}</td>
                <td className="py-3 pr-4 text-xs text-gray-400">{b.user_id?.slice(0, 8)}...</td>
                <td className="py-3 pr-4">{b.trek_name || b.trek_id}</td>
                <td className="py-3 pr-4">{b.participant_count}</td>
                <td className="py-3 pr-4 font-medium">${b.total_price}</td>
                <td className="py-3 pr-4">
                  <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value)} className="bg-white border border-black/10 rounded-lg px-2 py-1 text-xs text-gray-900">
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td className="py-3 text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
