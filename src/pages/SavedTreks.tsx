import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star, Navigation, Loader2, Heart, Trash2, ArrowLeft, Bookmark } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { fetchSavedTreks, unsaveTrek } from '@/services/savedTreks';
import type { UnifiedTrek } from '@/lib/trek-types';
import { PageHeader } from '@/components/ui/PageHeader';

export const SavedTreks = () => {
  const navigate = useNavigate();
  const { user, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const [saved, setSaved] = useState<{ id: string; trek_id: string; trek: UnifiedTrek | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireAuth()) return;
    loadSaved();
  }, [user]);

  const loadSaved = async () => {
    setLoading(true);
    try {
      const data = await fetchSavedTreks();
      setSaved(data);
    } catch { showToast('Failed to load saved treks'); }
    setLoading(false);
  };

  const handleUnsave = async (trekId: string) => {
    try {
      await unsaveTrek(trekId);
      setSaved(prev => prev.filter(s => s.trek_id !== trekId));
      showToast('Trek removed from saved');
    } catch { showToast('Failed to unsave'); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-24">
      <div className="max-w-3xl mx-auto px-4">
        <PageHeader title="Saved Treks" subtitle="Your bookmarked adventures" />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : saved.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No saved treks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Save treks you like to find them later.</p>
            <button onClick={() => navigate('/explore')} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-semibold">Explore Treks</button>
          </div>
        ) : (
          <div className="space-y-4">
            {saved.map(item => {
              const t = item.trek;
              if (!t) return (
                <div key={item.id} className="bg-white rounded-2xl border border-black/5 p-5 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Trek &ldquo;{item.trek_id}&rdquo; no longer available</p>
                  <button onClick={() => handleUnsave(item.trek_id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
              return (
                <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/treks/${t.id}`)}
                  className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-sm transition-all cursor-pointer group flex">
                  <div className="w-32 md:w-40 h-32 flex-shrink-0 overflow-hidden">
                    <img src={t.image} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-brand-emerald text-[11px] font-medium uppercase tracking-wider mb-0.5">
                        <MapPin className="w-3 h-3" /> {t.location}
                      </div>
                      <h3 className="font-bold mb-1 line-clamp-1">{t.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration}</span>
                        <span className="flex items-center gap-1"><Navigation className="w-3 h-3" />{t.distance}</span>
                        {t.rating ? <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{t.rating}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Saved to favorites</span>
                      <button onClick={(e) => { e.stopPropagation(); handleUnsave(t.id); }}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                        <Heart className="w-4 h-4 fill-red-400 text-red-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
