import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchDepartures } from '@/lib/admin';

export function AdminExpeditions() {
  const [departures, setDepartures] = useState<any[]>([]);

  useEffect(() => {
    fetchDepartures().then(setDepartures);
  }, []);

  const grouped = departures.reduce((acc: Record<string, any[]>, d) => {
    if (!acc[d.trek_id]) acc[d.trek_id] = [];
    acc[d.trek_id].push(d);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Expeditions Overview</h1>
      {Object.entries(grouped).map(([trekId, deps]) => (
        <div key={trekId} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold capitalize">{trekId.replace(/-/g, ' ')}</h2>
            <Link
              to="/admin/departures"
              className="text-sm text-brand-emerald hover:underline"
            >
              Manage departures →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deps.map(d => (
              <div key={d.id} className="bg-white rounded-xl p-4 border border-black/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {new Date(d.departure_date).toLocaleDateString()} — {new Date(d.return_date).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    d.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                    d.status === 'sold_out' ? 'bg-red-100 text-red-700' :
                    d.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {d.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>{d.available_seats}/{d.total_seats} seats</span>
                  <span className="mx-2">•</span>
                  <span>${d.price} {d.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(grouped).length === 0 && (
        <p className="text-gray-400 text-center py-12">No departures found. Create one in the Departures section.</p>
      )}
    </div>
  );
}
