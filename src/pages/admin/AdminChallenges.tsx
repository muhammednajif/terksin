import { useState, useEffect } from 'react';
import { fetchChallenges, createChallenge } from '@/lib/admin';
import type { Challenge } from '@/lib/database.types';

export function AdminChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', goal_type: 'distance_km' as Challenge['goal_type'],
    goal_value: '100', reward_xp: '500', badge_name: '', start_date: '', end_date: '',
  });

  useEffect(() => { fetchChallenges().then(setChallenges); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createChallenge({
      title: form.title,
      description: form.description || null,
      goal_type: form.goal_type,
      goal_value: parseFloat(form.goal_value),
      reward_xp: parseInt(form.reward_xp),
      badge_name: form.badge_name || null,
      start_date: form.start_date,
      end_date: form.end_date,
    });
    setShowForm(false);
    setForm({ title: '', description: '', goal_type: 'distance_km', goal_value: '100', reward_xp: '500', badge_name: '', start_date: '', end_date: '' });
    fetchChallenges().then(setChallenges);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Challenges</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">
          {showForm ? 'Cancel' : '+ New Challenge'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 border border-black/5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Badge Name</label>
              <input value={form.badge_name} onChange={e => setForm(f => ({ ...f, badge_name: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Goal Type</label>
              <select value={form.goal_type} onChange={e => setForm(f => ({ ...f, goal_type: e.target.value as any }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20">
                <option value="distance_km">Distance (km)</option>
                <option value="treks">Treks</option>
                <option value="elevation_m">Elevation (m)</option>
                <option value="days_active">Days Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Goal Value</label>
              <input type="number" min="1" value={form.goal_value} onChange={e => setForm(f => ({ ...f, goal_value: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Reward XP</label>
              <input type="number" min="0" value={form.reward_xp} onChange={e => setForm(f => ({ ...f, reward_xp: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-500 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">Create Challenge</button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 border border-black/5">
            <h3 className="font-medium mb-1">{c.title}</h3>
            {c.badge_name && <p className="text-xs text-brand-emerald mb-1">🏅 {c.badge_name}</p>}
            <p className="text-xs text-gray-500 mb-2">{c.goal_type.replace(/_/g, ' ')}: {c.goal_value} | XP: {c.reward_xp}</p>
            <p className="text-xs text-gray-400">{new Date(c.start_date).toLocaleDateString()} — {new Date(c.end_date).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
