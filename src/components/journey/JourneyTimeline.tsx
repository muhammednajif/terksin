import { CheckCircle2, Circle, Clock, PlayCircle, AlertCircle } from 'lucide-react';
import type { JourneyTask, JourneyStatus } from '@/lib/journeys';

interface JourneyTimelineProps {
  status: JourneyStatus;
  tasks: JourneyTask[];
  startDate: string;
  endDate: string;
}

const STEPS = [
  { key: 'created', label: 'Journey Created', icon: CheckCircle2 },
  { key: 'preparation_7_days', label: '7 Days Before', desc: 'Preparation and gear check', icon: Clock },
  { key: 'conditions_3_days', label: '3 Days Before', desc: 'Conditions and missing gear', icon: Clock },
  { key: 'readiness_1_day', label: '1 Day Before', desc: 'Final readiness', icon: Clock },
  { key: 'trek_start', label: 'Trek Day', desc: 'Adventure begins', icon: PlayCircle },
  { key: 'during', label: 'During Trek', desc: 'Relevant safety awareness', icon: AlertCircle },
  { key: 'expected_completion', label: 'After Trek', desc: 'Confirm completion and share experience', icon: CheckCircle2 },
];

export function JourneyTimeline({ status, tasks, startDate, endDate }: JourneyTimelineProps) {
  const taskMap = new Map(tasks.map(t => [t.task_type, t]));

  const getStepState = (stepKey: string) => {
    if (stepKey === 'created') return 'completed';
    if (stepKey === 'during') {
      if (status === 'completed' || status === 'awaiting_completion') return 'completed';
      if (status === 'active') return 'current';
      return 'upcoming';
    }

    const task = taskMap.get(stepKey);
    if (!task) return 'upcoming';
    if (task.status === 'sent' || task.status === 'processing') return 'completed';
    if (task.status === 'cancelled') return 'cancelled';
    if (new Date(task.scheduled_for) <= new Date() && task.status === 'pending') return 'current';
    return 'upcoming';
  };

  const isTerminal = status === 'completed' || status === 'cancelled';

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-black/10" />

      <div className="space-y-0">
        {STEPS.map((step, idx) => {
          const state = getStepState(step.key);
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
              <div className="relative z-10 mt-0.5">
                {state === 'completed' ? (
                  <div className="w-8 h-8 rounded-full bg-brand-emerald/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                  </div>
                ) : state === 'current' ? (
                  <div className="w-8 h-8 rounded-full bg-brand-emerald/10 border-2 border-brand-emerald flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
                  </div>
                ) : state === 'cancelled' ? (
                  <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                    <Circle className="w-4 h-4 text-red-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center">
                    <Circle className="w-4 h-4 text-black/20" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <p className={`text-sm font-semibold ${
                  state === 'completed' ? 'text-brand-emerald' :
                  state === 'current' ? 'text-black' :
                  state === 'cancelled' ? 'text-red-500 line-through' :
                  'text-black/40'
                }`}>
                  {step.label}
                </p>
                {step.desc && (
                  <p className="text-xs text-black/40 mt-0.5">{step.desc}</p>
                )}
                {step.key === 'expected_completion' && status === 'awaiting_completion' && (
                  <span className="inline-block mt-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                    Waiting for your response
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isTerminal && (
        <div className="mt-4 p-3 rounded-xl bg-brand-emerald/5 border border-brand-emerald/20 text-center">
          <p className="text-sm font-semibold text-brand-emerald">
            {status === 'completed' ? 'Journey Completed!' : 'Journey Cancelled'}
          </p>
        </div>
      )}
    </div>
  );
}
