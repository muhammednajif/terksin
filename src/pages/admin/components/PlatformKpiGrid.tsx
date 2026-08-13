import { Activity, Radio, UserPlus, Map, Calendar, MessageCircle, Eye, Heart, Share2, Bell, Zap, Sparkles, Thermometer, Shield, Flag, FileText, Gauge } from 'lucide-react';
import type { CommunityKpis } from '@/features/analytics/types';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { MiniSparkline } from './shared/MiniSparkline';
import { EmptyState } from './shared/EmptyState';

interface Props {
  kpis: CommunityKpis | null;
  trendMap?: Record<string, number[]>;
  isLoading: boolean;
}

const kpiDefs = [
  { icon: Activity, key: 'users_online' as const, label: 'Users Online', color: '#10b981' },
  { icon: Radio, key: 'active_sessions' as const, label: 'Active Sessions', color: '#3b82f6' },
  { icon: UserPlus, key: 'new_users_today' as const, label: 'New Users Today', color: '#8b5cf6' },
  { icon: Map, key: 'active_journeys' as const, label: 'Active Journeys', color: '#f59e0b' },
  { icon: Calendar, key: 'bookings_today' as const, label: 'Bookings Today', color: '#ec4899' },
  { icon: MessageCircle, key: 'posts_today' as const, label: 'Posts Today', color: '#10b981' },
  { icon: Eye, key: 'stories_today' as const, label: 'Stories Today', color: '#06b6d4' },
  { icon: MessageCircle, key: 'comments_today' as const, label: 'Comments', color: '#84cc16' },
  { icon: Heart, key: 'likes_today' as const, label: 'Likes', color: '#ef4444' },
  { icon: Share2, key: 'shares_today' as const, label: 'Shares', color: '#f59e0b' },
  { icon: Bell, key: 'notifications_sent_today' as const, label: 'Notifications Sent', color: '#8b5cf6' },
  { icon: Zap, key: 'journey_automations_today' as const, label: 'Automations', color: '#10b981' },
  { icon: Sparkles, key: 'ai_planner_requests_today' as const, label: 'AI Planner', color: '#3b82f6' },
  { icon: Sparkles, key: 'ai_companion_requests_today' as const, label: 'AI Companion', color: '#ec4899' },
  { icon: Thermometer, key: 'trail_alerts' as const, label: 'Trail Alerts', color: '#f59e0b' },
  { icon: Shield, key: 'safety_reports_pending' as const, label: 'Safety Pending', color: '#ef4444' },
  { icon: Flag, key: 'pending_moderation' as const, label: 'Pending Moderation', color: '#f59e0b' },
  { icon: FileText, key: 'announcements_published' as const, label: 'Announcements', color: '#06b6d4' },
];

export function PlatformKpiGrid({ kpis, trendMap, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-black/5 p-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-100 rounded-xl mx-auto mb-2" />
            <div className="h-6 w-16 bg-gray-100 rounded mx-auto mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (!kpis) return <EmptyState message="Unable to load platform KPIs" />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {kpiDefs.map((d) => {
        const val = kpis[d.key] ?? 0;
        const sparkKey = d.key === 'users_online' || d.key === 'active_sessions' || d.key === 'new_users_today' ? 'users'
          : d.key === 'posts_today' ? 'posts'
          : d.key === 'bookings_today' ? 'bookings'
          : d.key === 'notifications_sent_today' ? 'notifications'
          : d.key === 'active_journeys' ? 'journeys'
          : null;
        const sparkData = sparkKey ? trendMap?.[sparkKey] : undefined;

        return (
          <div key={d.key} className="bg-white rounded-xl border border-black/5 p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <d.icon className="w-4 h-4" style={{ color: d.color }} />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {val === 0 ? <span className="text-gray-300">—</span> : <AnimatedCounter value={val} />}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{d.label}</p>
            {sparkData && sparkData.length > 1 && (
              <div className="mt-1 flex justify-center"><MiniSparkline data={sparkData} color={d.color} /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
