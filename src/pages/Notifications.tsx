/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserPlus, Award, AlertTriangle, CheckCheck, Check, Loader2, Calendar, Map, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/community';
import { PageHeader } from '@/components/ui/PageHeader';

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24); return `${d}d ago`;
}

export const Notifications = () => {
  const { user, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'social' | 'treks' | 'journeys' | 'safety'>('all');

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch { showToast('Failed to load notifications'); }
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    showToast('All marked as read');
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.is_read) await handleMarkRead(n.id);
    if (n.type === 'follow') navigate(`/community/profile/${n.actor_id}`);
    else if (n.type === 'journey_completion' || n.type === 'journey_reminder') navigate(`/journeys/${n.reference_id}`);
    else if (n.type === 'journey_safety') navigate(`/journeys/${n.reference_id}`);
    else if (n.reference_id) navigate(`/community/post/${n.reference_id}`);
    else navigate('/community');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'post_like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': case 'reply': return <MessageCircle className="w-4 h-4 text-brand-emerald" />;
      case 'challenge_complete': case 'badge_earned': return <Award className="w-4 h-4 text-yellow-500" />;
      case 'safety_alert': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'journey_reminder': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'journey_completion': return <Map className="w-4 h-4 text-brand-emerald" />;
      case 'journey_safety': return <ShieldCheck className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const filtered = activeTab === 'all' ? notifications : notifications.filter(n => {
    if (activeTab === 'social') return ['follow', 'post_like', 'comment', 'reply'].includes(n.type);
    if (activeTab === 'treks') return ['trek_invite', 'event_update', 'challenge_complete', 'badge_earned'].includes(n.type);
    if (activeTab === 'safety') return ['safety_alert'].includes(n.type);
    if (activeTab === 'journeys') return ['journey_reminder', 'journey_completion', 'journey_safety'].includes(n.type);
    return true;
  });

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'social' as const, label: 'Social' },
    { key: 'treks' as const, label: 'Treks' },
    { key: 'journeys' as const, label: 'Journeys' },
    { key: 'safety' as const, label: 'Safety' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sign in to see your notifications</h2>
          <p className="text-sm text-muted-foreground mb-4">Notifications for journeys, likes, follows, and more will appear here.</p>
          <button onClick={() => requireAuth()} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-medium">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <PageHeader title="Notifications" actions={
          <button onClick={handleMarkAllRead} className="text-xs text-brand-emerald font-semibold hover:underline">
            Mark all as read
          </button>
        } />
      </div>
      {/* Sticky tabs */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-black/5">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-6 justify-center border-b border-black/5 mb-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'text-black border-brand-emerald' : 'text-muted-foreground border-transparent hover:text-black'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No new notifications in this tab.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((n) => (
              <button key={n.id} onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-4 rounded-2xl transition-colors flex items-start gap-3 ${
                  n.is_read ? 'bg-white' : 'bg-brand-emerald/5'
                } hover:bg-black/5`}>
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{n.title}</span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-emerald flex-shrink-0" />}
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                    className="p-1 hover:bg-black/5 rounded-full flex-shrink-0">
                    <CheckCheck className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
