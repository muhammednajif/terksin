/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-empty, @typescript-eslint/no-unused-expressions, react-hooks/preserve-manual-memoization, react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Camera, Clock, Star, Heart, MessageCircle, Share2, Navigation, TrendingUp, Sun, Award, Calendar, AlertCircle, Activity, Users, Bookmark, RefreshCw, X, Flag, MoreHorizontal, Navigation2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getPrivileges } from '@/lib/location-privileges';
import { fetchWeather, fetchLocationName } from '@/services/weather';
import type { WeatherData } from '@/services/weather';
import {
  fetchPosts, toggleLike, toggleSave, recordShare,
  fetchStories, createStory,
  toggleFollow, fetchPopularTrekkers, fetchLeaderboard,
  fetchUpcomingEvents, joinEvent,
  fetchChallenges, joinChallenge,
  searchCommunity, createSafetyReport, deletePost, reportPost,
} from '@/lib/community';
import type { PostWithAuthor, StoryWithAuthor } from '@/lib/database.types';
import { CommentsDrawer } from '@/components/community/CommentsDrawer';
import { StoryViewer } from '@/components/community/StoryViewer';
import { CreatePostModal } from '@/components/community/CreatePostModal';

const feedTabs = ['Latest', 'Popular', 'Nearby', 'Following'];

export const Community = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFeedParam = searchParams.get('feed') || 'latest';
  const [activeFeed, setActiveFeed] = useState(activeFeedParam);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<StoryWithAuthor[]>([]);
  const [storyIndex, setStoryIndex] = useState(-1);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [popularTrekkers, setPopularTrekkers] = useState<any[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const { user, profile, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const userCoords = useStore(s => s.userCoords);
  const { requestLocation, loading: locLoading } = useGeolocation();
  const privileges = getPrivileges(userCoords);
  const navigate = useNavigate();

  const loadPosts = useCallback(async (pg = 0, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPosts({
        page: pg, limit: 10, feed: activeFeed as any, userId: user?.id,
        latitude: userCoords?.latitude,
        longitude: userCoords?.longitude,
      });
      if (append) setPosts(prev => [...prev, ...result.posts]);
      else setPosts(result.posts);
      setHasMore(result.hasMore);
      setPage(pg);
    } catch {
      setError('Failed to load posts. Check your connection.');
    }
    setLoading(false);
  }, [activeFeed, user?.id]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadPosts(0),
      fetchStories().then(setStories).catch(() => {}),
      fetchLeaderboard().then(setLeaderboard).catch(() => {}),
      fetchUpcomingEvents().then(setEvents).catch(() => {}),
      fetchChallenges().then(setChallenges).catch(() => {}),
      fetchPopularTrekkers().then(setPopularTrekkers).catch(() => {}),
    ]);
    setRefreshing(false);
  }, [loadPosts]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (activeFeed === 'following' && !user) { showToast('Sign in to see Following feed'); return; }
    setPosts([]);
    setPage(0);
    loadPosts(0);
  }, [activeFeed, user?.id]);

  useEffect(() => {
    if (userCoords) {
      setWeatherLoading(true);
      Promise.all([
        fetchWeather(userCoords.latitude, userCoords.longitude),
        fetchLocationName(userCoords.latitude, userCoords.longitude),
      ]).then(([w, name]) => {
        setWeather(w);
        setLocationName(name);
        setWeatherLoading(false);
      });
    }
  }, [userCoords]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      if (!requireAuth()) return;
      setShowCreatePost(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!menuOpenPostId) return;
    const close = () => setMenuOpenPostId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpenPostId]);

  const handleTabChange = async (tab: string) => {
    const val = tab.toLowerCase();
    if (val === 'following' && !requireAuth()) return;
    if (val === 'nearby' && !userCoords) {
      const coords = await requestLocation();
      if (!coords) { showToast('Enable location to use Nearby feed'); return; }
    }
    setActiveFeed(val);
  };

  const handleLike = async (postId: string) => {
    if (!requireAuth()) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_user: !p.liked_by_user, like_count: p.liked_by_user ? p.like_count - 1 : p.like_count + 1 } as PostWithAuthor : p));
    try { await toggleLike(postId); }
    catch { setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_user: !p.liked_by_user, like_count: p.like_count } as PostWithAuthor : p)); }
  };

  const handleSave = async (postId: string) => {
    if (!requireAuth()) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved_by_user: !p.saved_by_user } as PostWithAuthor : p));
    try { await toggleSave(postId); }
    catch { setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved_by_user: !p.saved_by_user } as PostWithAuthor : p)); }
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/community/post/${postId}`;
    if (navigator.share) { try { await navigator.share({ url }); await recordShare(postId, 'web_share'); } catch {} }
    else { navigator.clipboard.writeText(url); showToast('Link copied!'); await recordShare(postId, 'link'); }
  };

  const handleDeletePost = async (postId: string) => {
    setMenuOpenPostId(null);
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Post deleted');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete post');
    }
  };

  const handleReportPost = async (postId: string) => {
    setMenuOpenPostId(null);
    try {
      await reportPost(postId, 'inappropriate');
      showToast('Report submitted');
    } catch { showToast('Failed to submit report'); }
  };

  const handleFollow = async (targetId: string) => {
    setFollowing(prev => {
      const n = new Set(prev);
      if (n.has(targetId)) n.delete(targetId);
      else n.add(targetId);
      return n;
    });
    try { await toggleFollow(targetId); } catch { showToast('Failed to update follow'); }
  };

  const handleStoryClick = (index: number) => {
    if (!requireAuth()) return;
    setStoryIndex(index);
  };

  const storyInputRef = useRef<HTMLInputElement>(null);
  const [storyUploading, setStoryUploading] = useState(false);
  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireAuth()) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setStoryUploading(true);
    try {
      await createStory(file);
      showToast('Story uploaded!');
      refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload story');
    } finally {
      setStoryUploading(false);
      if (storyInputRef.current) storyInputRef.current.value = '';
    }
  };

  const handleNearby = async () => {
    const coords = userCoords || await requestLocation();
    if (!coords) { showToast('Enable location to find nearby trekkers'); return; }
    setActiveFeed('nearby');
    searchCommunity(`${coords.latitude},${coords.longitude}`).then(results => {
      if (results.profiles?.length) {
        showToast(`Found ${results.profiles.length} trekkers near you!`);
      } else {
        showToast('No trekkers found nearby');
      }
    });
  };

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('');
  const handleSubmitReport = async () => {
    if (!reportType) { showToast('Select a report type'); return; }
    try {
      await createSafetyReport({ report_type: reportType });
      showToast('Safety report submitted');
      setShowReportForm(false);
      setReportType('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold font-heading mb-2">Treksin Community</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
            A place where trekkers connect, share adventures, and plan trips together.
          </p>
        </div>

        {/* Top Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-2xl border bg-white/50">
          <div className="flex-1 min-w-[200px] flex items-center gap-3 px-4 py-2 bg-black/5 rounded-full border cursor-pointer"
            onClick={() => navigate('/community/search')}>
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search trekkers, posts, treks, locations...</span>
          </div>
          <button className="px-4 py-2 bg-brand-emerald text-white rounded-full text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            disabled={storyUploading} onClick={() => { if (!requireAuth()) return; storyInputRef.current?.click(); }}>
            <Camera className="w-4 h-4" /> {storyUploading ? 'Uploading...' : 'Stories'}
          </button>
          <input ref={storyInputRef} type="file" accept="image/*,video/*" onChange={handleStoryUpload} className="hidden" />
          <button className="px-4 py-2 border border-black/10 hover:bg-black/5 rounded-full text-sm font-medium flex items-center gap-2"
            onClick={handleNearby}>
            <MapPin className="w-4 h-4" /> Nearby
          </button>
          <button className="px-4 py-2 bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20 rounded-full text-sm font-medium flex items-center gap-2"
            onClick={() => { if (!requireAuth()) return; setShowCreatePost(true); }}>
            <MessageCircle className="w-4 h-4" /> Create Post
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Stories */}
            <div className="flex gap-4 overflow-x-auto pb-2">
              {stories.length > 0 ? stories.map((story, i) => (
                <div key={story.id} onClick={() => handleStoryClick(i)} className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer">
                  <div className={`w-16 h-16 rounded-full p-[2px] ${story.viewed ? 'bg-gray-300' : 'bg-gradient-to-br from-brand-emerald to-blue-500'}`}>
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-sm font-bold">{story.author?.display_name?.charAt(0) || '?'}</div>
                  </div>
                  <span className="text-xs text-muted-foreground truncate w-full text-center">{story.author?.display_name || 'User'}</span>
                </div>
              )) : (
                <div className="flex gap-4">
                  {[1,2,3,4,5].map(i => <div key={i} className="flex flex-col items-center gap-1 min-w-[72px]">
                    <div className="w-16 h-16 rounded-full bg-black/10 animate-pulse" />
                    <div className="w-12 h-3 bg-black/10 rounded animate-pulse" />
                  </div>)}
                </div>
              )}
            </div>

            {/* Feed Tabs */}
            <div className="flex gap-4 border-b pb-2">
              {feedTabs.map(tab => (
                <button key={tab} onClick={() => handleTabChange(tab)}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeFeed === tab.toLowerCase() ? 'text-brand-emerald border-brand-emerald' : 'text-muted-foreground border-transparent hover:text-black'}`}>
                  {tab}
                </button>
              ))}
              <button onClick={refreshAll} className="ml-auto p-1 text-muted-foreground hover:text-black">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Posts */}
            {error && (
              <div className="text-center py-10">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">{error}</p>
                <button onClick={() => loadPosts(0)} className="px-4 py-2 bg-brand-emerald text-white rounded-full text-sm">Retry</button>
              </div>
            )}

            {loading && posts.length === 0 && (
              <div className="space-y-6">
                {[1,2,3].map(i => <div key={i} className="rounded-2xl border bg-white overflow-hidden">
                  <div className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-black/10 animate-pulse" /><div className="flex-1"><div className="w-24 h-3 bg-black/10 rounded animate-pulse mb-1" /><div className="w-16 h-2 bg-black/5 rounded animate-pulse" /></div></div>
                  <div className="h-72 bg-black/10 animate-pulse" />
                  <div className="p-4 space-y-2"><div className="w-full h-3 bg-black/10 rounded animate-pulse" /><div className="w-3/4 h-3 bg-black/10 rounded animate-pulse" /></div>
                </div>)}
              </div>
            )}

            {!loading && posts.length === 0 && !error && (
              <div className="text-center py-16">
                <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No posts yet</h3>
                <p className="text-sm text-muted-foreground">Be the first to share your trek!</p>
              </div>
            )}

            {posts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div onClick={() => navigate('/community/profile/' + post.author_id)} className="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center text-sm font-bold cursor-pointer overflow-hidden">
                        {post.author?.avatar_url ? <img src={post.author.avatar_url} className="w-full h-full object-cover" /> : (post.author?.display_name?.charAt(0) || '?')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span onClick={() => navigate('/community/profile/' + post.author_id)} className="font-semibold text-sm cursor-pointer hover:text-brand-emerald">{post.author?.display_name || 'User'}</span>
                          {post.author?.verification_badge && <span className="text-[10px] bg-brand-emerald/10 text-brand-emerald px-2 py-0.5 rounded-full">Verified</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 relative">
                      <span className="text-[10px] px-2 py-1 bg-black/5 rounded-full text-muted-foreground">{post.post_type}</span>
                      <button onClick={(e) => { e.stopPropagation(); setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id); }} className="p-1 rounded-full hover:bg-black/5 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {menuOpenPostId === post.id && (
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border z-50 py-1 min-w-[140px]">
                          {user?.id === post.author_id ? (
                            <>
                              <button onClick={() => { setMenuOpenPostId(null); showToast('Edit coming soon'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 transition-colors">Edit</button>
                              <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleReportPost(post.id)} className="w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-orange-50 transition-colors">Report</button>
                              <button onClick={() => { setMenuOpenPostId(null); showToast('Hidden from your feed'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 transition-colors">Hide</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                {/* Media */}
                <div className="relative">
                  {post.media?.[0]?.media_url && (
                    <img src={post.media[0].media_url} alt="" className="w-full h-72 object-cover" />
                  )}
                  {post.trek_location && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 text-white mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="font-semibold text-sm">{post.trek_location}</span>
                        {post.rating && (
                          <div className="flex ml-auto">{[...Array(5)].map((_, s) => <Star key={s} className={`w-3 h-3 ${s < (post.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`} />)}</div>
                        )}
                      </div>
                      <div className="flex gap-4 text-white/80 text-xs">
                        {post.distance_km && <span>{post.distance_km} km</span>}
                        {post.duration_hours && <span>{post.duration_hours}h</span>}
                        {post.weather_temp_c && <span>{post.weather_temp_c}°C</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption & Actions */}
                <div className="p-4">
                  {post.caption && <p className="text-sm mb-3">{post.caption}</p>}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 text-sm transition-colors ${post.liked_by_user ? 'text-red-500' : 'hover:text-red-500'}`}>
                      <Heart className={`w-4 h-4 ${post.liked_by_user ? 'fill-current' : ''}`} /> {post.like_count}
                    </button>
                    <button onClick={() => { if (!requireAuth()) return; setCommentPostId(post.id); }}
                      className="flex items-center gap-1.5 hover:text-brand-emerald transition-colors text-sm">
                      <MessageCircle className="w-4 h-4" /> {post.comment_count}
                    </button>
                    <button onClick={() => handleShare(post.id)} className="flex items-center gap-1.5 hover:text-blue-500 transition-colors text-sm">
                      <Share2 className="w-4 h-4" /> {post.share_count}
                    </button>
                    <button onClick={() => handleSave(post.id)} className={`flex items-center gap-1.5 transition-colors text-sm ${post.saved_by_user ? 'text-brand-emerald' : 'hover:text-brand-emerald'}`}>
                      <Bookmark className={`w-4 h-4 ${post.saved_by_user ? 'fill-current' : ''}`} />
                    </button>
                    {post.route_id && (
                      <button onClick={() => navigate(`/treks/${post.route_id}`)} className="flex items-center gap-1.5 hover:text-brand-emerald transition-colors text-sm ml-auto">
                        <Navigation className="w-4 h-4" /> Route
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {hasMore && !loading && (
              <div className="text-center py-6">
                <button onClick={() => loadPosts(page + 1, true)} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-all">
                  Load More
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="p-4 rounded-2xl border bg-white">
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-brand-emerald" /> Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => navigate('/ai-planner')} className="p-3 rounded-xl bg-white/80 border text-center text-xs font-medium hover:bg-brand-emerald/10 transition-colors">
                  <Calendar className="w-5 h-5 mx-auto mb-1 text-brand-emerald" />Plan Trek
                </button>
                <button onClick={() => { if (!requireAuth()) return; setShowReportForm(true); }} className="p-3 rounded-xl bg-white/80 border text-center text-xs font-medium hover:bg-brand-emerald/10 transition-colors">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1 text-orange-500" />Report
                </button>
                <button onClick={() => navigate('/community/people')} className="p-3 rounded-xl bg-white/80 border text-center text-xs font-medium hover:bg-brand-emerald/10 transition-colors">
                  <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />Discover People
                </button>
              </div>
            </div>

            {/* Weather */}
            <div className="p-4 rounded-2xl border bg-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Sun className="w-4 h-4 text-yellow-500" /> Weather</h3>
                <span className="text-xs text-muted-foreground">{locationName || profile?.location || 'Your location'}</span>
              </div>
              <div className="flex items-center gap-4">
                {weather ? (
                  <>
                    <div className="text-3xl font-bold">{weather.temperature}°C</div>
                    <div className="text-sm text-muted-foreground">
                      <p>{weather.condition}</p>
                    </div>
                  </>
                ) : weatherLoading ? (
                  <div className="text-sm text-muted-foreground animate-pulse">Loading...</div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">--°C</div>
                    <div className="text-sm text-muted-foreground">
                      <p>Enable location for weather</p>
                    </div>
                  </>
                )}
              </div>
              {!weather && !weatherLoading && (
                <button onClick={() => requestLocation()} className="mt-3 text-xs text-brand-emerald font-medium hover:underline">
                  Share location
                </button>
              )}
            </div>

            {/* Challenges */}
            <div className="p-4 rounded-2xl border bg-white">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-brand-emerald" /> Challenges</h3>
              {challenges.length > 0 ? challenges.map((c) => (
                <div key={c.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{c.title}</span>
                    <span className="text-[10px] text-brand-emerald">0%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-emerald rounded-full" style={{ width: '0%' }} />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-muted-foreground">{c.reward_xp} XP</span>
                    <button onClick={() => { if (!requireAuth()) return; joinChallenge(c.id).then(() => showToast('Challenge joined!')).catch(() => showToast('Already joined')); }}
                      className="text-[10px] px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald rounded-full">Join</button>
                  </div>
                </div>
              )) : loading ? <div className="text-xs text-muted-foreground">Loading...</div> : <div className="text-xs text-muted-foreground">No active challenges</div>}
            </div>

            {/* Leaderboard */}
            <div className="p-4 rounded-2xl border bg-white">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-emerald" /> Leaderboard</h3>
              {leaderboard.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-brand-emerald/20 text-brand-emerald' : i === 1 ? 'bg-brand-emerald/15 text-brand-emerald' : i === 2 ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-black/10 text-muted-foreground'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className="text-sm">{item.display_name || item.username}</span>
                  </div>
                  <span className="text-xs font-semibold">{item.xp?.toLocaleString() || 0} XP</span>
                </div>
              ))}
              {leaderboard.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No data yet</div>}
            </div>

            {/* Group Treks */}
            <div className="p-4 rounded-2xl border bg-white">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-brand-emerald" /> Group Treks</h3>
              {events.length > 0 ? events.slice(0, 3).map((event, i) => (
                <div key={event.id || i} className="p-3 rounded-xl bg-white/80 border mb-2 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{event.title}</h4>
                    <span className="text-[10px] bg-brand-emerald/10 text-brand-emerald px-2 py-0.5 rounded-full">{event.difficulty || 'All'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.event_date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.start_time?.slice(0, 5)}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.available_seats} seats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-emerald text-sm">${event.price || 'Free'}</span>
                    <button onClick={() => { if (!requireAuth()) return; joinEvent(event.id).then(() => { showToast('Joined!'); refreshAll(); }).catch(err => showToast(err.message)); }}
                      className="px-3 py-1 bg-brand-emerald text-white text-xs rounded-full font-medium">Join</button>
                  </div>
                </div>
              )) : <div className="text-xs text-muted-foreground text-center py-4">No upcoming group treks</div>}
            </div>

            {/* Popular Trekkers */}
            <div className="p-4 rounded-2xl border bg-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Popular Trekkers</h3>
                <button onClick={() => navigate('/community/people')} className="text-xs text-brand-emerald hover:underline">See all</button>
              </div>
              {popularTrekkers.slice(0, 5).map((p, i) => (
                <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/community/profile/' + p.id)}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-emerald/20 flex items-center justify-center text-xs font-bold">{p.display_name?.charAt(0) || '?'}</div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{p.display_name || p.username}</p>
                      <p className="text-[10px] text-muted-foreground">{p.completed_treks || 0} treks · {p.xp?.toLocaleString() || 0} XP</p>
                    </div>
                  </div>
                  <button onClick={() => { if (!requireAuth()) return; handleFollow(p.id); }}
                    className={`text-xs px-3 py-1 rounded-full shrink-0 ${following.has(p.id) ? 'border border-black/10 text-muted-foreground' : 'bg-brand-emerald text-white'}`}>
                    {following.has(p.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
              {popularTrekkers.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No trekkers yet</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Comments Drawer */}
      {commentPostId && (
        <CommentsDrawer postId={commentPostId} isOpen={!!commentPostId} onClose={() => setCommentPostId(null)} />
      )}

      {/* Story Viewer */}
      {storyIndex >= 0 && stories.length > 0 && (
        <StoryViewer stories={stories} initialIndex={storyIndex} userId={user?.id}
          onClose={() => { setStoryIndex(-1); refreshAll(); }} onUpdate={refreshAll} />
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal
          isOpen={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onSuccess={refreshAll}
        />
      )}

      {/* Report Form */}
      {showReportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReportForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Flag className="w-4 h-4 text-orange-500" /> Safety Report</h3>
              <button onClick={() => setShowReportForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-emerald">
              <option value="">Select type...</option>
              <option value="hazard">Trail hazard</option>
              <option value="weather">Dangerous weather</option>
              <option value="wildlife">Wildlife concern</option>
              <option value="harassment">Harassment</option>
              <option value="lost">Lost trekker</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowReportForm(false)} className="flex-1 px-4 py-2 border rounded-xl text-sm">Cancel</button>
              <button onClick={handleSubmitReport} disabled={!reportType}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">Submit Report</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24); return `${d}d ago`;
}