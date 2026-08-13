import { useState, useEffect } from 'react';
import { fetchGroupTreks } from '@/lib/admin';

export function AdminGroupTreks() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => { fetchGroupTreks().then(setEvents); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Group Treks</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-black/5">
              <th className="pb-3 pr-4 font-medium">Title</th>
              <th className="pb-3 pr-4 font-medium">Organizer</th>
              <th className="pb-3 pr-4 font-medium">Date</th>
              <th className="pb-3 pr-4 font-medium">Location</th>
              <th className="pb-3 pr-4 font-medium">Seats</th>
              <th className="pb-3 font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                <td className="py-3 pr-4 font-medium">{e.title}</td>
                <td className="py-3 pr-4 text-xs text-gray-400">{e.organizer?.display_name || 'Unknown'}</td>
                <td className="py-3 pr-4 text-xs">{new Date(e.event_date).toLocaleDateString()}</td>
                <td className="py-3 pr-4 text-gray-400">{e.location}</td>
                <td className="py-3 pr-4">{e.available_seats}/{e.total_seats}</td>
                <td className="py-3">{e.price > 0 ? `$${e.price}` : 'Free'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {events.length === 0 && <p className="text-gray-400 text-center py-12">No group treks found.</p>}
    </div>
  );
}
