import { useState, useEffect } from 'react';
import { fetchAnnouncements, createAnnouncement, publishAnnouncement, deleteAnnouncement } from '@/lib/admin';
import type { Announcement } from '@/lib/admin';

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_audience: 'all', priority: 'normal' });

  useEffect(() => { fetchAnnouncements().then(setAnnouncements); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createAnnouncement(form);
    setForm({ title: '', content: '', target_audience: 'all', priority: 'normal' });
    setShowForm(false);
    fetchAnnouncements().then(setAnnouncements);
  }

  async function handlePublish(id: string) {
    await publishAnnouncement(id);
    fetchAnnouncements().then(setAnnouncements);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await deleteAnnouncement(id);
    fetchAnnouncements().then(setAnnouncements);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 border border-black/5 mb-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Content</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} required className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Target Audience</label>
              <select value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20">
                <option value="all">All Users</option>
                <option value="trekkers">Trekkers</option>
                <option value="moderators">Moderators</option>
                <option value="admins">Admins</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-colors">Create Announcement</button>
        </form>
      )}

      <div className="space-y-3">
        {announcements.map(a => (
          <div key={a.id} className="bg-white rounded-xl p-4 border border-black/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{a.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  a.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  a.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {a.priority}
                </span>
                {a.is_published ? (
                  <span className="text-xs text-green-600">Published {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</span>
                ) : (
                  <span className="text-xs text-yellow-600">Draft</span>
                )}
              </div>
              <div className="flex gap-2">
                {!a.is_published && (
                  <button onClick={() => handlePublish(a.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">Publish</button>
                )}
                <button onClick={() => handleDelete(a.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">Delete</button>
              </div>
            </div>
            <p className="text-sm text-gray-500">{a.content}</p>
            <p className="text-xs text-gray-400 mt-2">Target: {a.target_audience} | By: {a.author?.display_name || 'Unknown'}</p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-gray-400 text-center py-12">No announcements yet.</p>}
      </div>
    </div>
  );
}
