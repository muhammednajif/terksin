import { useNavigate } from 'react-router-dom';
import { Flag, Shield, Users, Eye, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import type { ModerationSummary } from '@/features/analytics/types';
import { EmptyState } from './shared/EmptyState';

interface Props {
  moderation: ModerationSummary | null;
  isLoading: boolean;
}

export function ModerationSummaryCard({ moderation, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
        <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-6 w-full bg-gray-50 rounded mb-3" />)}
      </div>
    );
  }

  if (!moderation) return <EmptyState message="No moderation data" />;

  const items = [
    { label: 'Pending Reports', value: moderation.pending_reports, icon: Flag, color: moderation.pending_reports > 0 ? 'text-red-600' : 'text-brand-emerald' },
    { label: 'Pending Safety Reviews', value: moderation.pending_safety_reviews, icon: Shield, color: moderation.pending_safety_reviews > 0 ? 'text-orange-600' : 'text-brand-emerald' },
    { label: 'Reported Users', value: moderation.reported_users, icon: Users, color: moderation.reported_users > 0 ? 'text-amber-600' : 'text-brand-emerald' },
    { label: 'Hidden Posts', value: moderation.hidden_posts, icon: Eye, color: moderation.hidden_posts > 0 ? 'text-purple-600' : 'text-brand-emerald' },
    { label: 'Community Flags', value: moderation.community_flags, icon: AlertTriangle, color: moderation.community_flags > 0 ? 'text-orange-600' : 'text-brand-emerald' },
    { label: "Today's Actions", value: moderation.today_moderation_actions, icon: CheckCircle, color: 'text-brand-emerald' },
  ];

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Moderation Summary</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Community health</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-0">
            <div className="flex items-center gap-2">
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
              <span className="text-xs text-gray-600">{m.label}</span>
            </div>
            <span className={`text-xs font-bold ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>
      {moderation.pending_reports > 0 && (
        <button onClick={() => navigate('/admin/moderation')} className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-red-600 font-medium hover:underline">
          {moderation.pending_reports} Reports Require Attention <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
