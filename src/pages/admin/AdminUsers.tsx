import { useState, useEffect } from 'react';
import { fetchAllUsers, updateUserRole, type UserRole } from '@/lib/admin';
import type { Profile } from '@/lib/database.types';

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllUsers().then(data => { setUsers(data); setLoading(false); });
  }, []);

  const filtered = users.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRoleChange(userId: string, role: UserRole) {
    await updateUserRole(userId, role);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  }

  if (loading) {
    return <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-emerald mx-auto mt-20" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <input
        type="text"
        placeholder="Search by name or ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2.5 rounded-xl bg-black/5 border border-black/10 text-gray-900 mb-6 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-black/5">
              <th className="pb-3 pr-4 font-medium">User</th>
              <th className="pb-3 pr-4 font-medium">Role</th>
              <th className="pb-3 pr-4 font-medium">XP</th>
              <th className="pb-3 pr-4 font-medium">Level</th>
              <th className="pb-3 pr-4 font-medium">Joined</th>
              <th className="pb-3 font-medium">Actions</th>
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
                <td className="py-3 pr-4">
                  <select
                    value={user.role || 'user'}
                    onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}
                    className="bg-white border border-black/10 rounded-lg px-2 py-1 text-xs text-gray-900"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-3 pr-4">{user.xp}</td>
                <td className="py-3 pr-4">{user.trekker_level}</td>
                <td className="py-3 pr-4 text-gray-400 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                    user.role === 'moderator' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {user.role || 'user'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
