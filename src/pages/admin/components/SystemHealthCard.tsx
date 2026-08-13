import type { InfrastructureMetrics } from '@/features/analytics/types';
import { EmptyState } from './shared/EmptyState';

function ProgressBar({ value, max = 100, color = 'bg-brand-emerald', label, sub }: { value: number; max?: number; color?: string; label: string; sub?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-800 font-medium">{sub || `${value}`}</span>
      </div>
      <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Props {
  infrastructure: InfrastructureMetrics | null;
  isLoading: boolean;
}

export function SystemHealthCard({ infrastructure, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
        <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
        {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-6 w-full bg-gray-50 rounded mb-3" />)}
      </div>
    );
  }

  if (!infrastructure) return <EmptyState message="No infrastructure metrics" />;

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">System Health</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Infrastructure metrics</p>
        </div>
      </div>
      <div className="space-y-3">
        <ProgressBar value={100 - Math.min(infrastructure.db_response_time_ms / 2, 30)} max={100} label="Database Response" sub={`${infrastructure.db_response_time_ms}ms`} color="bg-brand-emerald" />
        <ProgressBar value={Math.min(infrastructure.storage_usage_mb, 500)} max={500} label="Storage Usage" sub={`${infrastructure.storage_usage_mb.toFixed(0)} MB`} color="bg-blue-500" />
        <ProgressBar value={infrastructure.edge_function_executions} max={Math.max(infrastructure.edge_function_executions, 100)} label="Edge Function Executions" sub={`${infrastructure.edge_function_executions}`} color="bg-purple-500" />
        <ProgressBar value={infrastructure.cron_success_percentage} max={100} label="Cron Success" sub={`${infrastructure.cron_success_percentage.toFixed(1)}%`} color="bg-brand-emerald" />
        <ProgressBar value={Math.max(10 - infrastructure.automation_queue_size, 0) * 10} max={100} label="Automation Queue" sub={`${infrastructure.automation_queue_size} queued`} color={infrastructure.automation_queue_size > 5 ? 'bg-amber-500' : 'bg-brand-emerald'} />
        <ProgressBar value={infrastructure.realtime_connections} max={Math.max(infrastructure.realtime_connections, 50)} label="Realtime Connections" sub={`${infrastructure.realtime_connections}`} color="bg-cyan-500" />
        <ProgressBar value={100 - Math.min(infrastructure.api_response_time_ms / 5, 20)} max={100} label="API Response" sub={`${infrastructure.api_response_time_ms}ms`} color="bg-brand-emerald" />
        <ProgressBar value={Math.max(10 - infrastructure.failed_jobs, 0) * 10} max={100} label="Failed Jobs" sub={`${infrastructure.failed_jobs}`} color={infrastructure.failed_jobs > 0 ? 'bg-red-500' : 'bg-brand-emerald'} />
        <ProgressBar value={Math.max(20 - infrastructure.notification_queue_size, 0) * 5} max={100} label="Notification Queue" sub={`${infrastructure.notification_queue_size}`} color={infrastructure.notification_queue_size > 10 ? 'bg-amber-500' : 'bg-brand-emerald'} />
      </div>
    </div>
  );
}
