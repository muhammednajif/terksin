import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/hooks/useAuth';
import { BackButton } from '@/components/ui/BackButton';

const navItems = [
  { path: '/admin', label: 'Command Center', icon: '🎮' },
  { path: '/admin/dashboard', label: 'Dashboard', icon: '◉' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/treks', label: 'Treks', icon: '🏔' },
  { path: '/admin/expeditions', label: 'Expeditions', icon: '📅' },
  { path: '/admin/departures', label: 'Departures', icon: '🚌' },
  { path: '/admin/bookings', label: 'Bookings', icon: '📋' },
  { path: '/admin/moderation', label: 'Moderation', icon: '🛡' },
  { path: '/admin/safety', label: 'Safety Reports', icon: '⚠' },
  { path: '/admin/trekpulse', label: 'TrekPulse', icon: '📡' },
  { path: '/admin/group-treks', label: 'Group Treks', icon: '👥' },
  { path: '/admin/analytics', label: 'Analytics', icon: '📊' },
  { path: '/admin/challenges', label: 'Challenges', icon: '🏆' },
  { path: '/admin/announcements', label: 'Announcements', icon: '📢' },
  { path: '/admin/audit-log', label: 'Audit Log', icon: '📝' },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isModerator } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-black/5 transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-black/5">
          <Link to="/admin" className="text-xl font-bold text-brand-emerald font-heading">Treksin Admin</Link>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map(item => {
            if (item.path === '/admin/moderation' && !isModerator) return null;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-brand-emerald/10 text-brand-emerald font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-black/5 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-xs font-medium">
                {profile?.display_name?.[0] || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.display_name || 'Admin'}</p>
              <p className="text-xs text-gray-400 capitalize">{profile?.role || 'admin'}</p>
            </div>
            <BackButton to="/" className="text-gray-400 hover:text-gray-600" />
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center px-4 lg:px-6 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <BackButton to="/" className="text-sm text-gray-400 hover:text-gray-600" />
        </header>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
