import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { fetchPopularTrekkers, fetchSuggestedTrekkers, toggleFollow } from '@/lib/community';

export const CommunityPeople = () => {
  const { user, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const navigate = useNavigate();
  const [suggested, setSuggested] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [popularData] = await Promise.all([
        fetchPopularTrekkers(),
      ]);
      setPopular(popularData);
      if (user) {
        const suggestedData = await fetchSuggestedTrekkers(user.id);
        setSuggested(suggestedData);
      }
    } catch { showToast('Failed to load'); }
    setLoading(false);
  };

  const handleFollow = async (targetId: string) => {
    if (!requireAuth()) return;
    setFollowing(prev => { const n = new Set(prev); n.add(targetId); return n; });
    try { await toggleFollow(targetId); } catch { setFollowing(prev => { const n = new Set(prev); n.delete(targetId); return n; }); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-heading">Discover Trekkers</h1>
            <p className="text-sm text-muted-foreground mt-1">Connect with the Treksin community</p>
          </div>
          <button onClick={() => navigate('/community/search')}
            className="p-2 rounded-full hover:bg-black/5">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {user && suggested.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-emerald" /> Suggested for You
            </h2>
            <div className="space-y-2">
              {suggested.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border cursor-pointer hover:shadow-sm"
                  onClick={() => navigate(`/community/profile/${p.id}`)}>
                  <div className="w-12 h-12 rounded-full bg-brand-emerald/20 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                    {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : (p.display_name?.charAt(0) || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.display_name || p.username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.completed_treks ? `${p.completed_treks} treks completed` : 'New trekker'}
                      {p.location ? ` · ${p.location}` : ''}
                    </p>
                    {p.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.bio}</p>}
                  </div>
                  {p.id !== user?.id && (
                    <button onClick={e => { e.stopPropagation(); handleFollow(p.id); }}
                      className={`text-xs px-4 py-1.5 rounded-full border shrink-0 font-medium ${
                        following.has(p.id) ? 'border-black/10 text-muted-foreground' : 'bg-brand-emerald text-white border-brand-emerald'
                      }`}>
                      {following.has(p.id) ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-emerald" /> Popular Trekkers
          </h2>
          {popular.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No trekkers yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {popular.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border cursor-pointer hover:shadow-sm"
                  onClick={() => navigate(`/community/profile/${p.id}`)}>
                  <div className="w-12 h-12 rounded-full bg-brand-emerald/20 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                    {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : (p.display_name?.charAt(0) || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.display_name || p.username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.completed_treks ? `${p.completed_treks} treks` : ''}
                      {p.xp ? ` · ${p.xp.toLocaleString()} XP` : ''}
                      {p.location ? ` · ${p.location}` : ''}
                    </p>
                  </div>
                  {p.id !== user?.id && (
                    <button onClick={e => { e.stopPropagation(); handleFollow(p.id); }}
                      className={`text-xs px-4 py-1.5 rounded-full border shrink-0 font-medium ${
                        following.has(p.id) ? 'border-black/10 text-muted-foreground' : 'bg-brand-emerald text-white border-brand-emerald'
                      }`}>
                      {following.has(p.id) ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {user && suggested.length === 0 && popular.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No trekkers to discover yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Be the first to join the community!</p>
          </div>
        )}
      </div>
    </div>
  );
};
