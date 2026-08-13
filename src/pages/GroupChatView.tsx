import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Group, GroupMessage, GroupSosAlert, Profile } from '@/lib/database.types';
import {
  fetchGroupMessages, sendGroupMessage, editGroupMessage, deleteGroupMessage,
  pinGroupMessage, addGroupReaction, removeGroupReaction, markGroupRead,
  emitGroupTyping, subscribeToGroupMessages, subscribeToGroupTyping, subscribeToSosAlerts,
  acknowledgeGroupSos, resolveGroupSos,
} from '@/lib/groups';
import {
  IconSend, IconPaperclip, IconMoodSmile, IconChevronLeft, IconDotsVertical,
  IconPhone, IconVideo, IconInfoCircle, IconCheck, IconX, IconArrowBackUp,
  IconEdit, IconTrash, IconCopy, IconPin, IconArrowForwardUp, IconBookmark,
  IconCamera, IconPhoto, IconFile, IconMapPin, IconRoute, IconFlag,
  IconCloud, IconAlertTriangle, IconPlayerPlay, IconMap, IconBattery,
  IconMicrophone, IconPlus, IconNavigation, IconMountain, IconBook, IconUserPlus,
  IconCampfire, IconDroplet, IconCloudRain, IconReportAnalytics, IconCalendarEvent,
  IconHeartbeat, IconRadio, IconCurrentLocation, IconLifebuoy, IconCurrencyDollar,
} from '@tabler/icons-react';

import { ActionSheet } from '@/components/community/chat/ActionSheet';
import { VoiceRecorder } from '@/components/community/chat/VoiceRecorder';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

interface GroupChatViewProps {
  group: Group;
  userId: string;
  onBack: () => void;
  onGroupUpdated?: () => void;
}

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24); return `${d}d ago`;
}

function formatDaySeparator(date: string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function shouldShowDaySeparator(current: string, previous?: string): boolean {
  if (!previous) return true;
  return new Date(current).toDateString() !== new Date(previous).toDateString();
}

function shouldGroupMessages(current: GroupMessage, previous?: GroupMessage): boolean {
  if (!previous) return false;
  if (current.sender_id !== previous.sender_id) return false;
  return new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() < 300000;
}

export function GroupChatView({ group, userId, onBack, onGroupUpdated }: GroupChatViewProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; sender: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showMsgMenu, setShowMsgMenu] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [activeSos, setActiveSos] = useState<GroupSosAlert | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  // Load messages
  const loadMessages = useCallback(async (pg = 0) => {
    setLoading(true);
    const result = await fetchGroupMessages(group.id, pg);
    if (pg === 0) {
      setMessages(result.messages);
      const pinned = result.messages.filter(m => m.is_pinned);
      setPinnedMessages(pinned);
    } else {
      setMessages(prev => [...result.messages, ...prev]);
    }
    setHasMore(result.hasMore);
    setPage(pg);
    setLoading(false);

    if (pg === 0) {
      await markGroupRead(group.id, userId);
    }
  }, [group.id, userId]);

  useEffect(() => { loadMessages(0); }, [group.id]);

  // Real-time subscription
  useEffect(() => {
    const sub = subscribeToGroupMessages(group.id, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.is_pinned) {
        setPinnedMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      if (msg.sender_id !== userId) {
        markGroupRead(group.id, userId);
      }
    }, (msg) => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
      if (msg.is_pinned) {
        setPinnedMessages(prev => prev.some(p => p.id === msg.id) ? prev : [...prev, msg as GroupMessage]);
      } else {
        setPinnedMessages(prev => prev.filter(p => p.id !== msg.id));
      }
    }, (msgId) => {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setPinnedMessages(prev => prev.filter(p => p.id !== msgId));
    });
    return () => sub.unsubscribe();
  }, [group.id, userId]);

  // Typing subscription
  useEffect(() => {
    const sub = subscribeToGroupTyping(group.id, userId,
      (uid) => setTypingUsers(prev => new Set(prev).add(uid)),
      (uid) => setTypingUsers(prev => { const n = new Set(prev); n.delete(uid); return n; }),
    );
    return () => sub.unsubscribe();
  }, [group.id, userId]);

  // SOS subscription
  useEffect(() => {
    const sub = subscribeToSosAlerts(group.id, (alert) => {
      if (alert.status === 'active') setActiveSos(alert);
    });
    return () => sub.unsubscribe();
  }, [group.id]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendGroupMessage(group.id, userId, text.trim(), 'text', replyTo?.id);
    setText('');
    setReplyTo(null);
    emitGroupTyping(group.id, userId, false);
  };

  const handleEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    await editGroupMessage(msgId, editText.trim());
    setEditingMsg(null);
    setEditText('');
  };

  const handleDelete = async (msgId: string, forEveryone = false) => {
    await deleteGroupMessage(msgId, userId, forEveryone);
    setShowMsgMenu(null);
  };

  const handlePin = async (msgId: string) => {
    await pinGroupMessage(msgId);
    setShowMsgMenu(null);
  };

  const handleCopy = (content: string | null) => {
    if (content) navigator.clipboard.writeText(content);
    setShowMsgMenu(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMsg) handleEdit(editingMsg);
      else handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (e.target.value) {
      emitGroupTyping(group.id, userId, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitGroupTyping(group.id, userId, false);
      }, 2000);
    } else {
      emitGroupTyping(group.id, userId, false);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    const existing = messages.find(m => m.id === msgId)?.reactions
      ?.find(r => r.user_id === userId && r.emoji === emoji);
    if (existing) {
      await removeGroupReaction(msgId, userId, emoji);
    } else {
      await addGroupReaction(msgId, userId, emoji);
    }
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendGroupMessage(group.id, userId, `📎 ${file.name}`, 'document', replyTo?.id, {
      file_name: file.name, file_size: file.size, file_type: file.type,
    });
    e.target.value = '';
    setShowAttach(false);
  };

  const handleAttachCamera = () => {
    sendGroupMessage(group.id, userId, '📷 Photo', 'image');
    setShowAttach(false);
  };

  const handleAttachLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      sendGroupMessage(group.id, userId, `📍 ${pos.coords.latitude},${pos.coords.longitude}`, 'location', replyTo?.id, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
    });
    setShowAttach(false);
  };

  const handleAttachRoute = () => {
    sendGroupMessage(group.id, userId, '🗺️ Route shared', 'route');
    setShowAttach(false);
  };

  const handleAttachWaypoint = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      sendGroupMessage(group.id, userId, '📍 Waypoint', 'waypoint', replyTo?.id, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
    });
    setShowAttach(false);
  };

  const handleAttachWeather = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      sendGroupMessage(group.id, userId, '🌤️ Weather card', 'weather_card', replyTo?.id, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
    });
    setShowAttach(false);
  };

  const handleAttachEmergency = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      sendGroupMessage(group.id, userId, '🚨 EMERGENCY! Need assistance!', 'sos_alert', replyTo?.id, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        alert_type: 'sos',
      });
    }, () => {
      sendGroupMessage(group.id, userId, '🚨 EMERGENCY! Need assistance!', 'sos_alert');
    });
    setShowAttach(false);
  };

  const handleVoice = () => {
    setShowVoiceRecorder(!showVoiceRecorder);
  };

  const handleVoiceSend = (blob: Blob) => {
    sendGroupMessage(group.id, userId, '🎤 Voice message', 'voice', replyTo?.id);
    setShowVoiceRecorder(false);
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendGroupMessage(group.id, userId, `📍 ${pos.coords.latitude},${pos.coords.longitude}`, 'location', replyTo?.id, {
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        });
      },
      () => alert('Could not get location')
    );
  };

  const handleLiveTrekToggle = () => {
    sendGroupMessage(group.id, userId, '🏔️ Live trek shared', 'live_trek');
  };

  const handleSos = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      sendGroupMessage(group.id, userId, '🚨 EMERGENCY! Need assistance!', 'sos_alert', replyTo?.id, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude, alert_type: 'sos',
      });
    }, () => {
      sendGroupMessage(group.id, userId, '🚨 EMERGENCY! Need assistance!', 'sos_alert');
    });
  };

  const handleWeatherShare = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      sendGroupMessage(group.id, userId, '🌤️ Weather card', 'weather_card', replyTo?.id, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
    });
  };

  const handleAlbumSend = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*';
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length) {
        const title = prompt('Album title:') || 'Expedition Album';
        sendGroupMessage(group.id, userId, `📸 Album: ${title} (${files.length} photos)`, 'album');
      }
    };
    input.click();
  };

  // Multi-select
  const handleMessageSelect = (msgId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedMessages(prev => {
        const next = new Set(prev);
        if (next.has(msgId)) next.delete(msgId);
        else next.add(msgId);
        return next;
      });
    }
  };

  const handleLongPress = (msgId: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleTouchStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => handleLongPress(msgId), 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleMultiDelete = () => {
    selectedMessages.forEach(id => deleteGroupMessage(id, userId));
    setSelectedMessages(new Set());
  };

  const handleMultiForward = () => {
    const gid = prompt('Enter group ID to forward to:');
    if (!gid) return;
    selectedMessages.forEach(id => {
      const msg = messages.find(m => m.id === id);
      if (msg) sendGroupMessage(gid, userId, msg.content || '', msg.message_type);
    });
    setSelectedMessages(new Set());
  };

  const handleMultiBookmark = () => {
    setSelectedMessages(new Set());
  };

  const handleLoadMore = () => {
    if (hasMore) loadMessages(page + 1);
  };

  const renderMessageContent = (msg: GroupMessage, isOwn: boolean) => {
    const type = msg.message_type;
    const meta = msg.metadata || {};

    if (type === 'sos_alert') {
      return (
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white p-3 min-w-[240px]">
          <div className="flex items-center gap-2 mb-1">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
              <IconAlertTriangle className="w-5 h-5" />
            </motion.div>
            <span className="text-sm font-bold">SOS EMERGENCY</span>
          </div>
          <p className="text-sm text-red-100">{msg.content}</p>
          {(meta as any).latitude && (
            <a href={`https://maps.google.com/?q=${(meta as any).latitude},${(meta as any).longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-200 underline flex items-center gap-1 mt-1">
              <IconMap className="w-3 h-3" /> View Location
            </a>
          )}
        </div>
      );
    }

    if (type === 'system') {
      return (
        <div className="text-center text-xs text-gray-400 italic py-1">
          {msg.content}
        </div>
      );
    }

    if (type === 'announcement') {
      return (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-100 border border-amber-200 p-3 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Announcement</span>
          </div>
          <p className="text-sm text-gray-800">{msg.content}</p>
        </div>
      );
    }

    if (type === 'image') {
      return (
        <div className="rounded-2xl overflow-hidden border border-black/5">
          {(meta as any).thumbnail_url || (meta as any).file_url ? (
            <img src={(meta as any).thumbnail_url || (meta as any).file_url} alt="" className="max-w-full max-h-64 object-cover rounded-2xl" />
          ) : (
            <span className="flex items-center gap-1 p-2 text-sm">📷 Photo</span>
          )}
        </div>
      );
    }

    if (type === 'video') {
      return (
        <div className="rounded-2xl overflow-hidden border border-black/5">
          {(meta as any).file_url ? (
            <video src={(meta as any).file_url} className="max-w-full max-h-64 object-cover rounded-2xl" controls />
          ) : (
            <span className="flex items-center gap-1 p-2 text-sm">🎥 Video</span>
          )}
        </div>
      );
    }

    if (type === 'voice_note') {
      return (
        <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 p-3 min-w-[200px]">
          <div className="flex items-center gap-3">
            <button className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors">
              <IconPlayerPlay className="w-4 h-4" />
            </button>
            <div>
              <div className="flex gap-0.5 items-end h-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-1 bg-purple-400 rounded-full"
                    style={{ height: `${Math.max(4, Math.sin(i * 0.8) * 12 + 12)}px` }} />
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{(meta as any).duration || '0:00'}</p>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'document') {
      return (
        <div className="rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-black/10 p-3 min-w-[200px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <IconFile className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{(meta as any).file_name || 'Document'}</p>
              <p className="text-[10px] text-gray-500">{formatFileSize((meta as any).file_size || 0)}</p>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'location') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-3 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <IconMapPin className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">Location</span>
          </div>
          <p className="text-xs text-gray-600">{msg.content?.replace('📍 ', '')}</p>
        </div>
      );
    }

    if (type === 'gpx' || type === 'route') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-emerald-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <IconRoute className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">{(meta as any).name || 'Route'}</span>
          </div>
          {(meta as any).distance && <p className="text-xs text-gray-600">{(meta as any).distance} km</p>}
        </div>
      );
    }

    if (type === 'waypoint') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <IconFlag className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Waypoint</span>
          </div>
          {(meta as any).title && <p className="text-sm font-medium">{(meta as any).title}</p>}
        </div>
      );
    }

    if (type === 'weather_card') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 border border-sky-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <IconCloud className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-semibold text-sky-800">Weather</span>
          </div>
          <p className="text-sm">{(meta as any).temp || '?'}°C - {(meta as any).condition || 'Unknown'}</p>
        </div>
      );
    }

    if (type === 'expedition_card' || type === 'journey_card') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 border border-amber-200 p-3 min-w-[200px]">
          <h4 className="font-bold text-sm">{(meta as any).title || 'Expedition'}</h4>
          {msg.content && <p className="text-xs text-gray-600 mt-0.5">{msg.content}</p>}
        </div>
      );
    }

    if (type === 'checkpoint') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-emerald-500" />
            <span className="text-xs font-semibold text-emerald-800">{(meta as any).name || 'Checkpoint'}</span>
          </div>
          {(meta as any).eta && <p className="text-xs text-gray-600 mt-1">ETA: {new Date((meta as any).eta).toLocaleTimeString()}</p>}
        </div>
      );
    }

    return null;
  };

  const myRole = group.members?.find(m => m.user_id === userId)?.role || 'member';
  const isAdmin = ['owner', 'leader', 'co_leader', 'moderator'].includes(myRole);
  const onlineCount = group.members?.filter(m => (m as any).is_online)?.length || 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50/50 relative">
      {/* SOS Banner */}
      <AnimatePresence>
        {activeSos && (
          <motion.div initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}
            className="sticky top-0 z-20 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 flex items-center gap-3">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
              <IconAlertTriangle className="w-5 h-5" />
            </motion.div>
            <span className="text-sm font-semibold flex-1">SOS Alert Active</span>
            <button onClick={() => acknowledgeGroupSos(activeSos.id, userId)}
              className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium hover:bg-white/30">
              Acknowledge
            </button>
            <button onClick={() => resolveGroupSos(activeSos.id)}
              className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium hover:bg-white/30">
              Resolve
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Messages Banner */}
      <AnimatePresence>
        {pinnedMessages.length > 0 && (
          <motion.div initial={{ y: -40 }} animate={{ y: 0 }} exit={{ y: -40 }}
            className="sticky top-0 z-10 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
            <IconPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-700 font-medium truncate">
                {pinnedMessages[0].content || 'Pinned message'}
              </p>
              {pinnedMessages.length > 1 && (
                <p className="text-[10px] text-amber-500">+{pinnedMessages.length - 1} more pinned</p>
              )}
            </div>
            <button onClick={() => setPinnedMessages([])} className="p-1 hover:bg-amber-200/50 rounded-full">
              <IconX className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-black/5 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5 md:hidden">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-brand-emerald/20">
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center text-white font-bold">
                {group.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{group.name}</h3>
          <p className="text-[11px] text-gray-500">
            {group.members?.length || 0} members{onlineCount > 0 && ` · ${onlineCount} online`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-black/5 transition-colors" title="Voice call">
            <IconPhone className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-black/5 transition-colors" title="Video call">
            <IconVideo className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-full hover:bg-black/5 transition-colors" title="Group info">
            <IconInfoCircle className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1 text-xs text-brand-emerald font-medium">
          {Array.from(typingUsers).map(uid => {
            const m = group.members?.find(p => p.user_id === uid);
            return (m as any)?.profile?.display_name || 'Someone';
          }).join(', ')} typing...
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin">
        {hasMore && (
          <button onClick={handleLoadMore} className="w-full text-xs text-brand-emerald font-medium py-2 hover:underline text-center">
            Load older messages
          </button>
        )}
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="text-center py-12 text-sm text-gray-400">
            No messages yet. Start the conversation!
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
            const showDaySep = shouldShowDaySeparator(msg.created_at, prevMsg?.created_at);
            const grouped = shouldGroupMessages(msg, prevMsg);
            const isOwn = msg.sender_id === userId;
            const msgSender = msg.sender as Profile | undefined;
            const isDeleted = msg.is_deleted;
            const isSelected = selectedMessages.has(msg.id);
            const customContent = renderMessageContent(msg, isOwn);

            if (msg.deleted_for?.includes(userId)) return null;

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} id={`gmsg-${msg.id}`}>
                {showDaySep && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[11px] font-medium text-gray-400 bg-white/80 px-3 py-1 rounded-full border border-black/5">
                      {formatDaySeparator(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'} ${isSelected ? 'opacity-80' : ''}`}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onClick={(e) => handleMessageSelect(msg.id, e)}>
                  {!grouped && !isOwn && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mt-0.5">
                      {msgSender?.avatar_url ? (
                        <img src={msgSender.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                          {msgSender?.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                  )}
                  {grouped && !isOwn && <div className="w-8 flex-shrink-0" />}
                  <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col relative`}>
                    {isSelected && (
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2">
                        <div className="w-6 h-6 bg-brand-emerald rounded-full flex items-center justify-center">
                          <IconCheck className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    )}
                    {!grouped && !isOwn && (
                      <span className="text-[10px] font-medium text-gray-500 mb-0.5 ml-1">
                        {msgSender?.display_name || 'User'}
                      </span>
                    )}
                    {/* Reply preview */}
                    {msg.reply_to && (
                      <div className={`text-[11px] px-3 py-1.5 rounded-t-lg border-l-2 border-brand-emerald mb-0.5 ${isOwn ? 'bg-emerald-50' : 'bg-black/5'} max-w-[200px] truncate`}>
                        <span className="font-medium text-[10px] text-brand-emerald">
                          {(msg.reply_to as any)?.sender?.display_name || 'User'}
                        </span>
                        <p className="text-gray-500 truncate">{(msg.reply_to as any)?.content || ''}</p>
                      </div>
                    )}
                    {editingMsg === msg.id ? (
                      <div className="flex gap-2">
                        <input type="text" value={editText} onChange={e => setEditText(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-brand-emerald rounded-xl text-sm focus:outline-none" autoFocus />
                        <button onClick={() => handleEdit(msg.id)} className="text-brand-emerald text-sm font-medium">Save</button>
                        <button onClick={() => { setEditingMsg(null); setEditText(''); }} className="text-gray-400 text-sm">Cancel</button>
                      </div>
                    ) : isDeleted ? (
                      <div className={`text-xs italic px-3.5 py-2 ${isOwn ? 'text-white/50' : 'text-gray-400'}`}>
                        This message was deleted
                      </div>
                    ) : (
                      <div className={`relative group ${isOwn ? 'bg-gradient-to-r from-brand-emerald to-emerald-500 text-white rounded-2xl rounded-br-md' : 'bg-white border border-black/5 text-gray-800 rounded-2xl rounded-bl-md shadow-sm'} px-3.5 py-2`}>
                        {customContent ? customContent : (
                          msg.content && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          )
                        )}
                        {!customContent && (
                          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                              {timeAgo(msg.created_at)}
                            </span>
                            {isOwn && <IconCheck className="w-3 h-3 text-emerald-300" />}
                            {msg.is_pinned && <IconPin className="w-3 h-3 text-yellow-400" />}
                            {msg.is_edited && !isDeleted && (
                              <span className={`text-[9px] ${isOwn ? 'text-white/50' : 'text-gray-400'}`}>(edited)</span>
                            )}
                          </div>
                        )}
                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex flex-wrap gap-0.5 mt-1 -mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                              <span key={emoji} className="text-xs bg-white/90 rounded-full px-1.5 py-0.5 shadow-sm border border-black/5">
                                {emoji} {msg.reactions!.filter(r => r.emoji === emoji).length}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Hover actions */}
                        <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full -ml-1' : 'right-0 translate-x-full mr-1'} hidden group-hover:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button onClick={(e) => { e.stopPropagation(); setReplyTo({ id: msg.id, content: msg.content || '', sender: msgSender?.display_name || 'User' }); inputRef.current?.focus(); }}
                            className="p-1 bg-white rounded-full shadow-md border border-black/5 hover:bg-gray-50">
                            <IconArrowBackUp className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowMsgMenu(showMsgMenu === msg.id ? null : msg.id); }}
                              className="p-1 bg-white rounded-full shadow-md border border-black/5 hover:bg-gray-50">
                              <IconDotsVertical className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                            <AnimatePresence>
                              {showMsgMenu === msg.id && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                  className={`absolute top-full mt-1 ${isOwn ? 'left-0' : 'right-0'} w-40 bg-white rounded-xl shadow-xl border border-black/10 py-1 z-30`}>
                                  {isOwn && (
                                    <button onClick={() => { setShowMsgMenu(null); setEditingMsg(msg.id); setEditText(msg.content || ''); }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconEdit className="w-3.5 h-3.5" /> Edit</button>
                                  )}
                                  <button onClick={() => handleCopy(msg.content)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconCopy className="w-3.5 h-3.5" /> Copy</button>
                                  <button onClick={() => handlePin(msg.id)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconPin className="w-3.5 h-3.5" /> {msg.is_pinned ? 'Unpin' : 'Pin'}</button>
                                  <button onClick={() => { setShowMsgMenu(null); setReplyTo({ id: msg.id, content: msg.content || '', sender: msgSender?.display_name || 'User' }); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconArrowForwardUp className="w-3.5 h-3.5" /> Forward</button>
                                  <button onClick={() => { setShowMsgMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconBookmark className="w-3.5 h-3.5" /> Bookmark</button>
                                  {(isOwn || isAdmin) && (
                                    <hr className="my-1 border-black/5" />
                                  )}
                                  {isOwn && (
                                    <button onClick={() => handleDelete(msg.id, false)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 text-red-600"><IconTrash className="w-3.5 h-3.5" /> Delete for me</button>
                                  )}
                                  {isOwn && (
                                    <button onClick={() => handleDelete(msg.id, true)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 text-red-600"><IconTrash className="w-3.5 h-3.5" /> Delete for everyone</button>
                                  )}
                                  {isAdmin && !isOwn && (
                                    <button onClick={() => handleDelete(msg.id, true)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 text-red-600"><IconX className="w-3.5 h-3.5" /> Remove (admin)</button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, prompt('Enter emoji:') || '👍'); }}
                            className="p-1 bg-white rounded-full shadow-md border border-black/5 hover:bg-gray-50">
                            <IconMoodSmile className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Multi-select action bar */}
      <AnimatePresence>
        {selectedMessages.size > 0 && (
          <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
            className="sticky bottom-0 z-20 bg-white border-t border-black/5 px-4 py-3 flex items-center gap-3 shadow-lg">
            <span className="text-sm font-medium text-gray-600">{selectedMessages.size} selected</span>
            <div className="flex-1" />
            <button onClick={handleMultiDelete} className="p-2 rounded-full hover:bg-red-50 text-red-500" title="Delete selected">
              <IconTrash className="w-4 h-4" />
            </button>
            <button onClick={handleMultiForward} className="p-2 rounded-full hover:bg-black/5" title="Forward selected">
              <IconArrowForwardUp className="w-4 h-4" />
            </button>
            <button onClick={handleMultiBookmark} className="p-2 rounded-full hover:bg-black/5" title="Bookmark selected">
              <IconBookmark className="w-4 h-4" />
            </button>
            <button onClick={() => setSelectedMessages(new Set())} className="p-2 rounded-full hover:bg-black/5" title="Clear selection">
              <IconX className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply indicator */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
            className="sticky bottom-0 z-10 bg-gray-50 border-t border-black/5 px-4 py-2 flex items-center gap-2">
            <IconArrowBackUp className="w-4 h-4 text-brand-emerald flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-brand-emerald">Replying to {replyTo.sender}</p>
              <p className="text-[11px] text-gray-500 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-black/5 rounded-full">
              <IconX className="w-4 h-4 text-gray-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-black/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Emoji toggle */}
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors flex-shrink-0">
            <IconMoodSmile className="w-5 h-5 text-gray-500" />
          </button>
          {/* Attachment */}
          <button onClick={handleFilePick} className="p-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors flex-shrink-0">
            <IconPaperclip className="w-5 h-5 text-gray-500" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*,.pdf,.doc,.docx,.gpx,.kml" />
          {/* Voice */}
          <button onClick={handleVoice} className="p-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors flex-shrink-0">
            <IconMicrophone className="w-5 h-5 text-gray-500" />
          </button>
          {/* Location */}
          <button onClick={handleShareLocation} className="p-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors flex-shrink-0">
            <IconMapPin className="w-5 h-5 text-gray-500" />
          </button>
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-2.5 bg-black/5 border border-black/10 rounded-2xl text-sm focus:outline-none focus:border-brand-emerald transition-colors"
          />
          {/* More */}
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowActionSheet(!showActionSheet)} className="p-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors">
              <IconPlus className="w-5 h-5 text-gray-500" />
            </button>
            <ActionSheet
              isOpen={showActionSheet}
              onClose={() => setShowActionSheet(false)}
              sections={[
                {
                  title: 'Media', emoji: '📷',
                  items: [
                    { icon: IconCamera, label: 'Camera', onClick: handleAttachCamera },
                    { icon: IconPhoto, label: 'Gallery', onClick: handleFilePick },
                    { icon: IconVideo, label: 'Video', onClick: handleAttachCamera },
                    { icon: IconFile, label: 'Documents', onClick: handleFilePick },
                  ],
                },
                {
                  title: 'Trekking', emoji: '🏔',
                  items: [
                    { icon: IconNavigation, label: 'Live Trek', onClick: handleLiveTrekToggle },
                    { icon: IconRoute, label: 'Route', onClick: handleAttachRoute },
                    { icon: IconFlag, label: 'Waypoint', onClick: handleAttachWaypoint },
                    { icon: IconMap, label: 'Journey Plan', onClick: () => alert('Journey plan coming soon') },
                    { icon: IconMountain, label: 'Expedition', onClick: () => alert('Expedition sharing coming soon') },
                    { icon: IconBook, label: 'Adventure Log', onClick: () => alert('Adventure log coming soon') },
                    { icon: IconPhoto, label: 'Album', onClick: handleAlbumSend },
                    { icon: IconUserPlus, label: 'Invite', onClick: () => alert('Expedition invite coming soon') },
                  ],
                },
                {
                  title: 'Location', emoji: '🗺',
                  items: [
                    { icon: IconCurrentLocation, label: 'My Location', onClick: handleShareLocation },
                    { icon: IconRadio, label: 'Live Location', onClick: () => alert('Live location coming soon') },
                    { icon: IconCampfire, label: 'Nearby Camps', onClick: () => alert('Nearby camps coming soon') },
                    { icon: IconDroplet, label: 'Water Sources', onClick: () => alert('Water sources coming soon') },
                  ],
                },
                {
                  title: 'Weather', emoji: '🌦',
                  items: [
                    { icon: IconCloud, label: 'Current', onClick: handleWeatherShare },
                    { icon: IconCloudRain, label: 'Forecast', onClick: () => alert('Forecast coming soon') },
                    { icon: IconAlertTriangle, label: 'Trail Conditions', onClick: () => alert('Trail conditions coming soon') },
                  ],
                },
                {
                  title: 'Group', emoji: '👥',
                  items: [
                    { icon: IconReportAnalytics, label: 'Poll', onClick: () => alert('Polls coming soon') },
                    { icon: IconCalendarEvent, label: 'Event', onClick: () => alert('Events coming soon') },
                    { icon: IconCheck, label: 'Checklist', onClick: () => alert('Shared checklists coming soon') },
                    { icon: IconCurrencyDollar, label: 'Expense', onClick: () => alert('Expense split coming soon') },
                  ],
                },
                {
                  title: 'Safety', emoji: '🚨',
                  items: [
                    { icon: IconLifebuoy, label: 'SOS', color: '#dc2626', onClick: handleSos },
                    { icon: IconRadio, label: 'Emergency', onClick: handleAttachEmergency },
                    { icon: IconHeartbeat, label: 'Medical', onClick: () => alert('Medical assistance coming soon') },
                  ],
                },
              ]}
            />
          </div>
          {/* Send */}
          <button onClick={handleSend} disabled={!text.trim()}
            className="p-2.5 bg-brand-emerald text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
            <IconSend className="w-4 h-4" />
          </button>
        </div>
        {/* Voice recorder */}
        <AnimatePresence>
          {showVoiceRecorder && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-2"><VoiceRecorder onSend={handleVoiceSend} onClose={() => setShowVoiceRecorder(false)} /></div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-black/10 p-3 z-20">
              <div className="flex flex-wrap gap-1">
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji} onClick={() => { setText(prev => prev + emoji); setShowEmoji(false); inputRef.current?.focus(); }}
                    className="w-10 h-10 flex items-center justify-center text-xl hover:bg-black/5 rounded-lg transition-colors">
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
