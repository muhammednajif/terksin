import { useState, useEffect } from 'react';
import { Check, Plus, X, AlertCircle, Loader2, Package } from 'lucide-react';
import { fetchGearItems, toggleGearItem, addCustomGearItem, deleteCustomGearItem, getGearProgress } from '@/lib/journeys';

interface GearChecklistProps {
  journeyId: string;
}

export function GearChecklist({ journeyId }: GearChecklistProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchGearItems(journeyId);
      setItems(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [journeyId]);

  const handleToggle = async (id: string) => {
    await toggleGearItem(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: !i.is_checked } : i));
  };

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    try {
      const item = await addCustomGearItem(journeyId, newItem.trim());
      setItems(prev => [...prev, item]);
      setNewItem('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomGearItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const essentialTotal = items.filter(i => i.is_essential).length;
  const essentialChecked = items.filter(i => i.is_essential && i.is_checked).length;
  const total = items.length;
  const checked = items.filter(i => i.is_checked).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  const categories = [...new Set(items.map(i => i.category))];

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
          <Package className="w-4 h-4 text-brand-emerald" />
          <span className="text-sm font-semibold">Gear Checklist</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-brand-emerald">{pct}%</div>
          <div className="text-[10px] text-black/40">ready</div>
        </div>
      </div>

      <div className="h-2 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full bg-brand-emerald rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <p className="text-xs text-black/50">
        {essentialTotal > 0 ? `${essentialChecked}/${essentialTotal} essential items checked` : `${checked}/${total} items checked`}
        {essentialTotal > 0 && essentialTotal - essentialChecked > 0 && (
          <span className="text-yellow-600 font-medium"> &middot; {essentialTotal - essentialChecked} essential items remaining</span>
        )}
      </p>

      {items.length === 0 && (
        <div className="text-center py-6 text-black/40 text-sm">
          No gear items yet. Add some below.
        </div>
      )}

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-[10px] font-semibold text-black/40 uppercase tracking-wider mt-3 mb-1 px-1">
              {cat.replace('_', ' ')}
            </p>
            {items.filter(i => i.category === cat).map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                  item.is_checked ? 'bg-brand-emerald/5' : 'hover:bg-black/5'
                }`}
              >
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    item.is_checked
                      ? 'bg-brand-emerald border-brand-emerald'
                      : 'border-black/20 hover:border-brand-emerald/50'
                  }`}
                >
                  {item.is_checked && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className={`flex-1 text-sm ${item.is_checked ? 'line-through text-black/30' : ''}`}>
                  {item.item_name}
                  {item.is_essential && !item.is_checked && (
                    <AlertCircle className="w-3 h-3 text-yellow-500 inline ml-1" />
                  )}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove item"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Add custom item..."
          className="flex-1 px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald"
        />
        <button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="p-2 bg-brand-emerald text-white rounded-xl hover:bg-brand-emerald/90 transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
