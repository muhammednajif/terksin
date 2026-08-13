import { useState, useEffect } from 'react';
import { Check, Loader2, ClipboardCheck } from 'lucide-react';
import { fetchReadinessItems, toggleReadinessItem, getReadinessProgress } from '@/lib/journeys';

interface ReadinessChecklistProps {
  journeyId: string;
}

export function ReadinessChecklist({ journeyId }: ReadinessChecklistProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchReadinessItems(journeyId);
      setItems(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [journeyId]);

  const handleToggle = async (id: string) => {
    await toggleReadinessItem(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: !i.is_checked } : i));
  };

  const total = items.length;
  const checked = items.filter(i => i.is_checked).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-black/30" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-brand-emerald" />
          <span className="text-sm font-semibold">Readiness Checklist</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-brand-emerald">{pct}%</span>
        </div>
      </div>

      <div className="h-2 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full bg-brand-emerald rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <p className="text-xs text-black/50">
        Preparation progress: {checked} of {total} completed
      </p>

      <div className="space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              item.is_checked ? 'bg-brand-emerald/5' : 'hover:bg-black/5'
            }`}
          >
            <button
              onClick={() => handleToggle(item.id)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                item.is_checked
                  ? 'bg-brand-emerald border-brand-emerald'
                  : 'border-black/20 hover:border-brand-emerald/50'
              }`}
            >
              {item.is_checked && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`text-xs leading-relaxed ${item.is_checked ? 'line-through text-black/30' : 'text-black/70'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-black/40 italic">
        This checklist helps you prepare. It does not guarantee safety on the trail.
      </p>
    </div>
  );
}
