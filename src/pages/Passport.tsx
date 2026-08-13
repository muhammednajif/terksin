import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft, Award, Mountain, Route, Globe, Footprints, TrendingUp, Trophy, Medal, Compass, BookOpen, Droplets, TreePine, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { fetchPassportStamps, fetchPassportStats, fetchUserAchievements, fetchAllAchievements, getLevel } from '@/lib/passport';
import type { PassportStamp, PassportStats, UserAchievement, AchievementDefinition } from '@/lib/passport';
import { TrekStamp } from '@/components/passport/TrekStamp';
import { AchievementCard } from '@/components/passport/AchievementCard';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type Tab = 'overview' | 'stamps' | 'achievements' | 'map';

export const Passport = () => {
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  const showToast = useStore(s => s.showToast);
  const [stamps, setStamps] = useState<PassportStamp[]>([]);
  const [stats, setStats] = useState<PassportStats | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [s, st, ua, aa] = await Promise.all([
          fetchPassportStats(user.id),
          fetchPassportStamps(user.id),
          fetchUserAchievements(user.id),
          fetchAllAchievements(),
        ]);
        setStats(s);
        setStamps(st);
        setUserAchievements(ua);
        setAllAchievements(aa);
      } catch { showToast('Failed to load passport data'); }
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Adventure Passport</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign in to view your trekking identity.</p>
          <button onClick={() => requireAuth()} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl text-sm font-medium">Sign In</button>
        </div>
      </div>
    );
  }

  const levelInfo = getLevel(stats?.total_xp || 0);

  const filteredStamps = filterType === 'all' ? stamps : stamps.filter(s => {
    const loc = (s.location || '').toLowerCase();
    const name = s.trek_name.toLowerCase();
    if (filterType === 'mountains') return name.includes('peak') || name.includes('mountain') || name.includes('everest') || name.includes('kilimanjaro') || name.includes('fuji') || name.includes('alps') || name.includes('patagonia');
    if (filterType === 'forests') return name.includes('forest') || name.includes('trail') || name.includes('camino');
    if (filterType === 'expeditions') return s.difficulty === 'advanced' || s.difficulty === 'Hard' || s.difficulty === 'Extreme';
    if (filterType === 'international') return loc && !loc.toLowerCase().includes('united states') && !loc.toLowerCase().includes('usa');
    return true;
  });

  const totalAchievements = allAchievements.length;
  const unlockedCount = userAchievements.length;
  const statsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const vals = statsRef.current?.querySelectorAll('.passport-stat-val');
    if (!vals?.length) return;
    vals.forEach(el => {
      const text = el.textContent || '';
      const num = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return;
      const suffix = text.replace(/[0-9.]/g, '');
      el.textContent = '0' + suffix;
      gsap.to(el, {
        duration: 1.5, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
        onUpdate: function () {
          const val = this.progress() * num;
          el.textContent = (Number.isInteger(num) ? Math.round(val) : val.toFixed(0)) + suffix;
        },
      });
    });
  }, [stats]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PageHeader title="Adventure Passport" subtitle="Your digital trekking identity" />

        {/* Level Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 mb-6 border border-white/10">
          <div className="absolute top-0 right-0 w-24 h-24 md:w-40 md:h-40 bg-gradient-to-br from-brand-emerald/20 to-transparent rounded-full blur-2xl md:blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Medal className="w-5 h-5 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium uppercase tracking-wider">Level {levelInfo.level}</span>
                </div>
                <h2 className="text-2xl font-bold text-white">{levelInfo.title}</h2>
                <p className="text-sm text-white/60 mt-1">
                  <span className="text-brand-emerald font-bold">{stats?.total_xp || 0}</span> Total XP
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{stats?.completed_treks || 0}</p>
                <p className="text-[10px] text-white/40">Treks Completed</p>
              </div>
            </div>
            {/* XP Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>Level {levelInfo.level}</span>
                <span>{levelInfo.progress.toFixed(0)}% to Level {levelInfo.level + 1}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-emerald to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${levelInfo.progress}%` }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Globe, label: 'Countries', value: stats?.countries || 0, color: 'text-blue-500' },
            { icon: Footprints, label: 'Distance', value: `${(stats?.lifetime_distance_km || 0).toFixed(0)}km`, color: 'text-emerald-500' },
            { icon: TrendingUp, label: 'Highest', value: `${(stats?.highest_altitude_m || 0).toFixed(0)}m`, color: 'text-orange-500' },
            { icon: Trophy, label: 'Streak', value: `${stats?.current_streak || 0} days`, color: 'text-purple-500' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-white border">
              <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
              <p className="passport-stat-val text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto scrollbar-none">
          {(['overview', 'stamps', 'achievements', 'map'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab === 'overview' && <Compass className="w-3.5 h-3.5" />}
              {tab === 'stamps' && <Award className="w-3.5 h-3.5" />}
              {tab === 'achievements' && <Trophy className="w-3.5 h-3.5" />}
              {tab === 'map' && <Globe className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{tab}</span>
              {tab === 'stamps' && stamps.length > 0 && <span className="text-[10px] opacity-60 ml-0.5">({stamps.length})</span>}
              {tab === 'achievements' && <span className="text-[10px] opacity-60 ml-0.5">({unlockedCount}/{totalAchievements})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-emerald/20 border-t-brand-emerald rounded-full animate-spin" />
          </div>
        ) : activeTab === 'overview' ? (
          <div className="space-y-4">
            {/* Stats detail */}
            <div className="bg-white rounded-2xl border border-black/5 p-4">
              <h3 className="text-sm font-semibold mb-3">Explorer Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Mountains', value: stats?.peaks || 0, icon: Mountain },
                  { label: 'Waterfalls', value: stats?.waterfalls || 0, icon: Droplets },
                  { label: 'Forests', value: stats?.forests || 0, icon: TreePine },
                  { label: 'Deserts', value: stats?.deserts || 0, icon: Sun },
                  { label: 'Longest Trek', value: stats?.longest_trek_km ? `${stats.longest_trek_km.toFixed(0)}km` : '0km', icon: Route },
                  { label: 'Lifetime Elevation', value: stats?.lifetime_elevation_m ? `${stats.lifetime_elevation_m.toFixed(0)}m` : '0m', icon: TrendingUp },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/5">
                    <div className="w-7 h-7 rounded-lg bg-brand-emerald/10 flex items-center justify-center">
                      <s.icon className="w-3.5 h-3.5 text-brand-emerald" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent stamps */}
            {stamps.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/5 p-4">
                <h3 className="text-sm font-semibold mb-3">Recent Adventures</h3>
                <div className="space-y-2">
                  {stamps.slice(0, 3).map((s, i) => <TrekStamp key={s.id} stamp={s} index={i} />)}
                </div>
              </div>
            )}

            {/* Recent achievements */}
            {userAchievements.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/5 p-4">
                <h3 className="text-sm font-semibold mb-3">Recent Achievements</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {userAchievements.slice(0, 4).map(ua => {
                    const ach = allAchievements.find(a => a.id === ua.achievement_id);
                    if (!ach) return null;
                    return <AchievementCard key={ua.id} achievement={ach} unlocked={ua} />;
                  })}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'stamps' ? (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['all', 'mountains', 'forests', 'expeditions', 'international'].map(f => (
                <button key={f} onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    filterType === f ? 'bg-brand-emerald text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            {filteredStamps.length === 0 ? (
              <div className="text-center py-16">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No trek stamps yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Complete a journey to earn your first stamp.</p>
                <button onClick={() => navigate('/journeys')} className="px-4 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium">Go to My Journeys</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredStamps.map((s, i) => <TrekStamp key={s.id} stamp={s} index={i} />)}
              </div>
            )}
          </div>
        ) : activeTab === 'achievements' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">{unlockedCount} of {totalAchievements} achievements unlocked</p>
              <div className="w-32 h-1.5 bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all" style={{ width: totalAchievements > 0 ? `${(unlockedCount / totalAchievements) * 100}%` : '0%' }} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allAchievements.map((ach, i) => {
                const ua = userAchievements.find(u => u.achievement_id === ach.id);
                return <AchievementCard key={ach.id} achievement={ach} unlocked={ua || null} index={i} />;
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 p-4">
            <h3 className="text-sm font-semibold mb-3">Adventure Map</h3>
            {stamps.length === 0 ? (
              <div className="text-center py-16">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Complete treks to see your adventure map.</p>
              </div>
            ) : (
              <div className="relative w-full aspect-[2/1] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full"
                      style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() * 0.5 + 0.3 }} />
                  ))}
                </div>
                {stamps.map((s, i) => {
                  const pos = stampPositions[s.trek_id] || { x: 20 + (i * 7) % 60, y: 20 + (i * 13) % 60 };
                  return (
                    <div key={s.id} className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                      <div className="w-4 h-4 rounded-full bg-brand-emerald border-2 border-white shadow-lg flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[8px] text-white/60 whitespace-nowrap font-medium drop-shadow-lg">
                        {s.trek_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const stampPositions: Record<string, { x: number; y: number }> = {
  'everest-base-camp': { x: 75, y: 22 },
  'annapurna-circuit': { x: 74, y: 25 },
  'mount-fuji-yoshida': { x: 82, y: 20 },
  'inca-trail': { x: 32, y: 68 },
  'patagonia-o-circuit': { x: 28, y: 75 },
  'tour-du-mont-blanc': { x: 54, y: 24 },
  'camino-frances': { x: 52, y: 21 },
  'kilimanjaro-machame': { x: 58, y: 58 },
  'john-muir-trail': { x: 18, y: 28 },
  'west-coast-trail': { x: 16, y: 30 },
  'milford-track': { x: 88, y: 72 },
};
