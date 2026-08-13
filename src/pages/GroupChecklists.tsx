import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconList, IconPlus, IconX, IconCheck, IconTrash,
  IconClipboard, IconBackpack, IconShield, IconTool,
  IconFilter, IconUserPlus, IconChevronDown, IconChevronRight,
} from '@tabler/icons-react';
import {
  fetchGroupChecklists, createGroupChecklist, addChecklistItem,
  updateChecklistItem, deleteChecklistItem, deleteChecklist,
} from '@/lib/groups';
import type { GroupChecklist, GroupChecklistItem } from '@/lib/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';

interface GroupChecklistsProps {
  groupId: string;
}

const CHECKLIST_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  general: { icon: IconClipboard, label: 'General', color: 'text-blue-600 bg-blue-100' },
  packing: { icon: IconBackpack, label: 'Packing', color: 'text-emerald-600 bg-emerald-100' },
  pre_trip: { icon: IconList, label: 'Pre-Trip', color: 'text-purple-600 bg-purple-100' },
  safety: { icon: IconShield, label: 'Safety', color: 'text-red-600 bg-red-100' },
  equipment: { icon: IconTool, label: 'Equipment', color: 'text-amber-600 bg-amber-100' },
  custom: { icon: IconClipboard, label: 'Custom', color: 'text-gray-600 bg-gray-100' },
};

const FILTERS = ['all', 'packing', 'safety', 'equipment'] as const;

export function GroupChecklists({ groupId }: GroupChecklistsProps) {
  const { user } = useAuth();
  const showToast = useStore(s => s.showToast);
  const [checklists, setChecklists] = useState<GroupChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<GroupChecklist['checklist_type']>('general');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { loadChecklists(); }, [groupId]);

  const loadChecklists = async () => {
    setLoading(true);
    const data = await fetchGroupChecklists(groupId);
    setChecklists(data);
    setLoading(false);
  };

  const handleCreateChecklist = async () => {
    if (!newTitle.trim()) return;
    const cl = await createGroupChecklist({
      group_id: groupId,
      title: newTitle.trim(),
      checklist_type: newType,
    });
    if (cl) {
      setChecklists(prev => [{ ...cl, items: [] }, ...prev]);
      showToast('Checklist created');
      setShowCreate(false);
      setNewTitle('');
      setNewType('general');
    }
  };

  const handleAddItem = async (checklistId: string) => {
    if (!newItemText.trim()) return;
    const item = await addChecklistItem(checklistId, newItemText.trim());
    if (item) {
      setChecklists(prev => prev.map(cl =>
        cl.id === checklistId ? { ...cl, items: [...(cl.items || []), item] } : cl
      ));
      setNewItemText('');
    }
  };

  const handleToggleItem = async (item: GroupChecklistItem) => {
    const updates: Partial<GroupChecklistItem> = {
      is_checked: !item.is_checked,
      checked_by: !item.is_checked ? user?.id || null : null,
    };
    await updateChecklistItem(item.id, updates);
    setChecklists(prev => prev.map(cl => ({
      ...cl,
      items: cl.items?.map(i => i.id === item.id ? { ...i, ...updates } : i),
    })));
  };

  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    await deleteChecklistItem(itemId);
    setChecklists(prev => prev.map(cl =>
      cl.id === checklistId ? { ...cl, items: cl.items?.filter(i => i.id !== itemId) } : cl
    ));
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    await deleteChecklist(checklistId);
    setChecklists(prev => prev.filter(cl => cl.id !== checklistId));
    showToast('Checklist deleted');
  };

  const filtered = filter === 'all'
    ? checklists
    : checklists.filter(cl => {
        if (filter === 'packing') return cl.checklist_type === 'packing' || cl.checklist_type === 'pre_trip';
        if (filter === 'safety') return cl.checklist_type === 'safety';
        if (filter === 'equipment') return cl.checklist_type === 'equipment';
        return true;
      });

  const getProgress = (cl: GroupChecklist): number => {
    const items = cl.items || [];
    if (items.length === 0) return 0;
    return Math.round((items.filter(i => i.is_checked).length / items.length) * 100);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 scrollbar-thin">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Checklists</h2>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
            <IconPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Checklist</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-colors ${
                filter === f ? 'bg-brand-emerald text-white' : 'bg-white border border-black/10 text-gray-600 hover:bg-black/5'
              }`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map(cl => {
              const config = CHECKLIST_TYPE_CONFIG[cl.checklist_type] || CHECKLIST_TYPE_CONFIG.custom;
              const progress = getProgress(cl);
              const isExpanded = expandedId === cl.id;
              const items = cl.items || [];

              return (
                <motion.div key={cl.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                  {/* Header */}
                  <button onClick={() => setExpandedId(isExpanded ? null : cl.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/[0.02] transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <config.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold truncate">{cl.title}</h3>
                        <span className="text-[10px] font-medium text-gray-500 px-1.5 py-0.5 bg-black/5 rounded-full">{config.label}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-emerald to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{progress}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{items.filter(i => i.is_checked).length}/{items.length}</span>
                      {isExpanded ? <IconChevronDown className="w-4 h-4 text-gray-400" /> : <IconChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-black/5">
                        <div className="p-4 space-y-1">
                          {items.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">No items yet. Add one below.</p>
                          )}
                          {items.map(item => (
                            <motion.div key={item.id} layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-3 py-1.5 group">
                              <button onClick={() => handleToggleItem(item)}
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  item.is_checked
                                    ? 'bg-brand-emerald border-brand-emerald'
                                    : 'border-gray-300 hover:border-brand-emerald'
                                }`}>
                                {item.is_checked && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <IconCheck className="w-3 h-3 text-white" />
                                  </motion.div>
                                )}
                              </button>
                              <span className={`flex-1 text-sm ${item.is_checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {item.content}
                              </span>
                              {item.assigned_to && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <IconUserPlus className="w-3 h-3" />
                                  Assigned
                                </span>
                              )}
                              <button onClick={() => handleDeleteItem(cl.id, item.id)}
                                className="p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                                <IconTrash className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </motion.div>
                          ))}
                          {/* Add item inline */}
                          <div className="flex items-center gap-2 pt-2">
                            <input type="text" value={newItemText} onChange={e => setNewItemText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddItem(cl.id); }}
                              placeholder="Add an item..."
                              className="flex-1 px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                            <button onClick={() => handleAddItem(cl.id)} disabled={!newItemText.trim()}
                              className="p-2 bg-brand-emerald text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
                              <IconPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-black/5">
                          <span className="text-[10px] text-gray-400">{items.length} items</span>
                          <button onClick={() => handleDeleteChecklist(cl.id)}
                            className="flex items-center gap-1 text-[10px] text-red-500 font-medium hover:text-red-600">
                            <IconTrash className="w-3 h-3" /> Delete checklist
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <IconList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No checklists found</p>
          </div>
        )}
      </div>

      {/* Create Checklist Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => { setShowCreate(false); setNewTitle(''); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Create Checklist</h3>
              <div className="space-y-4">
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Checklist title..."
                  className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CHECKLIST_TYPE_CONFIG).map(([key, config]) => (
                      <button key={key} onClick={() => setNewType(key as GroupChecklist['checklist_type'])}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          newType === key ? 'border-brand-emerald bg-brand-emerald/10 text-brand-emerald' : 'border-black/10 text-gray-600 hover:bg-black/5'
                        }`}>
                        <config.icon className="w-3.5 h-3.5" />
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleCreateChecklist} disabled={!newTitle.trim()}
                  className="flex-1 px-4 py-2.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50">
                  Create
                </button>
                <button onClick={() => { setShowCreate(false); setNewTitle(''); }}
                  className="flex-1 px-4 py-2.5 bg-black/5 text-sm font-semibold rounded-xl hover:bg-black/10">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
