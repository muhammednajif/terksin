import { Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';
import type { AiCommandInsight } from '@/features/analytics/types';
import { EmptyState } from './shared/EmptyState';

interface Props {
  insights: AiCommandInsight[];
  isLoading: boolean;
}

const colorCycle = [
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
];

export function AiInsightCards({ insights, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-black/5 p-4 animate-pulse">
            <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
            <div className="h-4 w-full bg-gray-100 rounded mb-2" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (insights.length === 0) return <EmptyState message="No AI insights generated yet" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
      {insights.map((insight, i) => {
        const isUp = insight.direction === 'up';
        const style = colorCycle[i % colorCycle.length];
        return (
          <div key={i} className={`${style.bg} ${style.border} rounded-xl border p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className={`w-3.5 h-3.5 ${style.text}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}>{insight.title}</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{insight.message}</p>
            <div className="flex items-center gap-1 mt-2">
              {isUp ? <TrendingUp className={`w-3 h-3 ${style.text}`} /> : <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={`text-[11px] font-medium ${isUp ? style.text : 'text-red-500'}`}>{Math.abs(insight.change)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
