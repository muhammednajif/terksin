import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  IconX, IconArrowLeft, IconArrowRight, IconCheck, IconUpload,
  IconUsers, IconMountain, IconGlobe, IconLock, IconMail,
  IconCalendar, IconRoute, IconSearch, IconUserPlus,
} from '@tabler/icons-react';
import { createGroup, searchUsers } from '@/lib/groups';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import type { Group, Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

interface CreateGroupProps {
  onClose: () => void;
  onCreated: (group: Group) => void;
  editGroup?: Group | null;
}

const STEPS = ['Details', 'Visibility', 'Expedition', 'Members'];

export function CreateGroup({ onClose, onCreated, editGroup }: CreateGroupProps) {
  const { user } = useAuth();
  const showToast = useStore(s => s.showToast);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [name, setName] = useState(editGroup?.name || '');
  const [description, setDescription] = useState(editGroup?.description || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(editGroup?.avatar_url || '');

  // Step 2
  const [groupType, setGroupType] = useState<'user' | 'expedition'>(editGroup?.group_type === 'expedition' ? 'expedition' : 'user');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite_only'>(editGroup?.visibility || 'private');
  const [maxMembers, setMaxMembers] = useState(editGroup?.max_members || 50);

  // Step 3 (expedition only)
  const [expStart, setExpStart] = useState(editGroup?.expedition_start?.split('T')[0] || '');
  const [expEnd, setExpEnd] = useState(editGroup?.expedition_end?.split('T')[0] || '');

  // Step 4
  const [memberQuery, setMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarPick = () => avatarInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Search members
  const handleSearchMembers = async (q: string) => {
    setMemberQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const exclude = [user!.id, ...selectedMembers.map(m => m.id)];
    const results = await searchUsers(q, exclude);
    setSearchResults(results);
    setSearching(false);
  };

  const addMember = (p: Profile) => {
    setSelectedMembers(prev => [...prev, p]);
    setMemberQuery('');
    setSearchResults([]);
  };

  const removeMember = (id: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== id));
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return true;
    if (step === 2 && groupType === 'expedition') return expStart && expEnd;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (step < (groupType === 'expedition' ? 2 : 1)) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const totalSteps = groupType === 'expedition' ? 4 : 3;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    let avatarUrl = editGroup?.avatar_url || '';
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `group-avatars/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('groups')
        .upload(path, avatarFile);
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('groups').getPublicUrl(path);
        avatarUrl = publicUrl;
      }
    }

    const groupData = {
      name: name.trim(),
      description: description.trim() || undefined,
      avatar_url: avatarUrl || undefined,
      group_type: groupType,
      visibility,
      max_members: maxMembers,
      expedition_start: groupType === 'expedition' ? expStart : undefined,
      expedition_end: groupType === 'expedition' ? expEnd : undefined,
      memberIds: selectedMembers.map(m => m.id),
    };

    const group = await createGroup(groupData);

    setSubmitting(false);

    if (group) {
      showToast('Group created!');
      onCreated(group);
    } else {
      showToast('Failed to create group');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-black/5">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={handleBack} className="p-1.5 rounded-full hover:bg-black/5">
                <IconArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold">{editGroup ? 'Edit Group' : 'Create Group'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 px-5 pt-4 pb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
              i < step ? 'bg-brand-emerald' : i === step ? 'bg-brand-emerald/50' : 'bg-black/10'
            }`} />
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 max-h-[55vh]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Group Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setGroupType('user')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        groupType === 'user' ? 'border-brand-emerald bg-brand-emerald/5' : 'border-black/10 hover:border-black/20'
                      }`}>
                      <IconUsers className="w-6 h-6 text-brand-emerald" />
                      <span className="text-sm font-semibold">User Group</span>
                      <span className="text-[10px] text-gray-500 text-center">For trekkers and general communication</span>
                    </button>
                    <button onClick={() => {
                      setGroupType('expedition');
                    }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        groupType === 'expedition' ? 'border-amber-500 bg-amber-50' : 'border-black/10 hover:border-black/20'
                      }`}>
                      <IconMountain className="w-6 h-6 text-amber-600" />
                      <span className="text-sm font-semibold">Expedition</span>
                      <span className="text-[10px] text-gray-500 text-center">With route, checkpoints & live tracking</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Group Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What's this group about?"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Group Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <IconUsers className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <button onClick={handleAvatarPick}
                      className="px-4 py-2 bg-black/5 border border-black/10 rounded-xl text-sm font-medium hover:bg-black/10 transition-colors">
                      <IconUpload className="w-4 h-4 inline mr-1" /> Upload
                    </button>
                    <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Visibility</label>
                  <div className="space-y-2">
                    {[
                      { value: 'public' as const, icon: IconGlobe, label: 'Public', desc: 'Anyone can find and join' },
                      { value: 'private' as const, icon: IconLock, label: 'Private', desc: 'Only invited members can join' },
                      { value: 'invite_only' as const, icon: IconMail, label: 'Invite Only', desc: 'Members must be invited by admins' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setVisibility(opt.value)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                          visibility === opt.value ? 'border-brand-emerald bg-brand-emerald/5' : 'border-black/10 hover:border-black/20'
                        }`}>
                        <opt.icon className={`w-5 h-5 ${visibility === opt.value ? 'text-brand-emerald' : 'text-gray-400'}`} />
                        <div className="text-left">
                          <p className="text-sm font-semibold">{opt.label}</p>
                          <p className="text-[11px] text-gray-500">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Max Members</label>
                  <input type="number" value={maxMembers} onChange={e => setMaxMembers(parseInt(e.target.value) || 1)}
                    min={1} max={500}
                    className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors" />
                </div>
              </motion.div>
            )}

            {step === 2 && groupType === 'expedition' && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-2">
                  <p className="text-xs text-amber-700">
                    <IconMountain className="w-3.5 h-3.5 inline mr-1" />
                    Expedition groups support route planning, checkpoints, live tracking, and weather updates.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Start Date *</label>
                    <input type="date" value={expStart} onChange={e => setExpStart(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">End Date *</label>
                    <input type="date" value={expEnd} onChange={e => setExpEnd(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Route (GPX/KML)</label>
                  <div className="flex items-center gap-3 p-4 border-2 border-dashed border-black/10 rounded-2xl hover:border-brand-emerald/50 transition-colors cursor-pointer">
                    <IconRoute className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Drag & drop or click to upload a route file</span>
                  </div>
                </div>
              </motion.div>
            )}

            {(step === 2 && groupType !== 'expedition') || step === (groupType === 'expedition' ? 3 : 2) ? (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Invite Members</label>
                  <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={memberQuery} onChange={e => handleSearchMembers(e.target.value)}
                      placeholder="Search trekkers..."
                      className="w-full pl-9 pr-3 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors" />
                  </div>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="bg-white border border-black/10 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map(p => (
                      <button key={p.id} onClick={() => addMember(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 text-left transition-colors">
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center text-white font-bold text-sm">
                              {p.display_name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{p.display_name || p.username || 'Unknown'}</p>
                          {p.display_name && p.username && <p className="text-[11px] text-gray-400">@{p.username}</p>}
                        </div>
                        <IconUserPlus className="w-4 h-4 text-brand-emerald" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected members */}
                {selectedMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">{selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-brand-emerald/10 rounded-full">
                          <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-brand-emerald flex items-center justify-center text-white text-[8px] font-bold">
                                {m.display_name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium">{m.display_name || m.username}</span>
                          <button onClick={() => removeMember(m.id)} className="p-0.5 hover:bg-black/10 rounded-full">
                            <IconX className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searching && (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-black/5">
          <span className="text-xs text-gray-400">
            Step {step + 1} of {totalSteps}
          </span>
          <div className="flex gap-2">
            {step < totalSteps - 1 ? (
              <button onClick={handleNext} disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Next
                <IconArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !name.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconCheck className="w-4 h-4" />
                )}
                {editGroup ? 'Save Changes' : 'Create Group'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
