import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, MapPin, Star, Clock, Navigation, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { getNearestTreks, type NearbySuggestion, type UserCoords } from '@/lib/smartSuggestions';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useStore } from '@/store/useStore';
import type { Trek } from '@/data/globalTreks';

export const NearbyTreks = () => {
  const navigate = useNavigate();
  const { coords, requestLocation, loading } = useGeolocation();
  const showToast = useStore(s => s.showToast);

  const [nearby, setNearby] = useState<NearbySuggestion[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [maxDistance, setMaxDistance] = useState(0);
  const [sortMode, setSortMode] = useState<'distance' | 'rating' | 'price'>('distance');

  useEffect(() => {
    if (coords) {
      setNearby(getNearestTreks(coords, 100));
      setLocationError(null);
    }
  }, [coords]);

  const maxDist = nearby?.length ? Math.max(...nearby.map(n => n.distanceKm)) : 0;

  const handleFindNearby = async () => {
    setLocating(true);
    setLocationError(null);
    const c: UserCoords | null = await requestLocation();
    setLocating(false);
    if (!c) {
      setNearby(null);
      setLocationError('Could not access your location. Enable location access to see treks near you.');
    }
  };

  const filtered = useMemo(() => {
    if (!nearby) return [];
    let list = nearby;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(n =>
        n.trek.title.toLowerCase().includes(q) ||
        n.trek.location.toLowerCase().includes(q) ||
        (n.trek.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (maxDistance > 0) {
      list = list.filter(n => n.distanceKm <= maxDistance);
    }
    const sorted = [...list];
    switch (sortMode) {
      case 'distance': sorted.sort((a, b) => a.distanceKm - b.distanceKm); break;
      case 'rating': sorted.sort((a, b) => (b.trek.rating || 0) - (a.trek.rating || 0)); break;
      case 'price': sorted.sort((a, b) => (a.trek.price || 0) - (b.trek.price || 0)); break;
    }
    return sorted;
  }, [nearby, search, maxDistance, sortMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative pt-20 md:pt-24 bg-gradient-to-b from-brand-dark to-gray-50 text-white pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-emerald/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-emerald/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sm mb-4">
              <LocateFixed className="w-4 h-4 text-brand-emerald" /> AI Location Engine
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="text-4xl md:text-6xl font-bold font-heading mb-3">Treks Near You</motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-white/70 md:text-lg">
              {coords
                ? `Ranked by real distance from your current location.`
                : 'Share your location and the AI ranks every trail by how far it is from you.'}
            </motion.p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24 -mt-6 relative z-10">
        {/* Location Card */}
        <div className="p-5 md:p-6 rounded-2xl bg-white border border-black/5 shadow-sm mb-8">
          {!coords ? (
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div>
                <h2 className="font-bold text-lg mb-1">Enable location to find nearby treks</h2>
                <p className="text-sm text-muted-foreground">We'll use your current position to sort all trails from closest to farthest.</p>
              </div>
              <button
                onClick={handleFindNearby}
                disabled={locating || loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-emerald text-white font-semibold hover:bg-brand-emerald/90 transition-all disabled:opacity-60 shrink-0"
              >
                {locating || loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                {locating || loading ? 'Locating...' : 'Use my location'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-emerald/15 text-brand-emerald">
                  <LocateFixed className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold leading-tight">Location enabled</h2>
                  <p className="text-sm text-muted-foreground">{nearby ? `${nearby.length} trails ranked by distance` : 'Computing distances...'}</p>
                </div>
              </div>
              <button
                onClick={handleFindNearby}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 text-sm font-semibold hover:bg-black/5 transition-all shrink-0"
              >
                <LocateFixed className="w-4 h-4 text-brand-emerald" /> Refresh location
              </button>
            </div>
          )}
          {locationError && (
            <p className="mt-3 text-xs text-red-500 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-2.5">{locationError}</p>
          )}
        </div>

        {coords && nearby && nearby.length > 0 && (
          <>
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 rounded-2xl bg-white border border-black/5 shadow-sm">
              <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-black/5 rounded-xl">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by name, location or tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none w-full placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                  className="bg-white border border-black/10 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:border-brand-emerald cursor-pointer"
                >
                  <option value="distance">Closest first</option>
                  <option value="rating">Best rated</option>
                  <option value="price">Lowest price</option>
                </select>
                <div className="flex items-center gap-2 px-3 py-2.5 border border-black/10 rounded-xl text-sm">
                  <span className="text-muted-foreground text-xs whitespace-nowrap">Max</span>
                  <input
                    type="range" min="0" max={Math.ceil(maxDist / 500) * 500} step="100"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-28 accent-brand-emerald"
                  />
                  <span className="text-xs font-semibold whitespace-nowrap">{maxDistance ? `${maxDistance}km` : 'Any'}</span>
                </div>
              </div>
            </div>

            {/* Distance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Nearest trek', value: nearby[0]?.distanceLabel ?? '—' },
                { label: 'Trails near you', value: String(nearby.length) },
                { label: 'Within 500km', value: String(nearby.filter(n => n.distanceKm <= 500).length) },
                { label: 'Farthest option', value: nearby[nearby.length - 1]?.distanceLabel ?? '—' },
              ].map(stat => (
                <div key={stat.label} className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-black">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Results */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-black/5">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No treks match</h3>
                <p className="text-sm text-muted-foreground">Try widening the distance or clearing the search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((n, i) => (
                  <NearbyCard key={n.trek.id} n={n} rank={i + 1} onClick={() => navigate(`/treks/${n.trek.id}`)} />
                ))}
              </div>
            )}
          </>
        )}

        {coords && !nearby && !locating && (
          <div className="py-16 text-center bg-white rounded-2xl border border-black/5">
            <Loader2 className="w-8 h-8 text-brand-emerald animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Computing real distances...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NearbyCard = ({ n, rank, onClick }: { n: NearbySuggestion; rank: number; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(rank * 0.03, 0.3) }}
    onClick={onClick}
    className="group cursor-pointer rounded-2xl overflow-hidden bg-white border border-black/5 hover:border-brand-emerald/30 hover:shadow-lg transition-all duration-300"
  >
    <div className="relative h-44 overflow-hidden">
      <img src={n.trek.image} alt={n.trek.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 text-black/80 backdrop-blur-sm shadow-sm">{n.trek.difficulty}</span>
      </div>
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-emerald text-white text-xs font-bold shadow-lg">
        <LocateFixed className="w-3.5 h-3.5" /> {n.distanceLabel}
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/85 backdrop-blur-sm text-xs font-semibold shadow-sm">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {n.trek.rating}
      </div>
      {rank === 1 && (
        <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-yellow-400 text-black text-[10px] font-bold shadow-lg">CLOSEST</span>
      )}
    </div>
    <div className="p-4">
      <div className="flex items-center gap-1.5 text-brand-emerald text-[11px] font-medium uppercase tracking-wider mb-1">
        <MapPin className="w-3 h-3" /> {n.trek.location}
      </div>
      <h3 className="text-base font-bold mb-2 line-clamp-1 group-hover:text-brand-emerald transition-colors">{n.trek.title}</h3>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{n.trek.duration}</span>
        <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5" />{n.trek.distance}</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-black/5">
        <p className="text-sm font-bold">{n.trek.price ? `$${n.trek.price}` : 'Free'}</p>
        <span className="text-xs font-semibold text-brand-emerald">{n.reason}</span>
      </div>
    </div>
  </motion.div>
);

export const _unusedTrekType = (t: Trek) => t;