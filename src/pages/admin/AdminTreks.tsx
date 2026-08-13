import { useState, useEffect } from 'react';
import { getAllTreks as getStaticTreks } from '@/data/globalTreks';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'trailsync_admin_treks';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(treks: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(treks));
}

export function AdminTreks() {
  const [treks, setTreks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const local = loadLocal();
      if (local.length > 0) { setTreks(local); setLoading(false); return; }
      try {
        const { data } = await supabase.from('treks').select('*');
        if (data && data.length > 0) {
          setTreks(data);
          saveLocal(data);
        } else {
          setTreks(getStaticTreks());
        }
      } catch {
        setTreks(getStaticTreks());
      }
      setLoading(false);
    })();
  }, []);

  function updateState(newTreks: any[]) {
    setTreks(newTreks);
    saveLocal(newTreks);
    (async () => {
      try { await supabase.from('treks').upsert(newTreks, { onConflict: 'id' }); } catch {}
    })();
  }

  function handleSave(trek: any) {
    const id = trek.id || trek.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const exists = treks.find((t: any) => t.id === id);
    const updated = exists
      ? treks.map((t: any) => t.id === id ? { ...trek, id } : t)
      : [{ ...trek, id }, ...treks];
    updateState(updated);
    setEditing(null); setCreating(false);
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this trek?')) return;
    updateState(treks.filter((t: any) => t.id !== id));
  }

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-emerald mx-auto mt-20" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Treks ({treks.length})</h1>
        <button onClick={() => { setCreating(true); setError(''); }} className="px-4 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">
          + Add Trek
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">{error}</div>}

      {(editing || creating) && (
        <TrekForm
          trek={editing}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-black/5">
              <th className="pb-3 pr-4 font-medium">Trek</th>
              <th className="pb-3 pr-4 font-medium">Difficulty</th>
              <th className="pb-3 pr-4 font-medium">Duration</th>
              <th className="pb-3 pr-4 font-medium">Distance</th>
              <th className="pb-3 pr-4 font-medium">Location</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {treks.map((trek: any) => (
              <tr key={trek.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {trek.image ? <img src={trek.image} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-black/5" />}
                    <div><p className="font-medium">{trek.title}</p><p className="text-gray-400 text-xs">{trek.id}</p></div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    trek.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    trek.difficulty === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                    trek.difficulty === 'Hard' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                  }`}>{trek.difficulty}</span>
                </td>
                <td className="py-3 pr-4">{trek.duration}</td>
                <td className="py-3 pr-4">{trek.distance || '—'}</td>
                <td className="py-3 pr-4 text-gray-400">{trek.location}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(trek); setError(''); }} className="text-brand-emerald hover:text-brand-emerald/80 text-xs font-medium">Edit</button>
                    <button onClick={() => handleDelete(trek.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrekForm({ trek, onSave, onCancel }: { trek: any; onSave: (trek: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    id: trek?.id || '', title: trek?.title || '', description: trek?.description || '',
    location: trek?.location || '', duration: trek?.duration || '', difficulty: trek?.difficulty || 'Moderate',
    price: trek?.price?.toString() || '0', image: trek?.image || '',
    tags: (Array.isArray(trek?.tags) ? trek.tags.join(', ') : (trek?.tags || '')),
    continent: trek?.continent || '', country: trek?.country || '',
    distance: trek?.distance || '', elevation: trek?.elevation || '',
    best_season: trek?.best_season || '', booking_type: trek?.booking_type || trek?.bookingType || 'none',
    is_bookable: trek?.is_bookable ?? trek?.isBookable ?? false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...form, price: parseFloat(form.price) || 0, tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-black/5 mb-6 space-y-4">
      <h2 className="text-lg font-semibold">{trek ? 'Edit Trek' : 'New Trek'}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="block text-sm text-gray-500 mb-1">Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Duration</label><input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="14 Days" required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Difficulty</label><select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20"><option>Easy</option><option>Moderate</option><option>Hard</option><option>Extreme</option></select></div>
        <div><label className="block text-sm text-gray-500 mb-1">Price ($)</label><input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Distance</label><input value={form.distance} onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} placeholder="130km" className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Elevation</label><input value={form.elevation} onChange={e => setForm(f => ({ ...f, elevation: e.target.value }))} placeholder="5,364m" className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Continent</label><input value={form.continent} onChange={e => setForm(f => ({ ...f, continent: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Country</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Best Season</label><input value={form.best_season} onChange={e => setForm(f => ({ ...f, best_season: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Booking Type</label><select value={form.booking_type} onChange={e => setForm(f => ({ ...f, booking_type: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20"><option value="none">None</option><option value="self-guided">Self-Guided</option><option value="community">Community</option><option value="expedition">Expedition</option></select></div>
        <div className="flex items-center gap-2 pt-6"><input type="checkbox" id="is_bookable" checked={form.is_bookable} onChange={e => setForm(f => ({ ...f, is_bookable: e.target.checked }))} className="rounded border-black/10" /><label htmlFor="is_bookable" className="text-sm text-gray-600">Bookable</label></div>
        <div className="sm:col-span-2"><label className="block text-sm text-gray-500 mb-1">Image URL</label><input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div className="sm:col-span-2"><label className="block text-sm text-gray-500 mb-1">Tags (comma separated)</label><input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="High Altitude, Cultural, Scenic" className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
        <div className="sm:col-span-2"><label className="block text-sm text-gray-500 mb-1">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" /></div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-6 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">{trek ? 'Save Changes' : 'Create Trek'}</button>
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-black/5 text-gray-600 rounded-xl text-sm font-medium hover:bg-black/10 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
