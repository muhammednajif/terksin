import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX, IconSearch, IconShield, IconCrown, IconStar, IconFlag,
  IconUserCircle, IconUserOff, IconDotsVertical, IconPhoto,
  IconRoute, IconFile, IconMapPin, IconBell, IconBellOff,
  IconArchive, IconArchiveOff, IconLogout, IconTrash,
  IconLink, IconQrcode, IconCheck, IconUsers, IconChevronDown,
} from '@tabler/icons-react';
import {
  fetchGroupMembers, updateMemberRole, removeMember,
  toggleMuteGroup, toggleArchiveGroup, deleteGroup,
  fetchGroupMedia, fetchGroupRoutes, fetchGroupFiles, fetchGroupWaypoints,
} from '@/lib/groups';
import type { Group, GroupMember, GroupAttachment, GroupSharedRoute, GroupSharedWaypoint } from '@/lib/database.types';
import { useAuth } from '@/hooks/useAuth';

interface GroupInfoProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onGroupUpdated?: () => void;
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  leader: { label: 'Leader', color: 'bg-red-100 text-red-700 border-red-300' },
  co_leader: { label: 'Co-Leader', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  guide: { label: 'Guide', color: 'bg-green-100 text-green-700 border-green-300' },
  moderator: { label: 'Mod', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  member: { label: 'Member', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  guest: { label: 'Guest', color: 'bg-purple-100 text-purple-600 border-purple-200' },
};

type Tab = 'members' | 'media' | 'routes' | 'files' | 'settings';

export function GroupInfo({ group, isOpen, onClose, onGroupUpdated }: GroupInfoProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [media, setMedia] = useState<GroupAttachment[]>([]);
  const [routes, setRoutes] = useState<GroupSharedRoute[]>([]);
  const [files, setFiles] = useState<GroupAttachment[]>([]);
  const [waypoints, setWaypoints] = useState<GroupSharedWaypoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  const myRole = group.members?.find(m => m.user_id === user?.id)?.role || 'member';
  const isAdmin = ['owner', 'leader', 'co_leader', 'moderator'].includes(myRole);
  const isOwner = myRole === 'owner';

  useEffect(() => {
    if (!isOpen || !group) return;
    loadData();
  }, [isOpen, group.id]);

  const loadData = async () => {
    setLoading(true);
    const [m, med, r, f, w] = await Promise.all([
      fetchGroupMembers(group.id),
      fetchGroupMedia(group.id),
      fetchGroupRoutes(group.id),
      fetchGroupFiles(group.id),
      fetchGroupWaypoints(group.id),
    ]);
    setMembers(m);
    setMedia(med);
    setRoutes(r);
    setFiles(f);
    setWaypoints(w);
    const myMember = m.find(mem => mem.user_id === user?.id);
    setIsMuted(myMember?.is_muted || false);
    setIsArchived(myMember?.is_archived || false);
    setLoading(false);
  };

  const handleRoleChange = async (targetUserId: string, role: GroupMember['role']) => {
    await updateMemberRole(group.id, targetUserId, role);
    setMembers(prev => prev.map(m => m.user_id === targetUserId ? { ...m, role } : m));
    setRoleDropdown(null);
  };

  const handleRemove = async (targetUserId: string) => {
    await removeMember(group.id, targetUserId);
    setMembers(prev => prev.filter(m => m.user_id !== targetUserId));
  };

  const handleMute = async () => {
    if (!user) return;
    await toggleMuteGroup(group.id, user.id);
    setIsMuted(!isMuted);
  };

  const handleArchive = async () => {
    if (!user) return;
    await toggleArchiveGroup(group.id, user.id);
    setIsArchived(!isArchived);
  };

  const handleDelete = async () => {
    await deleteGroup(group.id);
    setConfirmDelete(false);
    onClose();
    onGroupUpdated?.();
  };

  const handleCopyInvite = () => {
    if (group.invite_code) {
      navigator.clipboard.writeText(`${window.location.origin}/groups/join/${group.invite_code}`);
    }
  };

  const filteredMembers = members.filter(m => {
    const p = m.profile;
    const name = (p?.display_name || p?.username || '').toLowerCase();
    return name.includes(memberSearch.toLowerCase());
  });

  const canChangeRole = (targetRole: string) => {
    const hierarchy = ['owner', 'leader', 'co_leader', 'guide', 'moderator', 'member', 'guest'];
    const myIdx = hierarchy.indexOf(myRole);
    const targetIdx = hierarchy.indexOf(targetRole);
    return myIdx < targetIdx || isOwner;
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'members', label: 'Members', icon: IconUsers },
    { key: 'media', label: 'Media', icon: IconPhoto },
    { key: 'routes', label: 'Routes', icon: IconRoute },
    { key: 'files', label: 'Files', icon: IconFile },
    { key: 'settings', label: 'Settings', icon: IconDotsVertical },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/20"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white h-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                <h2 className="text-lg font-bold">Group Info</h2>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5">
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Group avatar + name */}
              <div className="px-5 py-4 flex items-center gap-4 border-b border-black/5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-black/5">
                  {group.avatar_url ? (
                    <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center text-white font-bold text-xl">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold truncate">{group.name}</h3>
                  {group.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{group.description}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {group.members?.length || members.length} members · {group.group_type}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-4 pt-3 pb-1 border-b border-black/5 overflow-x-auto scrollbar-none">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === tab.key ? 'bg-brand-emerald text-white' : 'text-gray-500 hover:bg-black/5'
                    }`}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-5 h-5 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Members */}
                    {activeTab === 'members' && (
                      <div className="p-4 space-y-3">
                        <div className="relative">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                            placeholder="Search members..."
                            className="w-full pl-9 pr-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors" />
                        </div>
                        <div className="space-y-1">
                          {filteredMembers.map(m => {
                            const p = m.profile;
                            const badge = ROLE_BADGES[m.role] || ROLE_BADGES.member;
                            return (
                              <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.02] transition-colors group">
                                <div className="relative flex-shrink-0">
                                  <div className="w-10 h-10 rounded-full overflow-hidden">
                                    {p?.avatar_url ? (
                                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700">
                                        {(p?.display_name || p?.username || '?').charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${(m as any).is_online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold truncate">{p?.display_name || p?.username || 'Unknown'}</span>
                                    {m.role === 'owner' && <IconCrown className="w-3.5 h-3.5 text-yellow-500" />}
                                    {m.role === 'leader' && <IconStar className="w-3.5 h-3.5 text-red-500" />}
                                    {m.role === 'guide' && <IconFlag className="w-3.5 h-3.5 text-green-500" />}
                                  </div>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                </div>
                                {isAdmin && m.user_id !== user?.id && (
                                  <div className="relative">
                                    <button onClick={() => setRoleDropdown(roleDropdown === m.user_id ? null : m.user_id)}
                                      className="p-1.5 rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <IconDotsVertical className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <AnimatePresence>
                                      {roleDropdown === m.user_id && (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                          className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-black/10 py-1 z-20">
                                          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Change Role</p>
                                          {Object.entries(ROLE_BADGES).filter(([key]) => key !== 'owner').map(([key, val]) => (
                                            <button key={key} onClick={() => handleRoleChange(m.user_id, key as GroupMember['role'])}
                                              disabled={!canChangeRole(m.role)}
                                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed`}>
                                              <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${val.color}`}>{val.label}</span>
                                              {m.role === key && <IconCheck className="w-3 h-3 text-brand-emerald ml-auto" />}
                                            </button>
                                          ))}
                                          <hr className="my-1 border-black/5" />
                                          <button onClick={() => handleRemove(m.user_id)}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 text-red-600">
                                            <IconUserOff className="w-3.5 h-3.5" /> Remove
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {filteredMembers.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-8">No members found</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Media */}
                    {activeTab === 'media' && (
                      <div className="p-4">
                        {media.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-12">No shared media yet</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {media.map((m, i) => (
                              <div key={m.id || i} className="aspect-square rounded-xl overflow-hidden bg-black/5">
                                {m.thumbnail_url || m.file_url ? (
                                  <img src={m.thumbnail_url || m.file_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <IconPhoto className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Routes */}
                    {activeTab === 'routes' && (
                      <div className="p-4 space-y-2">
                        {routes.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-12">No shared routes yet</p>
                        ) : (
                          routes.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                              <IconRoute className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{r.title || 'Route'}</p>
                                {r.distance_km && <p className="text-xs text-gray-500">{r.distance_km} km</p>}
                              </div>
                              <span className="text-[10px] font-medium text-green-600 uppercase">{r.route_type}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Files */}
                    {activeTab === 'files' && (
                      <div className="p-4 space-y-2">
                        {files.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-12">No shared files yet</p>
                        ) : (
                          files.map(f => (
                            <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-black/5">
                              <IconFile className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{f.file_name}</p>
                                <p className="text-[10px] text-gray-500">{formatFileSize(f.file_size)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Settings */}
                    {activeTab === 'settings' && (
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          {[
                            { icon: isMuted ? IconBellOff : IconBell, label: isMuted ? 'Unmute Notifications' : 'Mute Notifications', action: handleMute },
                            { icon: isArchived ? IconArchiveOff : IconArchive, label: isArchived ? 'Unarchive Group' : 'Archive Group', action: handleArchive },
                            { icon: IconLink, label: 'Copy Invite Link', action: handleCopyInvite },
                            { icon: IconQrcode, label: 'Show QR Code', action: () => {} },
                          ].map((item, i) => (
                            <button key={i} onClick={item.action}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 transition-colors">
                              <item.icon className="w-5 h-5 text-gray-500" />
                              <span className="text-sm font-medium">{item.label}</span>
                            </button>
                          ))}
                        </div>

                        <hr className="border-black/5" />

                        {/* Leave group */}
                        {!confirmLeave ? (
                          <button onClick={() => setConfirmLeave(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-red-600">
                            <IconLogout className="w-5 h-5" />
                            <span className="text-sm font-medium">Leave Group</span>
                          </button>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                            <p className="text-sm text-red-700 font-medium">Are you sure you want to leave this group?</p>
                            <div className="flex gap-2">
                              <button onClick={() => { removeMember(group.id, user!.id); onClose(); }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">
                                Leave
                              </button>
                              <button onClick={() => setConfirmLeave(false)}
                                className="flex-1 px-4 py-2 bg-white border border-black/10 text-sm font-semibold rounded-xl hover:bg-black/5">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Delete group (owner only) */}
                        {isOwner && (
                          <>
                            <hr className="border-black/5" />
                            {!confirmDelete ? (
                              <button onClick={() => setConfirmDelete(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-red-600">
                                <IconTrash className="w-5 h-5" />
                                <span className="text-sm font-medium">Delete Group</span>
                              </button>
                            ) : (
                              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                                <p className="text-sm text-red-700 font-medium">
                                  This will permanently delete this group and all its messages. This action cannot be undone.
                                </p>
                                <div className="flex gap-2">
                                  <button onClick={handleDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">
                                    Delete Forever
                                  </button>
                                  <button onClick={() => setConfirmDelete(false)}
                                    className="flex-1 px-4 py-2 bg-white border border-black/10 text-sm font-semibold rounded-xl hover:bg-black/5">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
