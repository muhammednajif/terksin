import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, AlertTriangle, Mountain, Loader2, Check, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createJourney } from '@/lib/journeys';
import { supabase } from '@/lib/supabase';

interface PlanTrekModalProps {
  isOpen: boolean;
  onClose: () => void;
  trek: {
    id: string;
    title: string;
    location?: string | null;
    image?: string | null;
    duration?: string | number | null;
  };
  onCreated?: () => void;
}

type DemoState = 'idle' | 'running' | 'success' | 'error';

export function PlanTrekModal({ isOpen, onClose, trek, onCreated }: PlanTrekModalProps) {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdJourney, setCreatedJourney] = useState<any>(null);
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [demoError, setDemoError] = useState('');
  const [demoTaskType, setDemoTaskType] = useState('');

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setExperienceLevel('');
    setEmergencyContact('');
    setError('');
    setCreatedJourney(null);
    setDemoState('idle');
    setDemoError('');
    setDemoTaskType('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const journey = await createJourney({
        trek_id: trek.id,
        trek_name: trek.title,
        trek_location: trek.location || undefined,
        trek_image_url: trek.image || undefined,
        start_date: startDate,
        end_date: endDate,
        experience_level: experienceLevel || undefined,
        emergency_contact: emergencyContact || undefined,
        source: 'manual_plan',
      });
      setCreatedJourney(journey);
      onCreated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to create journey');
    }
    setLoading(false);
  };

  const handleRunDemo = async () => {
    if (!createdJourney) return;
    setDemoState('running');
    setDemoError('');

    try {
      const { data: taskData, error: rpcError } = await supabase.rpc('demo_make_task_due', {
        p_journey_id: createdJourney.id,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!taskData || !taskData.length) throw new Error('No task returned from RPC');

      const task = taskData[0];
      setDemoTaskType(task.task_type || '');

      const { error: fnError } = await supabase.functions.invoke('process-journey-tasks', { method: 'POST' });

      if (fnError) throw new Error(`Automation function failed: ${fnError.message}`);

      setDemoState('success');
    } catch (e: any) {
      setDemoState('error');
      setDemoError(e?.message || 'Failed to run automation demo');
    }
  };

  const parseDuration = (dur: string | number | null | undefined): number | null => {
    if (!dur) return null;
    if (typeof dur === 'number') return dur;
    const match = dur.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const durDays = parseDuration(trek.duration);
  const suggestedEnd = durDays && startDate
    ? new Date(new Date(startDate).getTime() + durDays * 86400000).toISOString().split('T')[0]
    : '';

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={createdJourney ? undefined : handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/10 overflow-hidden"
          >
            {!createdJourney ? (
              <>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-emerald/20 flex items-center justify-center">
                        <Mountain className="w-5 h-5 text-brand-emerald" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">Plan Your Trek</h2>
                        <p className="text-sm text-black/60">{trek.title}</p>
                      </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-black/60 mb-1.5">Start Date *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="date"
                            value={startDate}
                            onChange={e => {
                              setStartDate(e.target.value);
                              if (suggestedEnd) setEndDate(suggestedEnd);
                            }}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full pl-9 pr-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-black/60 mb-1.5">End Date *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            className="w-full pl-9 pr-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-black/60 mb-1.5">Experience Level</label>
                      <select
                        value={experienceLevel}
                        onChange={e => setExperienceLevel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30"
                      >
                        <option value="">Not specified</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-black/60 mb-1.5">Emergency Contact (optional)</label>
                      <input
                        type="text"
                        value={emergencyContact}
                        onChange={e => setEmergencyContact(e.target.value)}
                        placeholder="Name and phone number"
                        className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30"
                      />
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{error}</p>
                      </div>
                    )}

                    {durDays && !endDate && startDate && (
                      <p className="text-xs text-black/50">
                        Suggested end date based on duration: {suggestedEnd}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !startDate || !endDate}
                    className="w-full py-3 bg-brand-emerald text-white rounded-xl font-semibold text-sm hover:bg-brand-emerald/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? 'Creating Journey...' : 'Create My Journey'}
                  </button>
                  <p className="text-[10px] text-black/40 text-center mt-2">
                    Treksin will send you reminders and gear checklists for this journey.
                  </p>
                </div>
              </>
            ) : (
              <div className="p-6">
                <div className="w-16 h-16 rounded-full bg-brand-emerald/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-brand-emerald" />
                </div>
                <h2 className="text-xl font-bold text-center">Journey Created!</h2>
                <p className="text-sm text-black/60 text-center mt-1 mb-4">{trek.title}</p>

                <div className="bg-black/5 rounded-xl p-3 text-center mb-4">
                  <p className="text-xs text-black/60">{formatDate(startDate)} — {formatDate(endDate)}</p>
                  <p className="text-[10px] text-black/40 mt-1">Your Smart Journey Automation is ready.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { handleClose(); navigate(`/journeys/${createdJourney.id}`); }}
                    className="w-full py-2.5 bg-brand-emerald text-white rounded-xl font-semibold text-sm hover:bg-brand-emerald/90 transition-all flex items-center justify-center gap-2"
                  >
                    Open My Journey <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    {demoState === 'idle' && (
                      <button
                        onClick={handleRunDemo}
                        className="w-full py-2.5 border-2 border-yellow-400 text-yellow-700 rounded-xl font-semibold text-sm hover:bg-yellow-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" /> Run Automation Demo
                      </button>
                    )}
                    {demoState === 'running' && (
                      <button disabled
                        className="w-full py-2.5 border-2 border-yellow-400 text-yellow-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 opacity-70 cursor-not-allowed"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" /> Running Automation...
                      </button>
                    )}
                    {demoState === 'success' && (
                      <div className="space-y-2">
                        <div className="w-full py-2.5 bg-green-50 border-2 border-green-400 text-green-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" /> Automation Triggered!
                        </div>
                        <p className="text-xs text-green-600 text-center">A journey reminder was created.</p>
                        <button
                          onClick={() => { handleClose(); navigate('/notifications'); }}
                          className="w-full py-2.5 bg-black/5 text-black/80 rounded-xl font-medium text-sm hover:bg-black/10 transition-all flex items-center justify-center gap-2"
                        >
                          View Notification <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {demoState === 'error' && (
                      <div className="space-y-2">
                        <button
                          onClick={handleRunDemo}
                          className="w-full py-2.5 border-2 border-red-400 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4" /> Retry Automation Demo
                        </button>
                        <p className="text-xs text-red-500 text-center">{demoError}</p>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-yellow-600 text-center flex items-center justify-center gap-1 mt-1">
                    <Zap className="w-3 h-3" /> Demo Mode — not required for normal journey flow
                  </span>
                </div>

                <button onClick={handleClose} className="absolute top-3 right-3 p-2 hover:bg-black/5 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
