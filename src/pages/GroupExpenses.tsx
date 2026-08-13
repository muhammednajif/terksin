import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconWallet, IconPlus, IconX, IconCheck, IconDotsVertical,
  IconCar, IconToolsKitchen2, IconBed, IconTool, IconBackpack,
  IconShield, IconAlertTriangle, IconInfoCircle, IconCurrencyDollar,
  IconReceipt, IconUser, IconArrowRight,
} from '@tabler/icons-react';
import {
  fetchGroupExpenses, createGroupExpense, fetchExpenseSplits, markSplitPaid,
} from '@/lib/groups';
import type { GroupExpense, GroupExpenseSplit, GroupMember } from '@/lib/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';

interface GroupExpensesProps {
  groupId: string;
  members: GroupMember[];
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'THB'];

const CATEGORY_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  transport: { icon: IconCar, label: 'Transport', color: 'text-blue-600 bg-blue-100' },
  food: { icon: IconToolsKitchen2, label: 'Food', color: 'text-orange-600 bg-orange-100' },
  accommodation: { icon: IconBed, label: 'Accommodation', color: 'text-purple-600 bg-purple-100' },
  equipment: { icon: IconTool, label: 'Equipment', color: 'text-amber-600 bg-amber-100' },
  guide: { icon: IconBackpack, label: 'Guide', color: 'text-emerald-600 bg-emerald-100' },
  permits: { icon: IconInfoCircle, label: 'Permits', color: 'text-red-600 bg-red-100' },
  emergency: { icon: IconAlertTriangle, label: 'Emergency', color: 'text-rose-600 bg-rose-100' },
  other: { icon: IconReceipt, label: 'Other', color: 'text-gray-600 bg-gray-100' },
};

export function GroupExpenses({ groupId, members }: GroupExpensesProps) {
  const { user } = useAuth();
  const showToast = useStore(s => s.showToast);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [splits, setSplits] = useState<Record<string, GroupExpenseSplit[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<GroupExpense['category']>('other');
  const [formSplitType, setFormSplitType] = useState<GroupExpense['split_type']>('equal');
  const [formNotes, setFormNotes] = useState('');
  const [formReceipt, setFormReceipt] = useState<File | null>(null);

  useEffect(() => { loadExpenses(); }, [groupId]);

  const loadExpenses = async () => {
    setLoading(true);
    const data = await fetchGroupExpenses(groupId);
    setExpenses(data);

    const splitMap: Record<string, GroupExpenseSplit[]> = {};
    await Promise.all(data.map(async (exp) => {
      const s = await fetchExpenseSplits(exp.id);
      splitMap[exp.id] = s;
    }));
    setSplits(splitMap);
    setLoading(false);
  };

  const handleCreateExpense = async () => {
    if (!formTitle.trim() || !formAmount || !user) return;
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) return;

    const approvedMembers = members.filter(m => m.is_approved).map(m => m.user_id);
    const splitAmounts = formSplitType === 'equal'
      ? approvedMembers.map(uid => ({ user_id: uid, amount: Math.round((amount / approvedMembers.length) * 100) / 100 }))
      : approvedMembers.map(uid => ({ user_id: uid, amount: 0 }));

    const expense = await createGroupExpense({
      group_id: groupId,
      paid_by: user.id,
      title: formTitle.trim(),
      amount,
      currency,
      category: formCategory,
      split_type: formSplitType,
      notes: formNotes.trim() || undefined,
      splits: splitAmounts,
    });

    if (expense) {
      setExpenses(prev => [expense, ...prev]);
      showToast('Expense added');
      setShowCreate(false);
      resetForm();
    }
  };

  const handleMarkPaid = async (expenseId: string, userId: string) => {
    await markSplitPaid(expenseId, userId);
    setSplits(prev => ({
      ...prev,
      [expenseId]: prev[expenseId]?.map(s =>
        s.user_id === userId ? { ...s, is_paid: true } : s
      ) || [],
    }));
    showToast('Marked as paid');
  };

  const resetForm = () => {
    setFormTitle('');
    setFormAmount('');
    setFormCategory('other');
    setFormSplitType('equal');
    setFormNotes('');
    setFormReceipt(null);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = members.filter(m => m.is_approved).length || 1;
  const perPerson = memberCount > 0 ? Math.round((totalExpenses / memberCount) * 100) / 100 : 0;

  const getMemberName = (uid: string) => {
    const m = members.find(mm => mm.user_id === uid);
    return m?.profile?.display_name || m?.profile?.username || 'Unknown';
  };

  const getPaidAmount = (uid: string) => {
    return expenses
      .filter(e => e.paid_by === uid)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getOwedAmount = (uid: string) => {
    let owed = 0;
    Object.entries(splits).forEach(([expId, expSplits]) => {
      const exp = expenses.find(e => e.id === expId);
      if (exp) {
        const mySplit = expSplits.find(s => s.user_id === uid);
        if (mySplit && !mySplit.is_paid) {
          owed += mySplit.amount;
        }
      }
    });
    return Math.round(owed * 100) / 100;
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 scrollbar-thin">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Header + Currency selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Expenses</h2>
          <div className="flex items-center gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="px-3 py-1.5 bg-white border border-black/10 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-emerald">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
              <IconPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Expense</span>
            </button>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-black/5">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold mt-1">{currency} {totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-black/5">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Per Person</p>
            <p className="text-2xl font-bold mt-1">{currency} {perPerson.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-black/5">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Members</p>
            <p className="text-2xl font-bold mt-1">{memberCount}</p>
          </div>
        </div>

        {/* Per-person breakdown */}
        <details className="bg-white rounded-2xl border border-black/5">
          <summary className="p-4 text-sm font-semibold cursor-pointer hover:bg-black/[0.02] rounded-2xl flex items-center gap-2">
            <IconUser className="w-4 h-4 text-gray-500" />
            Per-Person Breakdown
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {members.filter(m => m.is_approved).map(m => {
              const paid = getPaidAmount(m.user_id);
              const owed = getOwedAmount(m.user_id);
              const balance = paid - (totalExpenses / memberCount);
              return (
                <div key={m.user_id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    {m.profile?.avatar_url ? (
                      <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-[9px] font-bold text-emerald-700">
                        {getMemberName(m.user_id).charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="flex-1 text-sm">{getMemberName(m.user_id)}</span>
                  <span className="text-xs text-gray-500">Paid: {currency}{paid.toFixed(2)}</span>
                  <span className={`text-xs font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {balance >= 0 ? '' : '- '}{currency}{Math.abs(balance).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </details>

        {/* Expense list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {expenses.length === 0 ? (
              <div className="text-center py-20">
                <IconWallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No expenses yet</p>
              </div>
            ) : (
              expenses.map(exp => {
                const config = CATEGORY_CONFIG[exp.category || 'other'] || CATEGORY_CONFIG.other;
                const expSplits = splits[exp.id] || [];
                const paidByMember = members.find(m => m.user_id === exp.paid_by);
                const mySplit = expSplits.find(s => s.user_id === user?.id);
                const isSelected = selectedExpense === exp.id;

                return (
                  <motion.div key={exp.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                      <button onClick={() => setSelectedExpense(isSelected ? null : exp.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/[0.02] transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          <config.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold truncate">{exp.title}</h4>
                            {(!mySplit || mySplit.is_paid) && (
                              <span className="text-[9px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Paid</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full overflow-hidden">
                                {paidByMember?.profile?.avatar_url ? (
                                  <img src={paidByMember.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-[7px] font-bold">
                                    {getMemberName(exp.paid_by).charAt(0)}
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500">{getMemberName(exp.paid_by)}</span>
                            </div>
                            <span className="text-[10px] text-gray-400">·</span>
                            <span className="text-[10px] text-gray-500">{new Date(exp.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold">{exp.currency} {exp.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-gray-500">{exp.split_type}</p>
                        </div>
                      </button>

                      {/* Split details */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-black/5">
                            <div className="p-4 space-y-2">
                              {exp.notes && (
                                <p className="text-xs text-gray-500 mb-2 italic">{exp.notes}</p>
                              )}
                              {expSplits.map(split => {
                                const isMe = split.user_id === user?.id;
                                return (
                                  <div key={split.user_id} className="flex items-center gap-3 py-1.5">
                                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                      {members.find(m => m.user_id === split.user_id)?.profile?.avatar_url ? (
                                        <img src={members.find(m => m.user_id === split.user_id)!.profile!.avatar_url!} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-[8px] font-bold">
                                          {getMemberName(split.user_id).charAt(0)}
                                        </div>
                                      )}
                                    </div>
                                    <span className={`flex-1 text-xs ${isMe ? 'font-semibold' : ''}`}>
                                      {getMemberName(split.user_id)}{isMe ? ' (You)' : ''}
                                    </span>
                                    <span className="text-xs font-medium">
                                      {exp.currency} {split.amount.toFixed(2)}
                                    </span>
                                    {split.is_paid ? (
                                      <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                                        <IconCheck className="w-3 h-3" /> Paid
                                      </span>
                                    ) : (
                                      <button onClick={() => handleMarkPaid(exp.id, split.user_id)}
                                        className="text-[10px] text-brand-emerald font-medium hover:underline flex items-center gap-0.5">
                                        <IconArrowRight className="w-3 h-3" /> Mark paid
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Create Expense Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => { setShowCreate(false); resetForm(); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 pb-3 border-b border-black/5">
                <h3 className="text-lg font-bold">Add Expense</h3>
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-1.5 rounded-full hover:bg-black/5">
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Title *</label>
                  <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="What was this for?"
                    className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Amount *</label>
                    <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                      placeholder="0.00" min={0} step={0.01}
                      className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <button key={key} onClick={() => setFormCategory(key as GroupExpense['category'])}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          formCategory === key ? 'border-brand-emerald bg-brand-emerald/10 text-brand-emerald' : 'border-black/10 text-gray-600 hover:bg-black/5'
                        }`}>
                        <config.icon className="w-3.5 h-3.5" />
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Split Type</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'equal' as const, label: 'Equal' },
                      { value: 'custom' as const, label: 'Custom' },
                      { value: 'percentage' as const, label: 'Percentage' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setFormSplitType(opt.value)}
                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                          formSplitType === opt.value ? 'border-brand-emerald bg-brand-emerald/10 text-brand-emerald' : 'border-black/10 text-gray-600 hover:bg-black/5'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Notes</label>
                  <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Receipt (optional)</label>
                  <div className="flex items-center gap-3 p-4 border-2 border-dashed border-black/10 rounded-2xl hover:border-brand-emerald/50 transition-colors cursor-pointer">
                    <IconReceipt className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">{formReceipt ? formReceipt.name : 'Upload receipt image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setFormReceipt(file);
                    }} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={handleCreateExpense} disabled={!formTitle.trim() || !formAmount}
                  className="flex-1 px-4 py-2.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50">
                  Add Expense
                </button>
                <button onClick={() => { setShowCreate(false); resetForm(); }}
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
