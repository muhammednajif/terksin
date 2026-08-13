import { useNavigate } from 'react-router-dom';
import { Calendar, Award, Bell, Flag, Shield, Thermometer, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  autoState: 'idle' | 'running' | 'success' | 'error';
  onRunAutomation: () => void;
}

export function QuickActionCenter({ autoState, onRunAutomation }: Props) {
  const navigate = useNavigate();

  const buttons = [
    { icon: Calendar, label: 'Create Expedition', path: '/admin/expeditions', bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    { icon: Award, label: 'Create Challenge', path: '/admin/challenges', bg: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
    { icon: Bell, label: 'Publish Announcement', path: '/admin/announcements', bg: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { icon: Flag, label: 'Review Reports', path: '/admin/moderation', bg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
    { icon: Shield, label: 'Open Moderation', path: '/admin/moderation', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    { icon: Thermometer, label: 'View TrekPulse', path: '/admin/trekpulse', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {buttons.map((btn, i) => (
        <button key={i} onClick={() => btn.path && navigate(btn.path)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${btn.bg} text-xs font-medium transition-all`}>
          <btn.icon className="w-3.5 h-3.5" />{btn.label}
        </button>
      ))}
      <button onClick={onRunAutomation} disabled={autoState === 'running'}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 text-xs font-medium transition-all disabled:opacity-50">
        {autoState === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {autoState === 'running' ? 'Running...' : 'Run Automation Demo'}
      </button>
    </div>
  );
}
