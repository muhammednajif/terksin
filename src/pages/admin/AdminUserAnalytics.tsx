import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { fetchAllUsers } from '@/lib/admin';
import { fetchUserEmails, fetchUserEvents, type UserEmail, type UserEvent } from '@/lib/analytics';
import type { Profile } from '@/lib/database.types';

type View = 'users' | 'activity';

export function AdminUserAnalytics() {
  const [view, setView] = useState<View>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [emails, setEmails] = useState<UserEmail[]>([]);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllUsers().then(p => {
      setProfiles(p);
      fetchUserEmails().then(e => setEmails(e)).catch(() => {});
      setLoading(false);
    }).catch(() => {
      setError('Failed to load users');
      setLoading(false);
    });
  }, []);

  const emailMap = new Map(emails.map(e => [e.id, e.email]));

  const filtered = profiles.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    emailMap.get(u.id)?.toLowerCase().includes(search.toLowerCase())
  );

  async function showUserActivity(user: Profile) {
    setSelectedUser({ id: user.id, name: user.display_name || 'Unknown', email: emailMap.get(user.id) || '—' });
    setView('activity');
    const ev = await fetchUserEvents({ userId: user.id }).catch(() => []);
    setEvents(ev);
  }

  if (loading) {
    return <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-emerald mx-auto mt-20" />;
  }

  if (error) {
    return <p className="text-red-500 text-center py-12">{error}</p>;
  }

  return (
    <div>
      <PageHeader
        title={view === 'activity' ? selectedUser?.name || 'User Activity' : 'User Analytics'}
        onBack={view === 'activity' ? () => { setView('users'); setSelectedUser(null); } : undefined}
        actions={<div className="flex gap-2">
          <button onClick={() => setView('users')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'users' ? 'bg-brand-emerald/10 text-brand-emerald' : 'text-gray-500 hover:text-gray-700 bg-black/5'}`}>
            Users
          </button>
          <button onClick={() => { setView('activity'); setEvents([]); fetchUserEvents().then(setEvents).catch(() => {}); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'activity' && !selectedUser ? 'bg-brand-emerald/10 text-brand-emerald' : 'text-gray-500 hover:text-gray-700 bg-black/5'}`}>
            All Activity
          </button>
        </div>}
      />

      {emails.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
          Emails not available. Run the <code className="bg-amber-100 px-1 rounded">00010_user_analytics.sql</code> migration in your Supabase SQL editor to enable email display and activity tracking.
        </div>
      )}

      {view === 'users' && (
        <>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-xl bg-black/5 border border-black/10 text-gray-900 mb-6 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-black/5">
                  <th className="pb-3 pr-4 font-medium">User</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-xs font-medium">
                            {user.display_name?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{user.display_name || 'Unnamed'}</p>
                          <p className="text-gray-400 text-xs">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{emailMap.get(user.id) || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                        user.role === 'moderator' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <button
                        onClick={() => showUserActivity(user)}
                        className="text-brand-emerald hover:text-brand-emerald/80 text-xs font-medium"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'activity' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-4">
            <select
              onChange={e => {
                if (e.target.value) {
                  const user = profiles.find(p => p.id === e.target.value);
                  if (user) showUserActivity(user);
                } else {
                  setSelectedUser(null);
                  fetchUserEvents().then(setEvents).catch(() => {});
                }
              }}
              className="bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-gray-900"
              value={selectedUser?.id || ''}
            >
              <option value="">All users</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.display_name || p.username || p.id.slice(0, 8)} — {emailMap.get(p.id) || ''}</option>
              ))}
            </select>
            {selectedUser && (
              <p className="text-sm text-gray-500">
                Email: <span className="text-gray-700">{selectedUser.email}</span>
              </p>
            )}
          </div>
          {events.length === 0 ? (
            <p className="text-gray-400 text-center py-12">No activity recorded yet.</p>
          ) : (
            events.map(e => (
              <div key={e.id} className="bg-white rounded-xl p-4 border border-black/5 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-emerald mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{e.display_name || 'Unknown'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 text-gray-500 font-medium">{e.event_type}</span>
                    {e.email && <span className="text-xs text-gray-400">{e.email}</span>}
                  </div>
                  {e.page_path && <p className="text-xs text-gray-400">Path: {e.page_path}</p>}
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{JSON.stringify(e.metadata)}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
