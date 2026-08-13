import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconRoute, IconArrowUp, IconClock, IconCloud, IconUsers,
  IconMap, IconPlayerPlay, IconPlayerPause, IconPlayerStop,
  IconCheck, IconX, IconAlertTriangle, IconBroadcast,
  IconFlag, IconShield, IconLock, IconLockOpen, IconUserCheck,
  IconBattery, IconCurrentLocation, IconTarget, IconRefresh,
  IconLifebuoy, IconTemperature, IconEye, IconNavigation,
} from '@tabler/icons-react';
import {
  fetchGroupMembers, fetchSosAlerts, updateExpeditionStatus,
  lockGroup, acknowledgeGroupSos, resolveGroupSos,
  createGroupAnnouncement,
} from '@/lib/groups';
import { subscribeToSosAlerts } from '@/lib/groups';
import type { Group, GroupMember, GroupSosAlert } from '@/lib/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';

interface ExpeditionDashboardProps {
  group: Group;
}

export function ExpeditionDashboard({ group }: ExpeditionDashboardProps) {
  const { user } = useAuth();
  const showToast = useStore(s => s.showToast);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sosAlerts, setSosAlerts] = useState<GroupSosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expStatus, setExpStatus] = useState(group.expedition_status || 'planned');
  const [isLocked, setIsLocked] = useState(group.is_locked);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [showSosModal, setShowSosModal] = useState(false);

  const myRole = group.members?.find(m => m.user_id === user?.id)?.role || 'member';
  const isLeader = ['owner', 'leader', 'co_leader'].includes(myRole);

  useEffect(() => {
    loadData();
    const sub = subscribeToSosAlerts(group.id, (alert) => {
      if (alert.status === 'active') {
        setSosAlerts(prev => [alert, ...prev]);
        showToast('🚨 SOS Alert received!');
      }
    });
    return () => sub.unsubscribe();
  }, [group.id]);

  const loadData = async () => {
    setLoading(true);
    const [m, s] = await Promise.all([
      fetchGroupMembers(group.id),
      fetchSosAlerts(group.id),
    ]);
    setMembers(m);
    setSosAlerts(s.filter(a => a.status !== 'resolved'));
    setLoading(false);
  };

  const handleStatusChange = async (status: Group['expedition_status']) => {
    if (!status) return;
    await updateExpeditionStatus(group.id, status);
    setExpStatus(status);
    showToast(`Expedition ${status}`);
  };

  const handleLockToggle = async () => {
    await lockGroup(group.id, !isLocked);
    setIsLocked(!isLocked);
    showToast(isLocked ? 'Group unlocked' : 'Group locked');
  };

  const handleBroadcastAnnouncement = async () => {
    if (!announceContent.trim()) return;
    await createGroupAnnouncement({
      group_id: group.id,
      title: announceTitle || undefined,
      content: announceContent,
      priority: 'normal',
    });
    setShowAnnounceModal(false);
    setAnnounceTitle('');
    setAnnounceContent('');
    showToast('Announcement broadcast');
  };

  const handleBroadcastEmergency = async () => {
    await createGroupAnnouncement({
      group_id: group.id,
      content: '🚨 EMERGENCY BROADCAST — All members check in immediately!',
      priority: 'emergency',
    });
    showToast('Emergency broadcast sent');
  };

  const activeSos = sosAlerts.filter(a => a.status === 'active');
  const pendingMembers = members.filter(m => !m.is_approved);
  const approvedMembers = members.filter(m => m.is_approved);
  const onlineMembers = members.filter(m => (m as any).is_online);

  // Stats
  const stats = [
    { icon: IconRoute, label: 'Distance', value: group.remaining_distance_km ? `${group.remaining_distance_km} km` : '--' },
    { icon: IconArrowUp, label: 'Elevation', value: group.elevation_gain_m ? `${group.elevation_gain_m} m` : '--' },
    { icon: IconClock, label: 'ETA', value: group.eta ? new Date(group.eta).toLocaleTimeString() : '--' },
    { icon: IconCloud, label: 'Weather', value: (group.current_weather as any)?.condition || '--' },
    { icon: IconUsers, label: 'Active', value: `${onlineMembers.length}/${members.length}` },
  ];

  const checkpoints = [
    { name: 'Start', eta: group.expedition_start, type: 'departure', reached: true },
    ...((group as any).checkpoints || []).map((c: any) => ({ ...c, reached: c.id === group.current_checkpoint })),
    { name: 'Finish', eta: group.expedition_end, type: 'summit', reached: false },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 scrollbar-thin">
      <div className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Status Banner */}
        <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
          expStatus === 'active' ? 'bg-green-50 border border-green-200' :
          expStatus === 'paused' ? 'bg-amber-50 border border-amber-200' :
          expStatus === 'completed' ? 'bg-blue-50 border border-blue-200' :
          expStatus === 'cancelled' ? 'bg-red-50 border border-red-200' :
          'bg-gray-50 border border-black/5'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            expStatus === 'active' ? 'bg-green-500 animate-pulse' :
            expStatus === 'paused' ? 'bg-amber-500' :
            expStatus === 'completed' ? 'bg-blue-500' :
            expStatus === 'cancelled' ? 'bg-red-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm font-bold uppercase tracking-wider">{expStatus}</span>
          <span className="text-xs text-gray-500">{group.name}</span>
          <div className="flex-1" />
          {isLeader && expStatus === 'planned' && (
            <button onClick={() => handleStatusChange('active')}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700">
              <IconPlayerPlay className="w-3.5 h-3.5" /> Start
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 border border-black/5 text-center">
              <stat.icon className="w-4 h-4 text-brand-emerald mx-auto mb-1" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Live Map Placeholder */}
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="p-4 border-b border-black/5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <IconMap className="w-4 h-4 text-brand-emerald" /> Live Map
            </h3>
          </div>
          <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <IconMap className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Map integration coming soon</p>
              <p className="text-[10px] text-gray-400 mt-1">
                {group.members?.length} members tracking
              </p>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Checkpoint Timeline */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 p-4">
            <h3 className="text-sm font-bold mb-4">Checkpoint Timeline</h3>
            <div className="space-y-0">
              {checkpoints.map((cp, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      cp.reached ? 'bg-brand-emerald border-brand-emerald' :
                      cp.type === 'summit' ? 'border-amber-500' : 'border-gray-300'
                    }`}>
                      {cp.reached && <IconCheck className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {i < checkpoints.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[24px] ${cp.reached ? 'bg-brand-emerald' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <p className={`text-sm font-semibold ${cp.reached ? 'text-gray-900' : 'text-gray-500'}`}>
                      {cp.name}
                    </p>
                    {cp.eta && (
                      <p className="text-xs text-gray-400">
                        {new Date(cp.eta).toLocaleDateString()} · {new Date(cp.eta).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-black/5 p-4">
            <h3 className="text-sm font-bold mb-3">Quick Actions</h3>
            {isLeader ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: IconPlayerPlay, label: 'Start', action: () => handleStatusChange('active'), color: 'text-green-600', show: expStatus === 'planned' || expStatus === 'paused' },
                  { icon: IconPlayerPause, label: 'Pause', action: () => handleStatusChange('paused'), color: 'text-amber-600', show: expStatus === 'active' },
                  { icon: IconPlayerStop, label: 'Complete', action: () => handleStatusChange('completed'), color: 'text-blue-600', show: expStatus === 'active' },
                  { icon: IconX, label: 'Cancel', action: () => handleStatusChange('cancelled'), color: 'text-red-600', show: expStatus !== 'cancelled' && expStatus !== 'completed' },
                  { icon: IconBroadcast, label: 'Announce', action: () => setShowAnnounceModal(true), color: 'text-purple-600' },
                  { icon: IconAlertTriangle, label: 'Emergency', action: handleBroadcastEmergency, color: 'text-red-600' },
                  { icon: IconFlag, label: 'Checkpoint', action: () => showToast('Checkpoint feature coming soon'), color: 'text-emerald-600' },
                  { icon: IconShield, label: 'Assign Guide', action: () => showToast('Assign guide coming soon'), color: 'text-indigo-600' },
                  { icon: IconUserCheck, label: 'Approve', action: () => showToast(`${pendingMembers.length} pending`), color: 'text-teal-600', badge: pendingMembers.length },
                  { icon: isLocked ? IconLock : IconLockOpen, label: isLocked ? 'Unlock' : 'Lock', action: handleLockToggle, color: isLocked ? 'text-orange-600' : 'text-gray-600' },
                ].filter(a => a.show !== false).map((act, i) => (
                  <button key={i} onClick={act.action}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-black/5 transition-colors ${act.color} relative`}>
                    <act.icon className="w-5 h-5" />
                    <span className="text-[9px] font-medium">{act.label}</span>
                    {(act as any).badge && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {(act as any).badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Only leaders can manage the expedition</p>
            )}
          </div>
        </div>

        {/* Member Status Grid */}
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <IconUsers className="w-4 h-4 text-brand-emerald" /> Member Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {approvedMembers.map(m => {
              const p = m.profile;
              const isOnline = (m as any).is_online;
              return (
                <div key={m.user_id} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-black/5">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                          {p?.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 border border-white rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold truncate">{p?.display_name || p?.username || '?'}</p>
                    <div className="flex items-center gap-1">
                      <IconBattery className="w-2.5 h-2.5 text-gray-400" />
                      <span className="text-[8px] text-gray-400">{(m as any).battery || '--'}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {approvedMembers.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full text-center py-4">No approved members</p>
            )}
          </div>
        </div>

        {/* SOS Panel */}
        {activeSos.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-red-300 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 flex items-center gap-2">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <IconLifebuoy className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-sm font-bold text-white">Active SOS Alerts</span>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full ml-auto">{activeSos.length}</span>
            </div>
            <div className="p-3 space-y-2">
              {activeSos.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <IconAlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-700">{alert.alert_type?.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-xs text-red-600 truncate">{alert.message || 'No message'}</p>
                    <p className="text-[10px] text-red-400">
                      {(alert as any).sender?.display_name || 'Unknown'} · {new Date(alert.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => acknowledgeGroupSos(alert.id, user!.id)}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-600">
                      Ack
                    </button>
                    {isLeader && (
                      <button onClick={() => resolveGroupSos(alert.id)}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weather Widget */}
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <IconCloud className="w-4 h-4 text-sky-500" /> Weather
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <IconTemperature className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{(group.current_weather as any)?.temp || '--'}°</p>
                <p className="text-[10px] text-gray-500">{(group.current_weather as any)?.condition || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <IconEye className="w-3.5 h-3.5" />
                <span>{(group.current_weather as any)?.visibility || '--'} km</span>
              </div>
              <div className="flex items-center gap-1">
                <IconNavigation className="w-3.5 h-3.5" />
                <span>{(group.current_weather as any)?.windSpeed || '--'} km/h</span>
              </div>
            </div>
            <button onClick={() => showToast('Refreshing weather...')} className="p-2 rounded-full hover:bg-black/5 ml-auto">
              <IconRefresh className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Journey Progress */}
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">Journey Progress</h3>
            <span className="text-xs text-gray-500">{checkpoints.filter(c => c.reached).length}/{checkpoints.length} checkpoints</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-emerald to-emerald-400 rounded-full transition-all duration-1000"
              style={{ width: `${(checkpoints.filter(c => c.reached).length / Math.max(checkpoints.length, 1)) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-400">
            <span>{group.expedition_start ? new Date(group.expedition_start).toLocaleDateString() : 'Start'}</span>
            <span>{group.expedition_end ? new Date(group.expedition_end).toLocaleDateString() : 'End'}</span>
          </div>
        </div>

      </div>

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnounceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowAnnounceModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Broadcast Announcement</h3>
              <div className="space-y-3">
                <input type="text" value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald" />
                <textarea value={announceContent} onChange={e => setAnnounceContent(e.target.value)}
                  placeholder="Announcement content..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald resize-none" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleBroadcastAnnouncement}
                  disabled={!announceContent.trim()}
                  className="flex-1 px-4 py-2.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50">
                  Broadcast
                </button>
                <button onClick={() => setShowAnnounceModal(false)}
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
