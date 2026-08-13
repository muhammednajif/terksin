import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Users, MapPin, Loader2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { searchCommunity, searchProfiles, toggleFollow } from '@/lib/community';
import { PageHeader } from '@/components/ui/PageHeader';

export const CommunitySearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'posts' | 'treks' | 'locations'>('all');
  const [results, setResults] = useState<any>({ profiles: [], posts: [] });
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [profilePage, setProfilePage] = useState(0);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const navigate = useNavigate();

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'people' as const, label: 'People' },
    { key: 'posts' as const, label: 'Posts' },
    { key: 'treks' as const, label: 'Treks' },
    { key: 'locations' as const, label: 'Locations' },
  ];

  const doSearch = useCallback(async (q: string, type?: typeof activeTab) => {
    if (q.length < 2) { setResults({ profiles: [], posts: [] }); setAllProfiles([]); return; }
    setLoading(true);
    try {
      if (type === 'people') {
        const res = await searchProfiles(q, 0);
        setAllProfiles(res.profiles);
        setHasMore(res.hasMore);
        setProfilePage(0);
      } else {
        const res = await searchCommunity(q, type === 'all' ? undefined : type);
        setResults(res);
      }
    } catch { showToast('Search failed'); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery, activeTab);
  }, []);

  useEffect(() => {
    if (!query && initialQuery) {
      setSearchParams({}, { replace: true });
    }
  }, [query]);

  const debounced = useRef<any>(null);
  const handleInput = (val: string) => {
    setQuery(val);
    clearTimeout(debounced.current);
    if (val.length >= 2) {
      debounced.current = setTimeout(() => {
        doSearch(val, activeTab);
        setSearchParams(val ? { q: val } : {}, { replace: true });
      }, 300);
    } else {
      setResults({ profiles: [], posts: [] });
      setAllProfiles([]);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (query.length >= 2) doSearch(query, tab);
  };

  const loadMoreProfiles = async () => {
    const next = profilePage + 1;
    const res = await searchProfiles(query, next);
    setAllProfiles(prev => [...prev, ...res.profiles]);
    setHasMore(res.hasMore);
    setProfilePage(next);
  };

  const handleFollow = async (targetId: string) => {
    if (!requireAuth()) return;
    setFollowing(prev => { const n = new Set(prev); n.add(targetId); return n; });
    try { await toggleFollow(targetId); } catch { setFollowing(prev => { const n = new Set(prev); n.delete(targetId); return n; }); }
  };

  const showAllPeople = activeTab === 'all' && results.profiles?.length > 0;
  const showAllPosts = activeTab === 'all' && results.posts?.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <PageHeader actions={
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border shadow-sm max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input ref={inputRef} type="text" value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="Search trekkers, posts, treks, locations..."
              className="bg-transparent border-none text-sm focus:outline-none w-full" autoFocus />
            {query && <button onClick={() => handleInput('')}><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
        } />

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key ? 'bg-brand-emerald text-white' : 'bg-black/5 text-muted-foreground hover:bg-black/10'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {!query && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold mb-1">Search Treksin</h3>
            <p className="text-sm text-muted-foreground">Find trekkers, adventures, and destinations</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query.length >= 2 && activeTab === 'all' && (
          <>
            {results.profiles?.length === 0 && results.posts?.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">No results</h3>
                <p className="text-sm text-muted-foreground">Try a different search term</p>
              </div>
            )}

            {showAllPeople && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">People</h3>
                  <button onClick={() => handleTabChange('people')} className="text-xs text-brand-emerald">See all</button>
                </div>
                <div className="space-y-1">
                  {results.profiles.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer"
                      onClick={() => navigate(`/community/profile/${p.id}`)}>
                      <div className="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" /> : (p.display_name?.charAt(0) || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.completed_treks ? `${p.completed_treks} treks` : ''}
                          {p.location ? ` · ${p.location}` : ''}
                        </p>
                      </div>
                      {user && p.id !== user.id && (
                        <button onClick={e => { e.stopPropagation(); handleFollow(p.id); }}
                          className={`text-xs px-3 py-1 rounded-full border shrink-0 ${
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

            {showAllPosts && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Posts</h3>
                  <button onClick={() => handleTabChange('posts')} className="text-xs text-brand-emerald">See all</button>
                </div>
                <div className="space-y-2">
                  {results.posts.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl bg-white border cursor-pointer hover:shadow-sm"
                      onClick={() => navigate(`/community/post/${p.id}`)}>
                      <p className="text-xs text-muted-foreground mb-1">{p.post_type}</p>
                      {p.caption && <p className="text-sm line-clamp-2">{p.caption}</p>}
                      {p.trek_location && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.trek_location}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && query.length >= 2 && activeTab === 'people' && (
          <>
            {allProfiles.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">No trekkers found</h3>
                <p className="text-sm text-muted-foreground">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-1">
                {allProfiles.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer"
                    onClick={() => navigate(`/community/profile/${p.id}`)}>
                    <div className="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" /> : (p.display_name?.charAt(0) || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.completed_treks ? `${p.completed_treks} treks` : ''}
                        {p.location ? ` · ${p.location}` : ''}
                      </p>
                    </div>
                    {user && p.id !== user.id && (
                      <button onClick={e => { e.stopPropagation(); handleFollow(p.id); }}
                        className={`text-xs px-3 py-1 rounded-full border shrink-0 ${
                          following.has(p.id) ? 'border-black/10 text-muted-foreground' : 'bg-brand-emerald text-white border-brand-emerald'
                        }`}>
                        {following.has(p.id) ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))}
                {hasMore && (
                  <div className="text-center py-4">
                    <button onClick={loadMoreProfiles} className="text-sm text-brand-emerald font-medium">Load more</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && query.length >= 2 && (activeTab === 'posts' || activeTab === 'treks' || activeTab === 'locations') && (
          <>
            {results.posts?.length === 0 ? (
              <div className="text-center py-20">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">No posts found</h3>
                <p className="text-sm text-muted-foreground">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.posts.map((p: any) => (
                  <div key={p.id} className="p-4 rounded-xl bg-white border cursor-pointer hover:shadow-sm"
                    onClick={() => navigate(`/community/post/${p.id}`)}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-brand-emerald/20 flex items-center justify-center text-[8px] font-bold">
                        {p.author?.display_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium">{p.author?.display_name || 'User'}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{p.post_type}</span>
                    </div>
                    {p.caption && <p className="text-sm line-clamp-2">{p.caption}</p>}
                    {p.trek_location && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.trek_location}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
