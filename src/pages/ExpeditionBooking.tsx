import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, MapPin, Loader2, Check, X, AlertCircle, ChevronRight, DollarSign, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { resolveTrek } from '@/lib/trekRepository';
import { fetchDepartures, createBooking } from '@/lib/expeditions';
import { ensureJourneyForBooking } from '@/lib/journeys';
import type { UnifiedTrek } from '@/lib/trek-types';
import type { Departure } from '@/lib/expeditions';

type Step = 'departure' | 'participants' | 'details' | 'readiness' | 'review' | 'success';

const STEPS: { key: Step; label: string }[] = [
  { key: 'departure', label: 'Departure' },
  { key: 'participants', label: 'Participants' },
  { key: 'details', label: 'Details' },
  { key: 'readiness', label: 'Readiness' },
  { key: 'review', label: 'Review' },
];

interface ParticipantForm {
  full_name: string;
  age: string;
  nationality: string;
  emergency_contact: string;
  experience_level: string;
}

interface ReadinessCheck {
  difficulty: boolean;
  fitness: boolean;
  gear: boolean;
  altitude: boolean;
  safety: boolean;
  policy: boolean;
}

export const ExpeditionBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useStore(s => s.showToast);
  const { user, requireAuth } = useAuth();

  const trek = id ? resolveTrek(id) : null;
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('departure');
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [participants, setParticipants] = useState<ParticipantForm[]>([]);
  const [readiness, setReadiness] = useState<ReadinessCheck>({
    difficulty: false, fitness: false, gear: false, altitude: false, safety: false, policy: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{ reference: string; id: string } | null>(null);

  useEffect(() => {
    if (!requireAuth()) { navigate(`/treks/${id}`); return; }
    if (!trek) { setLoading(false); return; }
    if (trek.bookingType !== 'expedition' || !trek.isBookable) {
      showToast('This trek is not bookable as an expedition');
      navigate(`/treks/${id}`);
      return;
    }
    fetchDepartures(trek.id).then(deps => {
      setDepartures(deps);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load departures');
      setLoading(false);
    });
  }, [trek, id, navigate, requireAuth, showToast]);

  useEffect(() => {
    setParticipants(Array.from({ length: participantCount }, (_, i) => participants[i] || {
      full_name: '', age: '', nationality: '', emergency_contact: '', experience_level: '',
    }));
  }, [participantCount]);

  const updateParticipant = (index: number, field: keyof ParticipantForm, value: string) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const canProceedFromDetails = () => {
    return participants.every(p => p.full_name.trim().length > 0);
  };

  const readinessComplete = () => Object.values(readiness).every(Boolean);

  const handleConfirm = async () => {
    if (!selectedDeparture || !trek) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createBooking({
        trekId: trek.id,
        trekName: trek.title,
        trekLocation: trek.location,
        departureId: selectedDeparture.id,
        participantCount,
        pricePerPerson: selectedDeparture.price,
        participants: participants.map(p => ({
          full_name: p.full_name.trim(),
          age: p.age ? parseInt(p.age) : null,
          nationality: p.nationality.trim() || null,
          emergency_contact: p.emergency_contact.trim() || null,
          experience_level: p.experience_level || null,
        })),
      });
      setBookingResult({ reference: result.booking_reference, id: result.id });
      // Auto-create journey from confirmed booking
      ensureJourneyForBooking({
        id: result.id,
        trek_id: trek.id,
        trek_name: trek.title,
        trek_location: trek.location,
        departure_date: result.departure_date,
        return_date: result.return_date,
      });
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    }
    setSubmitting(false);
  };

  if (!user) return null;

  if (!trek || loading) {
    return (
      <div className="min-h-screen pt-20 md:pt-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxSeats = selectedDeparture?.available_seats || 0;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-24">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <PageHeader backTo={`/treks/${id}`}>
            <h1 className="text-xl md:text-2xl font-bold font-heading truncate">{trek.title}</h1>
          </PageHeader>
          <p className="text-sm text-muted-foreground flex items-center gap-1 -mt-3"><MapPin className="w-3 h-3" />{trek.location}</p>
        </div>

        {step !== 'success' && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {STEPS.map((s, i) => {
              const active = step === s.key;
              const done = STEPS.findIndex(x => x.key === step) > i;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    active ? 'bg-brand-emerald text-white' : done ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-black/5 text-muted-foreground'
                  }`}>
                    {done ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'departure' && (
            <motion.div key="departure" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-xl font-bold mb-6">Choose Departure</h2>
              {departures.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No upcoming departures are currently available for this expedition.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {departures.map(dep => {
                    const soldOut = dep.available_seats === 0;
                    const selected = selectedDeparture?.id === dep.id;
                    return (
                      <div key={dep.id} onClick={() => !soldOut && setSelectedDeparture(dep)}
                        className={`p-5 rounded-2xl border bg-white cursor-pointer transition-all ${
                          soldOut ? 'opacity-50 cursor-not-allowed border-gray-200' :
                          selected ? 'border-brand-emerald ring-2 ring-brand-emerald/20' : 'border-black/5 hover:border-brand-emerald/30 hover:shadow-sm'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-brand-emerald" />
                            <div>
                              <p className="font-semibold">{new Date(dep.departure_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                              <p className="text-xs text-muted-foreground">{new Date(dep.return_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">${dep.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {dep.available_seats} seats remaining</span>
                          {soldOut ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Sold Out</span>
                          ) : selected ? (
                            <span className="px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald rounded-full font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Selected</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedDeparture && (
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setStep('participants')} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-semibold text-sm flex items-center gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'participants' && (
            <motion.div key="participants" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-xl font-bold mb-2">Select Participants</h2>
              <p className="text-sm text-muted-foreground mb-6">How many people are joining?</p>
              <div className="bg-white rounded-2xl border border-black/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Adults</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
                      className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 disabled:opacity-30" disabled={participantCount <= 1}>-</button>
                    <span className="text-xl font-bold w-8 text-center">{participantCount}</span>
                    <button onClick={() => setParticipantCount(Math.min(maxSeats, participantCount + 1))}
                      className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 disabled:opacity-30" disabled={participantCount >= maxSeats}>+</button>
                  </div>
                </div>
                {selectedDeparture && (
                  <div className="border-t border-black/5 pt-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price per person</span>
                      <span className="font-medium">${selectedDeparture.price}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${selectedDeparture.price * participantCount}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep('departure')} className="px-6 py-2.5 border border-black/10 rounded-xl text-sm font-medium">Back</button>
                <button onClick={() => setStep('details')} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-semibold text-sm flex items-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-xl font-bold mb-2">Trekkers Details</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter details for each participant.</p>
              <div className="space-y-6">
                {Array.from({ length: participantCount }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/5 p-5">
                    <h3 className="font-semibold text-sm mb-4">Participant {i + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Full name *</label>
                        <input type="text" value={participants[i]?.full_name || ''} onChange={e => updateParticipant(i, 'full_name', e.target.value)}
                          placeholder="e.g. John Doe" className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Age</label>
                        <input type="number" value={participants[i]?.age || ''} onChange={e => updateParticipant(i, 'age', e.target.value)}
                          placeholder="e.g. 28" className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nationality</label>
                        <input type="text" value={participants[i]?.nationality || ''} onChange={e => updateParticipant(i, 'nationality', e.target.value)}
                          placeholder="e.g. USA" className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Emergency contact</label>
                        <input type="text" value={participants[i]?.emergency_contact || ''} onChange={e => updateParticipant(i, 'emergency_contact', e.target.value)}
                          placeholder="e.g. +1 555-0123" className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Trekking experience</label>
                        <select value={participants[i]?.experience_level || ''} onChange={e => updateParticipant(i, 'experience_level', e.target.value)}
                          className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none appearance-none cursor-pointer">
                          <option value="">Select experience level</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep('participants')} className="px-6 py-2.5 border border-black/10 rounded-xl text-sm font-medium">Back</button>
                <button onClick={() => setStep('readiness')} disabled={!canProceedFromDetails()}
                  className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'readiness' && (
            <motion.div key="readiness" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-xl font-bold mb-2">Expedition Readiness</h2>
              <p className="text-sm text-muted-foreground mb-6">Please confirm you have reviewed the following.</p>
              <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-1">
                {(trek ? [
                  {
                    key: 'difficulty' as const, label: 'Difficulty understood',
                    desc: 'I understand the difficulty level of this expedition.',
                    details: [
                      `Difficulty: ${trek.difficulty}`,
                      `Duration: ${trek.duration}`,
                      `Distance: ${trek.distance || 'N/A'}`,
                      `Elevation: ${trek.elevation || 'N/A'}`,
                      `Terrain: ${trek.terrain || 'Varied mountain terrain with steep ascents and descents'}`,
                      `This expedition is rated as ${trek.difficulty.toLowerCase()}. You should have prior experience with similar terrain and be prepared for long days of hiking with significant elevation gain.`,
                    ],
                  },
                  {
                    key: 'fitness' as const, label: 'Required fitness reviewed',
                    desc: 'I have reviewed the fitness requirements.',
                    details: [
                      'Cardiovascular endurance: Ability to hike 6-10 hours daily',
                      'Strength: Comfortable carrying a 10-15kg backpack',
                      'Previous trekking experience recommended',
                      'Recommended preparation: Start training 8-12 weeks before departure',
                      'Training suggestions: Regular cardio (running, cycling), leg strength exercises, and practice hikes with a loaded pack',
                    ],
                  },
                  {
                    key: 'gear' as const, label: 'Gear checklist reviewed',
                    desc: 'I have reviewed the recommended gear list.',
                    details: [
                      'Layered clothing system (base, mid, outer layers)',
                      'Waterproof hiking boots (broken in before the trip)',
                      'Sleeping bag rated for cold temperatures',
                      'Backpack (40-60L recommended)',
                      'Water bottles/bladder (minimum 3L capacity)',
                      'Headlamp with extra batteries',
                      'First aid kit with personal medications',
                      'Sunscreen, sunglasses, and sun hat',
                      'A detailed gear list will be provided after booking',
                    ],
                  },
                  {
                    key: 'altitude' as const, label: 'Altitude information reviewed',
                    desc: 'I understand the altitude profile and risks.',
                    details: [
                      trek.elevation ? `Maximum elevation: ${trek.elevation}` : 'High altitude trek (significant elevation gain)',
                      'Proper acclimatization is built into the itinerary',
                      'Symptoms of altitude sickness include headache, nausea, dizziness, and shortness of breath',
                      'Stay hydrated and avoid alcohol during the trek',
                      'Inform your guide immediately if you experience any symptoms',
                      'Our itineraries include acclimatization days to help your body adjust',
                    ],
                  },
                  {
                    key: 'safety' as const, label: 'Safety information reviewed',
                    desc: 'I have reviewed the safety protocols.',
                    details: [
                      'Professional guides with wilderness first aid certification',
                      'Emergency communication devices (satellite phone/radio)',
                      'Group size limits to ensure guide-to-trekker ratio',
                      'Weather monitoring and route adjustments as needed',
                      'Emergency evacuation plan in place',
                      'Travel insurance with evacuation coverage is mandatory',
                      'All participants must complete a medical questionnaire before departure',
                    ],
                  },
                  {
                    key: 'policy' as const, label: 'Cancellation policy accepted',
                    desc: 'I accept the cancellation policy.',
                    details: [
                      'Free cancellation up to 30 days before departure',
                      '50% refund for cancellations between 15-30 days',
                      'No refund for cancellations within 14 days of departure',
                      'Transfer to another departure date may be possible (subject to availability)',
                      'Trip cancellation insurance is strongly recommended',
                      'Treksin reserves the right to cancel or modify itineraries due to weather, political instability, or other force majeure events',
                    ],
                  },
                ] : []).map(({ key, label, desc, details }) => (
                  <div key={key} className="border-b border-black/5 last:border-b-0">
                    <button type="button" onClick={() => setExpandedKey(expandedKey === key ? null : key)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-black/5 transition-colors text-left">
                      <input type="checkbox" checked={readiness[key]} onChange={(e) => { e.stopPropagation(); setReadiness(prev => ({ ...prev, [key]: !prev[key] })); }}
                        className="mt-0.5 w-4 h-4 rounded border-black/20 text-brand-emerald focus:ring-brand-emerald flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{label}</p>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${expandedKey === key ? 'rotate-180' : ''}`} />
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedKey === key && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="overflow-hidden">
                          <div className="px-3 pb-4 pt-1 space-y-1.5">
                            {details.map((line, i) => (
                              <p key={i} className={`text-xs ${i === details.length - 1 ? 'text-brand-emerald font-medium mt-2 pt-2 border-t border-black/5' : 'text-muted-foreground'}`}>
                                {line.startsWith('- ') ? line : `• ${line}`}
                              </p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep('details')} className="px-6 py-2.5 border border-black/10 rounded-xl text-sm font-medium">Back</button>
                <button onClick={() => setStep('review')} disabled={!readinessComplete()}
                  className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-xl font-bold mb-6">Review Your Reservation</h2>
              <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-4 mb-6">
                <div className="flex justify-between pb-4 border-b border-black/5">
                  <span className="text-muted-foreground text-sm">Expedition</span>
                  <span className="font-medium">{trek.title}</span>
                </div>
                <div className="flex justify-between pb-4 border-b border-black/5">
                  <span className="text-muted-foreground text-sm">Location</span>
                  <span className="font-medium">{trek.location}</span>
                </div>
                {selectedDeparture && (
                  <>
                    <div className="flex justify-between pb-4 border-b border-black/5">
                      <span className="text-muted-foreground text-sm">Departure</span>
                      <span className="font-medium">{new Date(selectedDeparture.departure_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between pb-4 border-b border-black/5">
                      <span className="text-muted-foreground text-sm">Return</span>
                      <span className="font-medium">{new Date(selectedDeparture.return_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pb-4 border-b border-black/5">
                  <span className="text-muted-foreground text-sm">Participants</span>
                  <span className="font-medium">{participantCount} {participantCount === 1 ? 'person' : 'people'}</span>
                </div>
                <div className="space-y-1 pb-4 border-b border-black/5">
                  <p className="text-sm text-muted-foreground mb-2">Participant names:</p>
                  {participants.map((p, i) => (
                    <p key={i} className="text-sm font-medium">{i + 1}. {p.full_name || `Participant ${i + 1}`}</p>
                  ))}
                </div>
                {selectedDeparture && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price per person</span>
                      <span>${selectedDeparture.price}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total estimated price</span>
                      <span>${selectedDeparture.price * participantCount}</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep('readiness')} className="px-6 py-2.5 border border-black/10 rounded-xl text-sm font-medium">Back</button>
                <button onClick={handleConfirm} disabled={submitting}
                  className="px-8 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</> : 'Confirm Reservation'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && bookingResult && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-brand-emerald/10 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-brand-emerald" />
              </div>
              <h2 className="text-3xl font-bold font-heading mb-2">Expedition Reserved</h2>
              <div className="bg-white rounded-2xl border border-black/5 p-6 max-w-sm mx-auto mb-6">
                <p className="text-xs text-muted-foreground mb-1">Booking Reference</p>
                <p className="text-xl font-mono font-bold text-brand-emerald">{bookingResult.reference}</p>
                <div className="mt-3 pt-3 border-t border-black/5">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand-emerald/10 text-brand-emerald rounded-full text-xs font-medium">
                    <Check className="w-3 h-3" /> Confirmed
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => navigate('/my-expeditions')} className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-semibold text-sm">
                  View My Expeditions
                </button>
                <button onClick={() => navigate(`/my-expeditions/${bookingResult.id}`)} className="px-6 py-2.5 border border-black/10 rounded-xl font-semibold text-sm">
                  View Expedition
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
