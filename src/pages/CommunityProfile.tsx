import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Settings, MapPin, Mountain, Award, Users, TrendingUp, Activity, Loader2, Heart, MessageCircle, Bookmark, X, Share2, BookOpen, Globe, Footprints, Compass, Medal, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import type { Profile, PostWithAuthor } from '@/lib/database.types';
import { toggleFollow, fetchSavedPosts, fetchFollowers, fetchFollowing } from '@/lib/community';

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24); return `${d}d ago`;
}

const TREKKER_LEVELS = [
  { minXp: 0, title: 'Trail Starter' },
  { minXp: 500, title: 'Pathfinder' },
  { minXp: 2000, title: 'Explorer' },
  { minXp: 5000, title: 'Trailblazer' },
  { minXp: 15000, title: 'Summit Seeker' },
  { minXp: 50000, title: 'Trek Legend' },
];

function getLevel(xp: number): { title: string; level: number } {
  for (let i = TREKKER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= TREKKER_LEVELS[i].minXp) return { title: TREKKER_LEVELS[i].title, level: i + 1 };
  }
  return { title: TREKKER_LEVELS[0].title, level: 1 };
}

export const CommunityProfile = () => {
  const { id } = useParams();
  const { user: authUser, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const navigate = useNavigate();

  const isOwnProfile = !id || id === authUser?.id;
  const profileUserId = isOwnProfile ? authUser?.id : id;

  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'achievements' | 'passport'>('posts');
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [listUsers, setListUsers] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '', location: '' });

  useEffect(() => {
    if (isOwnProfile && !authUser) { setLoading(false); return; }
    if (!profileUserId) return;
    loadProfile();
  }, [profileUserId, isOwnProfile, authUser]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', profileUserId).single();
      setProfileData(prof as Profile);
      if (prof) {
        const { count: f1 } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileUserId);
        const { count: f2 } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileUserId);
        setFollowersCount(f1 || 0);
        setFollowingCount(f2 || 0);
      }
      if (authUser && !isOwnProfile) {
        const { data: f } = await supabase.from('follows').select('id').eq('follower_id', authUser.id).eq('following_id', profileUserId).maybeSingle();
        setFollowing(!!f);
      }

      const { data: userPosts } = await supabase
        .from('posts')
        .select(`*, author:profiles!author_id(*), media:post_media(*)`)
        .eq('author_id', profileUserId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);
      if (userPosts) setPosts(userPosts as unknown as PostWithAuthor[]);

      if (isOwnProfile) {
        const saved = await fetchSavedPosts();
        setSavedPosts(saved);
      }
    } catch { showToast('Failed to load profile'); }
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!requireAuth() || !profileUserId) return;
    try {
      await toggleFollow(profileUserId);
      setFollowing(!following);
      setFollowersCount(c => following ? c - 1 : c + 1);
    } catch { showToast('Failed to update follow'); }
  };

  const openList = async (type: 'followers' | 'following') => {
    if (!profileUserId) return;
    setListLoading(true);
    try {
      const res = type === 'followers' ? await fetchFollowers(profileUserId) : await fetchFollowing(profileUserId);
      setListUsers(res.users);
    } catch { showToast('Failed to load'); }
    setListLoading(false);
    if (type === 'followers') setShowFollowers(true);
    else setShowFollowing(true);
  };

  const handleEditProfile = () => {
    if (!profileData) return;
    setEditForm({ display_name: profileData.display_name || '', bio: profileData.bio || '', location: profileData.location || '' });
    setShowEditProfile(true);
  };

  const saveEditProfile = async () => {
    if (!authUser) return;
    await supabase.from('profiles').update(editForm).eq('id', authUser.id);
    setProfileData(prev => prev ? { ...prev, ...editForm } : prev);
    setShowEditProfile(false);
    showToast('Profile updated');
  };

  const handleShareProfile = () => {
    if (!profileUserId) return;
    const url = `${window.location.origin}/community/profile/${profileUserId}`;
    if (navigator.share) { navigator.share({ url }).catch(() => {}); }
    else { navigator.clipboard.writeText(url); showToast('Profile link copied!'); }
  };

  const level = profileData ? getLevel(profileData.xp || 0) : { title: 'Trail Starter', level: 1 };

  if (!authUser && isOwnProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sign in to see your profile</h2>
          <p className="text-sm text-muted-foreground mb-4">Your trekking passport awaits.</p>
          <button onClick={() => requireAuth()} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-medium">Sign In</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Trekker not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Cover + Avatar */}
        <div className="relative h-40 md:h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-emerald/30 to-blue-500/30 mb-16">
          {profileData.cover_url && <img src={profileData.cover_url} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="relative -mt-20 mb-6 flex items-end justify-between px-4">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-white bg-brand-emerald/20 flex items-center justify-center text-2xl font-bold shadow overflow-hidden">
              {profileData.avatar_url ? (
                <img src={profileData.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profileData.display_name?.charAt(0) || '?'
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold">{profileData.display_name || profileData.username}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {profileData.username && <span>@{profileData.username}</span>}
                {profileData.location && <><MapPin className="w-3 h-3" /><span>{profileData.location}</span></>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pb-1">
            {isOwnProfile ? (
              <>
                <button onClick={handleEditProfile} className="p-2 border border-black/10 rounded-xl hover:bg-black/5"><Settings className="w-5 h-5" /></button>
                <button onClick={handleShareProfile} className="p-2 border border-black/10 rounded-xl hover:bg-black/5"><Share2 className="w-5 h-5" /></button>
              </>
            ) : (
              <button onClick={handleFollow}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  following ? 'border border-black/10 text-muted-foreground' : 'bg-brand-emerald text-white'
                }`}>
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {profileData.bio && <p className="text-sm text-muted-foreground mb-6 px-4">{profileData.bio}</p>}

        {/* Level + Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 px-4">
          <div className="p-3 rounded-xl bg-white border text-center">
            <p className="text-2xl font-bold text-brand-emerald">{level.level}</p>
            <p className="text-[10px] text-muted-foreground">{level.title}</p>
          </div>
          <div className="p-3 rounded-xl bg-white border text-center">
            <p className="text-2xl font-bold">{profileData.xp || 0}</p>
            <p className="text-[10px] text-muted-foreground">XP</p>
          </div>
          <button onClick={() => openList('followers')} className="p-3 rounded-xl bg-white border text-center hover:shadow-sm transition-shadow">
            <p className="text-2xl font-bold">{followersCount}</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </button>
          <button onClick={() => openList('following')} className="p-3 rounded-xl bg-white border text-center hover:shadow-sm transition-shadow">
            <p className="text-2xl font-bold">{followingCount}</p>
            <p className="text-[10px] text-muted-foreground">Following</p>
          </button>
        </div>

        {/* Trekking Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6 px-4">
          <div className="p-3 rounded-xl bg-white border flex items-center gap-3">
            <Mountain className="w-5 h-5 text-brand-emerald" />
            <div><p className="font-bold text-sm">{profileData.completed_treks || 0}</p><p className="text-[10px] text-muted-foreground">Treks</p></div>
          </div>
          <div className="p-3 rounded-xl bg-white border flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-brand-emerald" />
            <div><p className="font-bold text-sm">{(profileData.total_distance_km || 0).toFixed(0)}km</p><p className="text-[10px] text-muted-foreground">Distance</p></div>
          </div>
          <div className="p-3 rounded-xl bg-white border flex items-center gap-3">
            <Award className="w-5 h-5 text-brand-emerald" />
            <div><p className="font-bold text-sm">{(profileData.highest_elevation_m || 0).toFixed(0)}m</p><p className="text-[10px] text-muted-foreground">Elevation</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b mb-6 px-4">
          {(['posts', 'passport', ...(isOwnProfile ? ['saved' as const] : []), 'achievements'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab ? 'text-brand-emerald border-brand-emerald' : 'text-muted-foreground border-transparent'
              }`}>
              {tab === 'saved' ? 'Saved' : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div className="space-y-4 px-4">
            {posts.length === 0 ? (
              <div className="text-center py-10">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{isOwnProfile ? 'Share your first trek adventure!' : 'This trekker hasn\'t shared any public adventures yet.'}</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="rounded-2xl border bg-white overflow-hidden shadow-sm cursor-pointer" onClick={() => navigate(`/community/post/${post.id}`)}>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{post.post_type}</p>
                    {post.caption && <p className="text-sm">{post.caption}</p>}
                    {post.media?.[0]?.media_url && (
                      <img src={post.media[0].media_url} alt="" className="w-full h-48 object-cover rounded-xl mt-2" />
                    )}
                    <div className="flex items-center gap-4 mt-3 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.like_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comment_count}</span>
                      <span className="ml-auto">{timeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'saved' && isOwnProfile && (
          <div className="space-y-4 px-4">
            {savedPosts.length === 0 ? (
              <div className="text-center py-10">
                <Bookmark className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Posts you save will appear here</p>
              </div>
            ) : (
              savedPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border bg-white overflow-hidden shadow-sm cursor-pointer" onClick={() => navigate(`/community/post/${post.id}`)}>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{post.post_type}</p>
                    {post.caption && <p className="text-sm">{post.caption}</p>}
                    {post.media?.[0]?.media_url && (
                      <img src={post.media[0].media_url} alt="" className="w-full h-48 object-cover rounded-xl mt-2" />
                    )}
                    <div className="flex items-center gap-4 mt-3 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.like_count}</span>
                      <span className="ml-auto">{timeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'passport' && (
          <div className="px-4">
            {profileUserId !== authUser?.id ? (
              <div className="text-center py-10">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">This trekker's passport is private.</p>
              </div>
            ) : (
              <button onClick={() => navigate('/passport')}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 w-full text-left border border-white/10 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-emerald/20 to-transparent rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-brand-emerald" />
                    <span className="text-xs text-brand-emerald font-medium uppercase tracking-wider">Adventure Passport</span>
                  </div>
                  <p className="text-lg font-bold text-white">{(profileData as any).completed_treks || 0} Treks Completed</p>
                  <p className="text-sm text-white/60">{profileData.xp || 0} Total XP</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                    <Compass className="w-3 h-3" /> View full passport <span aria-hidden="true">→</span>
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="text-center py-10 px-4">
            <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Achievements coming soon</p>
          </div>
        )}
      </div>

      {/* Followers Modal */}
      {showFollowers && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowFollowers(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm max-h-[70vh] overflow-y-auto mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold">Followers</h3>
              <button onClick={() => setShowFollowers(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-2">
              {listLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : listUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">{isOwnProfile ? 'You don\'t have any followers yet.' : 'No followers yet.'}</p>
                  {isOwnProfile && <button onClick={() => { setShowFollowers(false); navigate('/community/people'); }} className="mt-3 text-sm text-brand-emerald font-medium">Discover trekkers</button>}
                </div>
              ) : (
                listUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 cursor-pointer"
                    onClick={() => { setShowFollowers(false); navigate(`/community/profile/${u.id}`); }}>
                    <div className="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : (u.display_name?.charAt(0) || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
                      {u.completed_treks ? <p className="text-xs text-muted-foreground">{u.completed_treks} treks</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowFollowing(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm max-h-[70vh] overflow-y-auto mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold">Following</h3>
              <button onClick={() => setShowFollowing(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-2">
              {listLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : listUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">{isOwnProfile ? 'You\'re not following anyone yet. Discover trekkers!' : 'Not following anyone yet.'}</p>
                  {isOwnProfile && <button onClick={() => { setShowFollowing(false); navigate('/community/people'); }} className="mt-3 text-sm text-brand-emerald font-medium">Discover trekkers</button>}
                </div>
              ) : (
                listUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 cursor-pointer"
                    onClick={() => { setShowFollowing(false); navigate(`/community/profile/${u.id}`); }}>
                    <div className="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : (u.display_name?.charAt(0) || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
                      {u.completed_treks ? <p className="text-xs text-muted-foreground">{u.completed_treks} treks</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditProfile(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                <input value={editForm.display_name} onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
                <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                <input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald" />
              </div>
              <button onClick={saveEditProfile} className="w-full py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
