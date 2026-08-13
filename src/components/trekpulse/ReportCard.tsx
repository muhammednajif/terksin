import { AlertTriangle, Info, ShieldAlert, Bug, TreePine, Route, Activity } from 'lucide-react';
import type { TrekPulseReport } from '@/lib/trekpulse';
import { getSeverityColor } from '@/lib/trekpulse';

interface ReportCardProps {
  report: TrekPulseReport;
  onClick?: () => void;
}

const typeIcons: Record<string, any> = {
  trail_condition: Route,
  weather: Activity,
  safety: ShieldAlert,
  crowding: Users,
  wildlife: Bug,
  route_change: Route,
  other: Info,
};

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ReportCard({ report, onClick }: ReportCardProps) {
  const Icon = typeIcons[report.report_type] || Info;

  return (
    <div onClick={onClick} className="flex items-start gap-3 p-3 rounded-xl hover:bg-black/5 cursor-pointer transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${report.severity === 'danger' ? 'bg-red-100' : report.severity === 'warning' ? 'bg-orange-100' : report.severity === 'advisory' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
        <Icon className={`w-4 h-4 ${report.severity === 'danger' ? 'text-red-600' : report.severity === 'warning' ? 'text-orange-600' : report.severity === 'advisory' ? 'text-yellow-600' : 'text-blue-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{report.title}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getSeverityColor(report.severity)}`}>
            {report.severity}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{report.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {new Date(report.created_at).toLocaleDateString()} · {report.report_type.replace(/_/g, ' ')}
        </p>
      </div>
    </div>
  );
}
