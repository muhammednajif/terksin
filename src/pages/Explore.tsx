import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TREKS } from '@/data/mockData';
import { GLOBAL_TREKS } from '@/data/globalTreks';
import type { Trek } from '@/data/globalTreks';
import { Map as MapIcon, Grid, List, Search, Star, MapPin, Clock, Navigation, Globe2, SlidersHorizontal, ArrowUpDown, X, Radar } from 'lucide-react';
import { getRecommendationsFor } from '@/lib/smartSuggestions';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { MapView } from '@/components/map/MapView';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const CATEGORY_FILTERS: Record<string, string[]> = {
  mountain: ['High Altitude', 'Alpine', 'Mountain', 'Everest', 'Kilimanjaro', 'Fuji'],
  waterfall: ['Scenic', 'Waterfall'],
  forest: ['Jungle', 'Forest', 'Nature', 'Woodland'],
  camping: ['Wilderness', 'Multi-Day', 'Camping', 'Scenic'],
  'hidden-gems': ['Cultural', 'Historical', 'Hidden', 'Secret', 'Offbeat', 'Coastal'],
};

export const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'price-low' | 'price-high' | 'duration' | 'name'>('rating');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [categoryParam, setCategoryParam] = useState<string | null>(searchParams.get('category'));
  const { searchQuery, setSearchQuery, filters, setFilters, selectedCategory, setSelectedCategory, selectedContinent, setSelectedContinent, selectedCountry, setSelectedCountry, isFetchingTrails, osmTreks, fetchLiveTrails, showToast } = useStore();

  useEffect(() => {
    const cat = searchParams.get('category');
    setCategoryParam(cat);
  }, [searchParams]);

  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localDifficulties, setLocalDifficulties] = useState<string[]>(filters.difficulties);
  const [localPrice, setLocalPrice] = useState(filters.maxPrice);
  const [localContinent, setLocalContinent] = useState(selectedContinent);
  const [localCountry, setLocalCountry] = useState(selectedCountry);
  const resultsRef = useRef<HTMLDivElement>(null);

  const availableContinents = Object.keys(GLOBAL_TREKS);
  const availableCountries = localContinent ? Object.keys(GLOBAL_TREKS[localContinent]) : [];

  const handleApplyFilters = () => {
    setSearchQuery(localSearch);
    setFilters({ difficulties: localDifficulties, maxPrice: localPrice });
    setSelectedContinent(localContinent);
    setSelectedCountry(localCountry);
    setShowMobileFilters(false);
    if (localCountry && localContinent) {
      showToast(`Loading demo trails for ${localCountry}...`);
      fetchLiveTrails(localCountry, localContinent);
    } else {
      showToast('Filters applied');
    }
  };

  const handleDifficultyToggle = (level: string) => {
    setLocalDifficulties(prev => prev.includes(level) ? prev.filter(d => d !== level) : [...prev, level]);
  };

  const filteredTreks = useMemo(() => {
    const localFiltered = TREKS.filter(trek => {
      if (searchQuery && !trek.title.toLowerCase().includes(searchQuery.toLowerCase()) && !trek.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedContinent && trek.continent !== selectedContinent) return false;
      if (selectedCountry && trek.country !== selectedCountry) return false;
      if (selectedCategory && !trek.tags.includes(selectedCategory)) return false;
      if (categoryParam) {
        const keywords = CATEGORY_FILTERS[categoryParam] || [];
        const matchesCategory = trek.tags.some(tag =>
          keywords.some(kw => tag.toLowerCase().includes(kw.toLowerCase()))
        ) || keywords.some(kw =>
          trek.title.toLowerCase().includes(kw.toLowerCase()) ||
          trek.location.toLowerCase().includes(kw.toLowerCase())
        );
        if (!matchesCategory) return false;
      }
      return true;
    });
    const combined = [...localFiltered, ...osmTreks].filter(trek => {
      if (filters.difficulties.length > 0 && !filters.difficulties.includes(trek.difficulty)) return false;
      if (trek.price > filters.maxPrice) return false;
      if (trek.price === 0 && trek.source !== 'canonical') return true;
      return true;
    });
    return combined.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'price-low': return (a.price || 0) - (b.price || 0);
        case 'price-high': return (b.price || 0) - (a.price || 0);
        case 'name': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });
  }, [searchQuery, selectedContinent, selectedCountry, selectedCategory, categoryParam, filters, osmTreks, sortBy]);

  useGSAP(() => {
    const cards = resultsRef.current?.querySelectorAll('.explore-card');
    if (!cards?.length) return;
    gsap.set(cards, { opacity: 0, y: 20 });
    const tl = gsap.to(cards, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out',
      scrollTrigger: { trigger: resultsRef.current, start: 'top 85%', toggleActions: 'play none none none' },
    });
    return () => { tl.kill(); };
  }, [filteredTreks.length, view]);

  const clearCategory = () => setSelectedCategory(null);

  const filterContent = (
    <div className="space-y-6">
      <div className="pb-6 border-b border-black/5">
        <h4 className="text-sm font-medium text-black/80 mb-3 flex items-center gap-2"><Globe2 className="w-4 h-4" /> Location</h4>
        <div className="space-y-3">
          <select value={localContinent || ''} onChange={(e) => { setLocalContinent(e.target.value || null); setLocalCountry(null); }}
            className="w-full bg-black/5 border border-black/10 rounded-xl text-sm text-black p-2.5 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20 appearance-none cursor-pointer">
            <option value="" className="bg-white">All Continents</option>
            {availableContinents.map(c => <option key={c} value={c} className="bg-white">{c}</option>)}
          </select>
          <select disabled={!localContinent} value={localCountry || ''} onChange={(e) => setLocalCountry(e.target.value || null)}
            className="w-full bg-black/5 border border-black/10 rounded-xl text-sm text-black p-2.5 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20 appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <option value="" className="bg-white">All Countries</option>
            {availableCountries.map(c => <option key={c} value={c} className="bg-white">{c}</option>)}
          </select>
        </div>
      </div>
      <div className="pb-6 border-b border-black/5">
        <h4 className="text-sm font-medium text-black/80 mb-3">Difficulty</h4>
        <div className="space-y-2">
          {['Easy', 'Moderate', 'Hard', 'Extreme'].map(level => (
            <label key={level} className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-black/5 transition-colors">
              <input type="checkbox" checked={localDifficulties.includes(level)} onChange={() => handleDifficultyToggle(level)}
                className="w-4 h-4 rounded border-black/20 text-brand-emerald focus:ring-brand-emerald focus:ring-offset-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-black/70 group-hover:text-black transition-colors">{level}</span>
                {level === 'Easy' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Beginner</span>}
                {level === 'Moderate' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Intermediate</span>}
                {level === 'Hard' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Advanced</span>}
                {level === 'Extreme' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Expert</span>}
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="pb-6 border-b border-black/5">
        <h4 className="text-sm font-medium text-black/80 mb-3">Max Budget (${localPrice})</h4>
        <input type="range" min="0" max="5000" step="50" value={localPrice} onChange={(e) => setLocalPrice(Number(e.target.value))} className="w-full accent-brand-emerald" />
        <div className="flex justify-between mt-1.5 text-[11px] text-black/50"><span>$0</span><span>$5,000+</span></div>
      </div>
      <button onClick={handleApplyFilters} className="w-full py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98]">
        Apply Filters
      </button>
    </div>
  );

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold font-heading mb-2">Explore Treks</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-muted-foreground text-sm">{filteredTreks.length} trails available</p>
                <Link to="/explore/pulse" className="px-3 py-1 bg-black/5 hover:bg-black/10 text-xs rounded-full flex items-center gap-1.5 transition-colors">
                  <Radar className="w-3 h-3" /> TrekPulse
                </Link>
                {selectedCategory && (
                  <span className="px-3 py-1 bg-brand-emerald/10 text-brand-emerald text-xs rounded-full border border-brand-emerald/20 flex items-center gap-1.5">
                    {selectedCategory} <button onClick={clearCategory} className="hover:text-brand-emerald/80">&times;</button>
                  </span>
                )}
                {categoryParam && !selectedCategory && (
                  <span className="px-3 py-1 bg-brand-emerald/10 text-brand-emerald text-xs rounded-full border border-brand-emerald/20 flex items-center gap-1.5 capitalize">
                    {categoryParam.replace(/-/g, ' ')} <button onClick={() => { setSearchParams({}, { replace: true }); setCategoryParam(null); }} className="hover:text-brand-emerald/80">&times;</button>
                  </span>
                )}
                {selectedContinent && (
                  <span className="px-3 py-1 bg-black/5 text-black/80 text-xs rounded-full border border-black/10 flex items-center gap-1.5">
                    <Globe2 className="w-3 h-3" /> {selectedContinent}{selectedCountry ? ` › ${selectedCountry}` : ''}
                    <button onClick={() => { setSelectedContinent(null); setSelectedCountry(null); setLocalContinent(null); setLocalCountry(null); }} className="hover:text-black">&times;</button>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex-1 md:w-72 flex items-center gap-3 px-4 py-2.5 bg-white border border-black/10 rounded-xl shadow-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Search trails by name or location..." aria-label="Search trails"
                  value={localSearch} onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                  className="bg-transparent border-none text-sm focus:outline-none w-full placeholder:text-muted-foreground/60" />
              </div>
              <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="lg:hidden p-2.5 border border-black/10 bg-white rounded-xl hover:bg-black/5 transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Mobile Filters */}
        {showMobileFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="lg:hidden mb-6 p-5 rounded-2xl bg-white border shadow-sm">
            {filterContent}
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28 p-5 rounded-2xl bg-white border shadow-sm">
              <h3 className="font-semibold text-sm mb-5 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filters</h3>
              {filterContent}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-xl bg-white border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-black/5 rounded-lg p-0.5">
                  <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white shadow-sm text-black' : 'text-muted-foreground hover:text-black'}`}><Grid className="w-4 h-4" /></button>
                  <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white shadow-sm text-black' : 'text-muted-foreground hover:text-black'}`}><List className="w-4 h-4" /></button>
                </div>
                <span className="text-sm text-muted-foreground hidden sm:block"><span className="font-semibold text-black">{filteredTreks.length}</span> results</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 rounded-lg text-sm">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-transparent border-none text-sm focus:outline-none cursor-pointer">
                    <option value="rating">Best Rated</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name">Name</option>
                  </select>
                </div>
                <button onClick={() => setShowMap(!showMap)} className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${showMap ? 'bg-brand-emerald text-white border-brand-emerald' : 'border-black/10 hover:bg-black/5'}`}>
                  {showMap ? <X className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />} {showMap ? 'List' : 'Map'}
                </button>
              </div>
            </div>

            {/* Unlock Banner */}
            {!selectedCountry && !isFetchingTrails && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-5 bg-gradient-to-r from-yellow-500/5 to-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-yellow-500/15 rounded-full text-yellow-600 flex-shrink-0">
                  <Globe2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Discover More Trails</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Select a continent & country in filters, then click "Apply Filters" to load demo trek data for browsing.</p>
                </div>
              </motion.div>
            )}

            {/* Loading */}
            {isFetchingTrails && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-3 border-brand-emerald border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-semibold mb-1">Loading Demo Trails...</h3>
                <p className="text-sm text-muted-foreground">Generating demo trail data for {localCountry}</p>
              </div>
            )}

            {/* Smart Recommendations */}
            {!isFetchingTrails && !searchQuery && !selectedContinent && !selectedCountry && filteredTreks.length > 0 && (
              <RecommendedRow
                onSelect={(trek) => navigate(`/treks/${trek.id}`)}
              />
            )}

            {/* Results */}
            {!isFetchingTrails && (
              <>
                {showMap ? (
                  <MapView treks={filteredTreks} onSelectTrek={(trek) => navigate(`/treks/${trek.id}`)} />
                ) : filteredTreks.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">No treks found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
                  </div>
                ) : view === 'grid' ? (
                  <div ref={resultsRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredTreks.map((trek) => (
                      <TrekCard key={trek.id} trek={trek} onClick={() => navigate(`/treks/${trek.id}`)} />
                    ))}
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4">
                    {filteredTreks.map((trek) => (
                      <TrekListItem key={trek.id} trek={trek} onClick={() => navigate(`/treks/${trek.id}`)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TrekCard = ({ trek, onClick }: { trek: Trek; onClick: () => void }) => (
  <div onClick={onClick}
    className="explore-card group cursor-pointer rounded-2xl overflow-hidden bg-white border border-black/5 hover:border-brand-emerald/20 hover:shadow-lg transition-all duration-300">
    <div className="relative h-52 overflow-hidden">
      <img src={trek.image} alt={trek.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 text-black/80 backdrop-blur-sm shadow-sm">{trek.difficulty}</span>
        {trek.source === 'demo' && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 bg-yellow-500/90 text-white backdrop-blur-sm"><Globe2 className="w-3 h-3" /> Demo</span>
        )}
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 backdrop-blur-sm text-xs font-semibold shadow-sm">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {trek.rating || 'N/A'}
      </div>
    </div>
    <div className="p-5">
      <div className="flex items-center gap-1.5 text-brand-emerald text-[11px] font-medium uppercase tracking-wider mb-1">
        <MapPin className="w-3 h-3" /> {trek.location}
      </div>
      <h3 className="text-lg font-bold mb-2 line-clamp-1 group-hover:text-brand-emerald transition-colors">{trek.title}</h3>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{trek.duration}</span>
        <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5" />{trek.distance}</span>
        {trek.elevation && <span className="flex items-center gap-1"><MountainIcon />{trek.elevation}</span>}
      </div>
      {trek.tags && trek.tags.filter((t: string) => t !== 'Demo Trek Data').length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {trek.tags.filter((t: string) => t !== 'Demo Trek Data').slice(0, 3).map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 rounded-md bg-black/5 text-[10px] text-muted-foreground">{tag}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-4 border-t border-black/5">
        <div>
          <span className="text-[10px] text-muted-foreground">{trek.price ? 'From' : ''}</span>
          <p className="text-lg font-bold">{trek.price ? `$${trek.price}` : trek.source === 'demo' ? 'Free' : '—'}</p>
        </div>
        <Link to={`/treks/${trek.id}`} onClick={(e) => e.stopPropagation()} className="px-4 py-2 rounded-xl bg-brand-emerald/10 text-brand-emerald text-sm font-semibold hover:bg-brand-emerald hover:text-white transition-all">View Details</Link>
      </div>
    </div>
  </div>
);

const TrekListItem = ({ trek, onClick }: { trek: Trek; onClick: () => void }) => (
  <div onClick={onClick}
    className="explore-card group cursor-pointer rounded-2xl overflow-hidden bg-white border border-black/5 hover:border-brand-emerald/20 hover:shadow-sm transition-all duration-300 flex">
    <div className="w-48 h-44 flex-shrink-0 overflow-hidden">
      <img src={trek.image} alt={trek.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    </div>
    <div className="flex-1 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-brand-emerald text-[11px] font-medium uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" />{trek.location}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5">{trek.difficulty}</span>
        </div>
        <h3 className="text-lg font-bold mb-1">{trek.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{trek.tags?.filter((t: string) => t !== 'Demo Trek Data').join(' · ') || (trek.source === 'demo' ? 'Demo Trek Data' : 'Trek route')}</p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{trek.duration}</span>
          <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5" />{trek.distance}</span>
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{trek.rating || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">{trek.price ? `$${trek.price}` : 'Free'}</span>
          <Link to={`/treks/${trek.id}`} onClick={(e) => e.stopPropagation()} className="px-4 py-1.5 rounded-xl bg-brand-emerald/10 text-brand-emerald text-sm font-semibold hover:bg-brand-emerald hover:text-white transition-all">View</Link>
        </div>
      </div>
    </div>
  </div>
);

const MountainIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3 2 21h20L12 3Z" />
  </svg>
);

const RecommendedRow = ({ onSelect }: { onSelect: (trek: Trek) => void }) => {
  const recs = getRecommendationsFor();
  if (!recs.length) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-emerald/15 rounded-xl text-brand-emerald">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Recommended for You</h2>
            <p className="text-xs text-muted-foreground">Smart picks based on ratings, reviews & activity</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {recs.map(r => (
          <div key={r.trek.id} onClick={() => onSelect(r.trek)}
            className="group cursor-pointer rounded-2xl overflow-hidden bg-white border border-black/5 hover:border-brand-emerald/30 hover:shadow-lg transition-all duration-300">
            <div className="relative h-28 overflow-hidden">
              <img src={r.trek.image} alt={r.trek.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[10px] font-bold shadow-sm">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /> {r.trek.rating}
              </span>
            </div>
            <div className="p-2.5">
              <h3 className="text-xs font-bold truncate">{r.trek.title}</h3>
              <p className="text-[10px] text-brand-emerald truncate mt-0.5">{r.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};