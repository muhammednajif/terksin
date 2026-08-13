import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft, Calendar, MapPin, AlertTriangle, Loader2, Share2, Camera, MessageSquare, Clock } from 'lucide-react';
import { fetchJourneyById, fetchJourneyTasks, confirmJourneyCompletion, cancelJourney, updateJourney } from '@/lib/journeys';
import { JourneyTimeline } from '@/components/journey/JourneyTimeline';
import { GearChecklist } from '@/components/journey/GearChecklist';
import { ReadinessChecklist } from '@/components/journey/ReadinessChecklist';
import type { TrekJourney, JourneyTask } from '@/lib/journeys';

export const JourneyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<TrekJourney | null>(null);
  const [tasks, setTasks] = useState<JourneyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [j, t] = await Promise.all([
        fetchJourneyById(id),
        fetchJourneyTasks(id),
      ]);
      if (j) setJourney(j);
      setTasks(t);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleComplete = async () => {
    if (!journey) return;
    setCompleting(true);
    try {
      const result = await confirmJourneyCompletion(journey.id);
      setXpAwarded(result.xp_awarded);
      setJourney(prev => prev ? { ...prev, status: 'completed', completed_at: new Date().toISOString() } : null);
      setShowShare(true);
    } catch (e: any) {
      alert(e?.message || 'Failed to confirm completion');
    }
    setCompleting(false);
  };

  const handleCancelJourney = async () => {
    if (!journey || !confirm('Cancel this journey? This cannot be undone.')) return;
    try {
      await cancelJourney(journey.id);
      setJourney(prev => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostponeEndDate = async () => {
    if (!journey) return;
    const newEnd = prompt('New end date (YYYY-MM-DD):', journey.end_date);
    if (!newEnd) return;
    try {
      await updateJourney(journey.id, { end_date: newEnd, status: 'active' });
      setJourney(prev => prev ? { ...prev, end_date: newEnd, status: 'active' } : null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-black/30" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 md:pt-24">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center py-20">
          <AlertTriangle className="w-12 h-12 text-black/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Journey Not Found</h2>
          <p className="text-sm text-black/50 mb-6">This journey does not exist or has been removed.</p>
          <button onClick={() => navigate('/journeys')} className="px-6 py-3 bg-brand-emerald text-white rounded-xl font-semibold text-sm">
            Back to My Journeys
          </button>
        </div>
      </div>
    );
  }

  const startDate = new Date(journey.start_date);
  const endDate = new Date(journey.end_date);
  const today = new Date();
  const daysToStart = Math.ceil((startDate.getTime() - today.getTime()) / 86400000);
  const daysToEnd = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <PageHeader backTo="/journeys" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-black/10 overflow-hidden"
              >
              {journey.trek_image_url ? (
                <div className="h-40 md:h-52 bg-black/5">
                  <img src={journey.trek_image_url} alt={journey.trek_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-32 md:h-40 bg-gradient-to-br from-brand-emerald/20 to-brand-emerald/5 flex items-center justify-center">
                  <span className="text-2xl font-bold text-brand-emerald/30">{journey.trek_name.charAt(0)}</span>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold font-heading">{journey.trek_name}</h1>
                    {journey.trek_location && (
                      <p className="text-sm text-black/50 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {journey.trek_location}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex-shrink-0 ${
                    journey.status === 'planned' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                    journey.status === 'preparing' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' :
                    journey.status === 'active' ? 'bg-green-50 border-green-200 text-green-600' :
                    journey.status === 'awaiting_completion' ? 'bg-purple-50 border-purple-200 text-purple-600' :
                    journey.status === 'completed' ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' :
                    'bg-red-50 border-red-200 text-red-600'
                  }`}>
                    {journey.status === 'awaiting_completion' ? 'Ready for Review' :
                     journey.status.charAt(0).toUpperCase() + journey.status.slice(1).replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-black/60">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {' — '}
                    {endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  {journey.experience_level && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                      {journey.experience_level.charAt(0).toUpperCase() + journey.experience_level.slice(1)}
                    </span>
                  )}
                  <span className="text-xs text-black/30">
                    {journey.source === 'expedition_booking' ? 'From expedition booking' : 'Manual plan'}
                  </span>
                </div>

                {/* Countdown */}
                {(journey.status === 'planned' || journey.status === 'preparing') && daysToStart > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-brand-emerald/5 border border-brand-emerald/20">
                    <p className="text-sm font-semibold text-brand-emerald">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Starts in {daysToStart} day{daysToStart === 1 ? '' : 's'}
                    </p>
                  </div>
                )}

                {/* Awaiting Completion Actions */}
                {journey.status === 'awaiting_completion' && (
                  <div className="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <h3 className="font-semibold text-sm text-purple-800 mb-1">Did you complete this trek?</h3>
                    <p className="text-xs text-purple-600 mb-3">Let us know how it went to earn XP and track your progress.</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleComplete}
                        disabled={completing}
                        className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Yes, Completed
                      </button>
                      <button
                        onClick={handlePostponeEndDate}
                        className="px-5 py-2 border border-purple-300 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-50 transition-all"
                      >
                        Not Yet
                      </button>
                      <button
                        onClick={handleCancelJourney}
                        className="px-5 py-2 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-all"
                      >
                        Cancel Journey
                      </button>
                    </div>
                  </div>
                )}

                {/* XP Awarded */}
                {xpAwarded !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-center"
                  >
                    <p className="text-2xl font-bold text-brand-emerald">+{xpAwarded} XP</p>
                    <p className="text-xs text-brand-emerald/70 mt-0.5">Awarded for completing this journey</p>
                  </motion.div>
                )}

                {/* Share after completion */}
                {showShare && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-white border border-brand-emerald/20"
                  >
                    <p className="text-sm font-semibold mb-3">Share Your Journey</p>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-2 px-4 py-2 bg-brand-emerald text-white rounded-xl text-sm font-medium hover:bg-brand-emerald/90 transition-all">
                        <Camera className="w-4 h-4" />
                        Create Post
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 border border-black/10 rounded-xl text-sm font-medium hover:bg-black/5 transition-all">
                        <MessageSquare className="w-4 h-4" />
                        Add Photos
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 border border-black/10 rounded-xl text-sm font-medium hover:bg-black/5 transition-all">
                        <Share2 className="w-4 h-4" />
                        Share Story
                      </button>
                    </div>
                  </motion.div>
                )}

                {journey.emergency_contact && (
                  <div className="mt-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                    <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Emergency Contact Saved
                    </p>
                    <p className="text-xs text-yellow-600 mt-0.5">{journey.emergency_contact}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Gear Checklist */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-black/10 p-5"
            >
              <GearChecklist journeyId={journey.id} />
            </motion.div>

            {/* Readiness Checklist */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-black/10 p-5"
            >
              <ReadinessChecklist journeyId={journey.id} />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-black/10 p-5"
            >
              <h3 className="text-sm font-semibold mb-4">Adventure Timeline</h3>
              <JourneyTimeline
                status={journey.status}
                tasks={tasks}
                startDate={journey.start_date}
                endDate={journey.end_date}
              />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl border border-black/10 p-5"
            >
              <h3 className="text-sm font-semibold mb-3">Actions</h3>
              <div className="space-y-2">
                {(journey.status === 'planned' || journey.status === 'preparing') && (
                  <button
                    onClick={handleCancelJourney}
                    className="w-full px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-all"
                  >
                    Cancel Journey
                  </button>
                )}
                <button
                  onClick={() => navigate(`/treks/${journey.trek_id}`)}
                  className="w-full px-4 py-2.5 bg-black/5 text-black rounded-xl text-sm font-medium hover:bg-black/10 transition-all"
                >
                  View Trek Details
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
