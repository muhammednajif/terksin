import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { MapPin, Clock, Navigation, Star, TrendingUp, Mountain, Users, Share2, Heart, Check, Shirt, Camera, Cloud, Calendar, Shield, Map, Sparkles, Compass, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { resolveTrek } from '@/lib/trekRepository';
import { fetchWeather, fetchLocationName } from '@/services/weather';
import { PlanTrekModal } from '@/components/journey/PlanTrekModal';

const getDifficultyColor = (d: string) => {
  switch (d) {
    case 'Easy': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
    case 'Moderate': return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
    case 'Hard': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
    case 'Extreme': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
};

export const TrekDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useStore(state => state.showToast);
  const { user, requireAuth } = useAuth();
  const trek = id ? resolveTrek(id) : null;
  const [saved, setSaved] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [weather, setWeather] = useState<{ temp: string; condition: string; locationName?: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    if (user && id) {
      supabase.from('saved_treks').select('id').eq('user_id', user.id).eq('trek_id', id).maybeSingle().then(({ data }) => {
        setSaved(!!data);
      });
    }
  }, [user, id]);

  useEffect(() => {
    if (trek?.lat && trek?.lng) {
      setWeatherLoading(true);
      Promise.all([
        fetchWeather(trek.lat, trek.lng),
        fetchLocationName(trek.lat, trek.lng),
      ]).then(([w, name]) => {
        if (w) setWeather({ temp: `${w.temperature}°C`, condition: w.condition, locationName: name || undefined });
        setWeatherLoading(false);
      });
    }
  }, [trek?.lat, trek?.lng]);

  const handleSave = async () => {
    if (!requireAuth()) return;
    try {
      if (saved) {
        await supabase.from('saved_treks').delete().eq('user_id', user!.id).eq('trek_id', id!);
        setSaved(false);
        showToast('Trek removed from saved');
      } else {
        await supabase.from('saved_treks').insert({ user_id: user!.id, trek_id: id! });
        setSaved(true);
        showToast('Trek saved to favorites');
      }
    } catch { showToast('Failed to save. Try again.'); }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch { showToast('Share this link: ' + url); }
  };

  const handlePlanTrek = () => {
    const params = new URLSearchParams();
    if (trek) {
      params.set('trek', trek.id);
      params.set('title', trek.title);
      params.set('location', trek.location);
    }
    navigate(`/ai-planner?${params.toString()}`);
  };

  const handleBook = () => {
    if (!requireAuth() || !id) return;
    navigate(`/treks/${id}/book`);
  };

  if (!trek) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <Mountain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Trek not found</h2>
          <p className="text-sm text-muted-foreground mb-4">This trek could not be resolved.</p>
          <PageHeader backTo="/explore" title="Trek not found" />
        </div>
      </div>
    );
  }

  const dc = getDifficultyColor(trek.difficulty);
  const isDemo = trek.source === 'demo';

  const primaryAction = () => {
    if (trek.bookingType === 'expedition' && trek.isBookable) {
      return { label: 'Book Expedition', action: handleBook, icon: Map };
    }
    if (trek.bookingType === 'community') {
      return { label: 'Join Group Trek', action: () => showToast('Group trek feature coming soon'), icon: Users };
    }
    return { label: 'Plan This Trek', action: () => setShowPlanModal(true), icon: Sparkles };
  };

  const secondaryAction = trek.bookingType === 'self-guided'
    ? { label: 'Open Route', action: () => showToast(trek.lat && trek.lng ? 'Route view coming soon' : 'No route data available'), icon: Compass }
    : null;

  const action = primaryAction();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-20 md:pt-24 pb-2">
        <PageHeader backTo="/explore">
          <h1 className="text-xl md:text-2xl font-bold font-heading truncate">{trek.title}</h1>
        </PageHeader>
      </div>
      {isDemo && (
        <span className="block mx-6 mb-2 px-3 py-1.5 bg-yellow-500/90 text-white rounded-full text-xs font-bold w-fit">Demo Trek</span>
      )}
      <div className="relative h-[45vh] md:h-[55vh] mx-6 rounded-3xl overflow-hidden">
        <img src={trek.image} alt={trek.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`${dc.bg} ${dc.text} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>{trek.difficulty}</span>
              {trek.rating ? (
                <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  {trek.rating} {trek.reviewCount ? <span className="text-white/60">({trek.reviewCount})</span> : null}
                </span>
              ) : null}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-heading text-white mb-2">{trek.title}</h1>
            <div className="flex items-center gap-2 text-white/80 text-base">
              <MapPin className="w-4 h-4" /> {trek.location}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10 pb-24 items-start">
        <div className="lg:col-span-2 space-y-12">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: 'Duration', value: trek.duration },
              { icon: Navigation, label: 'Distance', value: trek.distance },
              { icon: TrendingUp, label: 'Elevation', value: trek.elevation },
              { icon: Mountain, label: 'Terrain', value: trek.tags[0] || null },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white rounded-2xl p-4 md:p-5 border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-brand-emerald" />
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="font-bold text-black text-sm">{value || '\u2014'}</p>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
            <h2 className="text-2xl font-bold font-heading mb-4">Overview</h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              {trek.description || `Experience the majesty of the ${trek.location} on this incredible ${trek.duration} expedition. Known for its breathtaking views and challenging terrain, this trail is perfect for adventurers looking to push their limits. The journey takes you through diverse landscapes, from lush valleys to snow-capped peaks.`}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              {trek.tags?.filter(t => t !== 'Demo Trek Data').map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-xl bg-black/5 text-xs font-medium text-muted-foreground border border-black/5">{tag}</span>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
            <h2 className="text-2xl font-bold font-heading mb-6">What to Expect</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Shirt, title: 'Gear', desc: 'Base layers, waterproof jacket, trekking poles, headlamp, and sturdy boots required.' },
                { icon: Camera, title: 'Photography', desc: 'Stunning panoramic views from sunrise to sunset. Don\'t forget extra batteries.' },
                { icon: Shield, title: 'Safety', desc: 'Experienced guides, first aid kits, satellite phones, and emergency protocols in place.' },
                { icon: Cloud, title: 'Best Season', desc: trek.bestSeason || 'Peak season runs from March to May and September to November for optimal conditions.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-4 rounded-2xl bg-black/5">
                  <div className="w-10 h-10 rounded-xl bg-brand-emerald/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-brand-emerald" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
            {trek.price ? (
              <div className="flex items-end justify-between mb-6 pb-6 border-b border-black/5">
                <div>
                  <p className="text-xs text-muted-foreground">Price from</p>
                  <p className="text-3xl font-bold">${trek.price}</p>
                  <p className="text-xs text-muted-foreground">per person</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-lg">
                  <Check className="w-3 h-3" /> Available
                </span>
              </div>
            ) : null}

            {trek.isBookable && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Next departure varies — <strong>select date during booking</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>Max group: <strong>12 people</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Map className="w-4 h-4 text-muted-foreground" />
                  <span>Route: <strong>{trek.duration}</strong></span>
                </div>
              </div>
            )}

            <button type="button" onClick={action.action}
              className="w-full py-3 bg-brand-emerald hover:bg-brand-emerald/90 text-white font-bold rounded-xl transition-all active:scale-[0.98] mb-3 flex items-center justify-center gap-2">
              <action.icon className="w-5 h-5" /> {action.label}
            </button>

            {secondaryAction && (
              <button type="button" onClick={secondaryAction.action}
                className="w-full py-3 bg-black/5 hover:bg-black/10 border border-black/10 text-black font-medium rounded-xl transition-all mb-3 flex items-center justify-center gap-2">
                <secondaryAction.icon className="w-5 h-5" /> {secondaryAction.label}
              </button>
            )}

            <div className="flex gap-2">
              <button onClick={handleSave}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors border ${saved ? 'bg-red-50 border-red-200 text-red-600' : 'bg-black/5 hover:bg-black/10 border-black/10'}`}>
                <Heart className={`w-4 h-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} /> {saved ? 'Saved' : 'Save'}
              </button>
              <button onClick={handleShare}
                className="flex-1 py-2.5 bg-black/5 hover:bg-black/10 border border-black/10 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>

          {trek.lat && trek.lng && (
            <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Cloud className="w-4 h-4" /> Weather
              </h3>
              {weatherLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : weather ? (
                <>
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground">{weather.locationName || 'Current conditions'}</p>
                    <div className="flex items-end gap-3">
                      <span className="text-3xl font-bold">{weather.temp}</span>
                      <span className="text-sm text-muted-foreground pb-1">{weather.condition}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Weather data unavailable</p>
              )}
            </div>
          )}
        </div>
      </div>

      <PlanTrekModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        trek={{ id: trek.id, title: trek.title, location: trek.location, image: trek.image, duration: trek.duration }}
        onCreated={() => showToast('Journey created! Check My Journeys for details.')}
      />
    </div>
  );
};
