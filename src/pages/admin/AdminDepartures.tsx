import { useState, useEffect } from 'react';
import { fetchDepartures, createDeparture, updateDeparture, deleteDeparture, fetchDbTreks, getAllTreks } from '@/lib/admin';
import type { DbTrek } from '@/lib/admin';

export function AdminDepartures() {
  const [departures, setDepartures] = useState<any[]>([]);
  const [dbTreks, setDbTreks] = useState<DbTrek[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ trek_id: '', departure_date: '', return_date: '', total_seats: '10', price: '1000', currency: 'USD' });

  useEffect(() => {
    fetchDepartures().then(setDepartures);
    fetchDbTreks().then(setDbTreks);
  }, []);

  const treks = dbTreks.length > 0 ? dbTreks : getAllTreks();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createDeparture({
      trek_id: form.trek_id,
      departure_date: form.departure_date,
      return_date: form.return_date,
      total_seats: parseInt(form.total_seats),
      price: parseFloat(form.price),
      currency: form.currency,
    });
    setForm({ trek_id: '', departure_date: '', return_date: '', total_seats: '10', price: '1000', currency: 'USD' });
    setShowForm(false);
    fetchDepartures().then(setDepartures);
  }

  async function handleStatusChange(id: string, status: string) {
    await updateDeparture(id, { status });
    fetchDepartures().then(setDepartures);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this departure?')) return;
    await deleteDeparture(id);
    fetchDepartures().then(setDepartures);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Departures</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">
          {showForm ? 'Cancel' : '+ New Departure'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 border border-black/5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Trek</label>
              <select value={form.trek_id} onChange={e => setForm(f => ({ ...f, trek_id: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20">
                <option value="">Select trek...</option>
                {treks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Departure Date</label>
              <input type="date" value={form.departure_date} onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Return Date</label>
              <input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Total Seats</label>
              <input type="number" min="1" value={form.total_seats} onChange={e => setForm(f => ({ ...f, total_seats: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Price</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">Create Departure</button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-black/5">
              <th className="pb-3 pr-4 font-medium">Trek</th>
              <th className="pb-3 pr-4 font-medium">Dates</th>
              <th className="pb-3 pr-4 font-medium">Seats</th>
              <th className="pb-3 pr-4 font-medium">Price</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departures.map(d => (
              <tr key={d.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                <td className="py-3 pr-4 font-medium capitalize">{d.trek_id.replace(/-/g, ' ')}</td>
                <td className="py-3 pr-4 text-xs">
                  {new Date(d.departure_date).toLocaleDateString()} — {new Date(d.return_date).toLocaleDateString()}
                </td>
                <td className="py-3 pr-4">{d.available_seats}/{d.total_seats}</td>
                <td className="py-3 pr-4">${d.price} {d.currency}</td>
                <td className="py-3 pr-4">
                  <select value={d.status} onChange={e => handleStatusChange(d.id, e.target.value)} className="bg-white border border-black/10 rounded-lg px-2 py-1 text-xs text-gray-900">
                    <option value="scheduled">Scheduled</option>
                    <option value="sold_out">Sold Out</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td className="py-3">
                  <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
