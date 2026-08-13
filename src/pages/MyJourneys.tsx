import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Compass, Loader2, Plus } from 'lucide-react';
import { fetchMyJourneys, getGearProgress } from '@/lib/journeys';
import { JourneyCard } from '@/components/journey/JourneyCard';
import type { TrekJourney } from '@/lib/journeys';

export const MyJourneys = () => {
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<TrekJourney[]>([]);
  const [gearProgress, setGearProgress] = useState<Record<string, { total: number; checked: number }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('upcoming');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyJourneys();
      setJourneys(data);

      const progress: Record<string, { total: number; checked: number }> = {};
      await Promise.all(data.map(async (j) => {
        try {
          progress[j.id] = await getGearProgress(j.id);
        } catch { /* ignore */ }
      }));
      setGearProgress(progress);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const tabs = [
    { key: 'upcoming', label: 'Upcoming', statuses: ['planned', 'preparing'] },
    { key: 'active', label: 'Active', statuses: ['active', 'awaiting_completion'] },
    { key: 'completed', label: 'Completed', statuses: ['completed'] },
    { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
  ];

  const filtered = journeys.filter(j => {
    const tab = tabs.find(t => t.key === activeTab);
    return tab ? tab.statuses.includes(j.status) : true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading">My Journeys</h1>
            <p className="text-sm text-black/50 mt-1">Track your planned, active, and completed treks</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-semibold hover:bg-brand-emerald/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Plan a Trek
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-6 p-1 bg-white rounded-xl border border-black/10 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-brand-emerald text-white shadow-sm'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
            >
              {tab.label}
              {journeys.filter(j => tab.statuses.includes(j.status)).length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-black/10'
                }`}>
                  {journeys.filter(j => tab.statuses.includes(j.status)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-black/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-emerald/10 flex items-center justify-center mx-auto mb-4">
                <Compass className="w-8 h-8 text-brand-emerald" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {activeTab === 'upcoming' ? 'No upcoming journeys' :
                 activeTab === 'active' ? 'No active journeys' :
                 activeTab === 'completed' ? 'No completed journeys' :
                 'No cancelled journeys'}
              </h3>
              <p className="text-sm text-black/50 mb-6">
                {activeTab === 'upcoming' ? 'Plan a trek to get started on your next adventure.' :
                 'Journeys will appear here as you plan and complete treks.'}
              </p>
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => navigate('/explore')}
                  className="px-6 py-3 bg-brand-emerald text-white rounded-xl font-semibold text-sm hover:bg-brand-emerald/90 transition-all"
                >
                  Explore Treks
                </button>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((journey, i) => (
              <motion.div
                key={journey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <JourneyCard
                  journey={journey}
                  gearProgress={gearProgress[journey.id] || null}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
