import { Link } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Mountain } from 'lucide-react';
import type { TrekJourney } from '@/lib/journeys';

interface JourneyCardProps {
  journey: TrekJourney;
  gearProgress?: { total: number; checked: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: 'Planned', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  preparing: { label: 'Preparing', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  active: { label: 'Active', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  awaiting_completion: { label: 'Done?', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  completed: { label: 'Completed', color: 'text-brand-emerald', bg: 'bg-brand-emerald/10 border-brand-emerald/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

export function JourneyCard({ journey, gearProgress }: JourneyCardProps) {
  const cfg = STATUS_CONFIG[journey.status] || STATUS_CONFIG.planned;
  const startDate = new Date(journey.start_date);
  const endDate = new Date(journey.end_date);
  const today = new Date();
  const daysToStart = Math.ceil((startDate.getTime() - today.getTime()) / 86400000);
  const gearPct = gearProgress && gearProgress.total > 0
    ? Math.round((gearProgress.checked / gearProgress.total) * 100)
    : 0;

  let countdownText = '';
  let countdownColor = 'text-black/60';
  if (journey.status === 'completed' || journey.status === 'cancelled') {
    countdownText = journey.status === 'completed' ? 'Completed' : 'Cancelled';
    countdownColor = 'text-black/40';
  } else if (journey.status === 'active') {
    countdownText = 'In Progress';
    countdownColor = 'text-brand-emerald';
  } else if (daysToStart > 0) {
    countdownText = `Starts in ${daysToStart} day${daysToStart === 1 ? '' : 's'}`;
  } else if (daysToStart === 0) {
    countdownText = 'Starts Today';
    countdownColor = 'text-brand-emerald';
  } else {
    countdownText = 'Overdue';
    countdownColor = 'text-red-500';
  }

  return (
    <Link
      to={`/journeys/${journey.id}`}
      className="block group"
    >
      <div className="relative bg-white rounded-2xl border border-black/10 overflow-hidden hover:shadow-lg hover:border-brand-emerald/30 transition-all">
        <div className="flex">
          {journey.trek_image_url ? (
            <div className="w-28 md:w-36 flex-shrink-0 bg-black/5">
              <img src={journey.trek_image_url} alt={journey.trek_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-28 md:w-36 flex-shrink-0 bg-gradient-to-br from-brand-emerald/20 to-brand-emerald/5 flex items-center justify-center">
              <Mountain className="w-8 h-8 text-brand-emerald/40" />
            </div>
          )}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h3 className="font-bold text-sm md:text-base truncate">{journey.trek_name}</h3>
                {journey.trek_location && (
                  <p className="text-xs text-black/50 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {journey.trek_location}
                  </p>
                )}
              </div>
              <span className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-black/60">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className={`font-medium ${countdownColor}`}>{countdownText}</span>
            </div>

            {(journey.status === 'planned' || journey.status === 'preparing') && gearProgress && gearProgress.total > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-emerald rounded-full transition-all"
                    style={{ width: `${gearPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-black/50 font-medium">{gearPct}%</span>
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10px] text-black/40">
                {journey.source === 'expedition_booking' ? 'From Booking' : journey.source === 'group_trek' ? 'Group Trek' : 'Manual Plan'}
              </span>
              <ChevronRight className="w-4 h-4 text-black/30 group-hover:text-brand-emerald transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
