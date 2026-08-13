import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCalendar, IconCalendarEvent, IconPlus, IconX, IconMapPin,
  IconUsers, IconClock, IconCheck, IconList, IconLayoutGrid,
  IconMountain, IconTent, IconRun, IconSocial, IconBriefcase,
  IconTrash,
} from '@tabler/icons-react';
import { fetchGroupEvents, createGroupEvent, rsvpEvent } from '@/lib/groups';
import type { GroupEvent, GroupEventAttendee } from '@/lib/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';

interface GroupEventsProps {
  groupId: string;
}

const EVENT_TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  trek: { icon: IconMountain, color: 'text-green-600 bg-green-100' },
  meetup: { icon: IconSocial, color: 'text-blue-600 bg-blue-100' },
  training: { icon: IconRun, color: 'text-purple-600 bg-purple-100' },
  social: { icon: IconCalendarEvent, color: 'text-pink-600 bg-pink-100' },
  expedition: { icon: IconTent, color: 'text-amber-600 bg-amber-100' },
  camping: { icon: IconTent, color: 'text-emerald-600 bg-emerald-100' },
  other: { icon: IconBriefcase, color: 'text-gray-600 bg-gray-100' },
};

export function GroupEvents({ groupId }: GroupEventsProps) {
  const { user } = useAuth();
  const showToast = useStore(s => s.showToast);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [rsvps, setRsvps] = useState<Record<string, GroupEventAttendee['status']>>({});

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<GroupEvent['event_type']>('meetup');
  const [formLocation, setFormLocation] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formMaxAttendees, setFormMaxAttendees] = useState(0);

  useEffect(() => { loadEvents(); }, [groupId]);

  const loadEvents = async () => {
    setLoading(true);
    const data = await fetchGroupEvents(groupId);
    setEvents(data);
    setLoading(false);
  };

  const handleCreateEvent = async () => {
    if (!formTitle.trim() || !formStart) return;
    const event = await createGroupEvent({
      group_id: groupId,
      title: formTitle.trim(),
      description: formDesc.trim() || undefined,
      event_type: formType,
      location: formLocation.trim() || undefined,
      start_time: formStart,
      end_time: formEnd || undefined,
      all_day: formAllDay,
      max_attendees: formMaxAttendees > 0 ? formMaxAttendees : undefined,
    });
    if (event) {
      setEvents(prev => [event, ...prev]);
      showToast('Event created');
      setShowCreate(false);
      resetForm();
    }
  };

  const handleRsvp = async (eventId: string, status: GroupEventAttendee['status']) => {
    await rsvpEvent(eventId, status);
    setRsvps(prev => ({ ...prev, [eventId]: status }));
    showToast(status === 'accepted' ? 'Joined event' : status === 'declined' ? 'Declined' : 'Marked as maybe');
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormType('meetup');
    setFormLocation('');
    setFormStart('');
    setFormEnd('');
    setFormAllDay(false);
    setFormMaxAttendees(0);
  };

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_time) > now);
  const pastEvents = events.filter(e => new Date(e.start_time) <= now);

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 scrollbar-thin">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Events</h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-white border border-black/10 rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-brand-emerald text-white' : 'text-gray-500 hover:bg-black/5'}`}>
                <IconList className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('calendar')}
                className={`p-2 ${viewMode === 'calendar' ? 'bg-brand-emerald text-white' : 'text-gray-500 hover:bg-black/5'}`}>
                <IconLayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
              <IconPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Event</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'list' ? (
          <>
            {/* Upcoming */}
            {upcomingEvents.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h3>
                <AnimatePresence mode="popLayout">
                  {upcomingEvents.map(event => (
                    <EventCard key={event.id} event={event} rsvpStatus={rsvps[event.id]} onRsvp={handleRsvp} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Past */}
            {pastEvents.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 mt-6">Past Events</h3>
                <AnimatePresence mode="popLayout">
                  {pastEvents.map(event => (
                    <EventCard key={event.id} event={event} rsvpStatus={rsvps[event.id]} onRsvp={handleRsvp} past />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {events.length === 0 && (
              <div className="text-center py-20">
                <IconCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No events yet</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 px-4 py-2 bg-brand-emerald text-white text-sm font-semibold rounded-xl">
                  Create first event
                </button>
              </div>
            )}
          </>
        ) : (
          /* Calendar view placeholder */
          <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
            <IconCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Calendar view coming soon</p>
            <p className="text-xs text-gray-400 mt-1">{events.length} events scheduled</p>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => { setShowCreate(false); resetForm(); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 pb-3 border-b border-black/5">
                <h3 className="text-lg font-bold">Create Event</h3>
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-1.5 rounded-full hover:bg-black/5">
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Title *</label>
                  <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="Event title..."
                    className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                  <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    placeholder="Event description..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                      <button key={key} onClick={() => setFormType(key as GroupEvent['event_type'])}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          formType === key ? 'border-brand-emerald bg-brand-emerald/10 text-brand-emerald' : 'border-black/10 text-gray-600 hover:bg-black/5'
                        }`}>
                        <config.icon className="w-3.5 h-3.5" />
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Location</label>
                  <div className="relative">
                    <IconMapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)}
                      placeholder="Location..."
                      className="w-full pl-9 pr-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Start *</label>
                    <input type="datetime-local" value={formStart} onChange={e => setFormStart(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">End</label>
                    <input type="datetime-local" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formAllDay} onChange={e => setFormAllDay(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-emerald focus:ring-brand-emerald" />
                    <span className="text-sm">All day</span>
                  </label>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <IconUsers className="w-4 h-4 text-gray-400" />
                    <input type="number" value={formMaxAttendees || ''} onChange={e => setFormMaxAttendees(parseInt(e.target.value) || 0)}
                      placeholder="Max" min={0}
                      className="w-20 px-3 py-1.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={handleCreateEvent} disabled={!formTitle.trim() || !formStart}
                  className="flex-1 px-4 py-2.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  Create Event
                </button>
                <button onClick={() => { setShowCreate(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 bg-black/5 text-sm font-semibold rounded-xl hover:bg-black/10">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventCard({ event, rsvpStatus, onRsvp, past }: {
  event: GroupEvent;
  rsvpStatus?: string;
  onRsvp: (id: string, status: GroupEventAttendee['status']) => void;
  past?: boolean;
}) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
  const IconComponent = config.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl border border-black/5 p-4 mb-3 ${past ? 'opacity-60' : ''}`}>
      <div className="flex gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold truncate">{event.title}</h4>
          {event.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <IconClock className="w-3 h-3" />
              {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {!event.all_day && ` · ${new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <IconMapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {event.max_attendees && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <IconUsers className="w-3 h-3" />
                {event.max_attendees} max
              </span>
            )}
          </div>
        </div>
      </div>
      {!past && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
          <button onClick={() => onRsvp(event.id, 'accepted')}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              rsvpStatus === 'accepted' ? 'bg-brand-emerald text-white border-brand-emerald' : 'border-black/10 hover:bg-brand-emerald/5 hover:border-brand-emerald'
            }`}>
            Accept
          </button>
          <button onClick={() => onRsvp(event.id, 'maybe')}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              rsvpStatus === 'maybe' ? 'bg-amber-500 text-white border-amber-500' : 'border-black/10 hover:bg-amber-50 hover:border-amber-300'
            }`}>
            Maybe
          </button>
          <button onClick={() => onRsvp(event.id, 'declined')}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              rsvpStatus === 'declined' ? 'bg-red-500 text-white border-red-500' : 'border-black/10 hover:bg-red-50 hover:border-red-300'
            }`}>
            Decline
          </button>
        </div>
      )}
    </motion.div>
  );
}
