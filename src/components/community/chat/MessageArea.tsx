import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  IconSend, IconPaperclip, IconCamera, IconMapPin, IconMountain, IconGif, IconMicrophone, IconMoodSmile,
  IconChevronLeft, IconDotsVertical, IconPhone, IconVideo, IconSearch, IconPin, IconCheck, IconArrowBackUp,
  IconMessage, IconCopy, IconEdit, IconTrash, IconArrowForward, IconX, IconDownload, IconPlayerPlay, IconPlayerStop,
  IconMap, IconNavigation, IconCurrentLocation, IconStar, IconBookmark, IconAlertTriangle, IconBattery,
  IconClock, IconRoute, IconTarget, IconPhoto, IconFile, IconMusic, IconFlag, IconLifebuoy, IconRobot,
  IconCloud, IconAlbum, IconSticker, IconPlayerRecord, IconLocation,
  IconPlus, IconBook, IconUserPlus, IconCampfire, IconDroplet, IconCloudRain, IconReportAnalytics,
  IconCalendarEvent, IconHeartbeat, IconRadio,
} from '@tabler/icons-react';
import type {
  ChatConversation, ChatMessage, Profile, ChatLiveTrek, ChatSosAlert, ChatPollVote,
} from '@/lib/database.types';
import {
  searchMessages, emitTyping, editMessage, deleteForMe, deleteForEveryone, pinMessage, forwardMessage,
  uploadAttachment, starMessage, bookmarkMessage, removeBookmark, getWeatherForLocation,
  startLiveTrek, stopLiveTrek, startLiveLocation, stopLiveLocation, sendSosAlert,
} from '@/lib/chat';
import { LiveTrekCard } from './LiveTrekCard';
import { SOSAlert } from './SOSAlert';
import { ExpeditionAlbumCard } from './ExpeditionAlbumCard';
import { WeatherCard } from './WeatherCard';
import { PollView } from './PollView';
import { VoiceRecorder } from './VoiceRecorder';
import { WaypointPicker } from './WaypointPicker';
import { TrailReportForm } from './TrailReportForm';
import { MultiSelectBar } from './MultiSelectBar';
import { AIAssistant } from './AIAssistant';
import { ActionSheet } from './ActionSheet';

interface MessageAreaProps {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  onSend: (text: string, replyToId?: string | null) => void;
  onBack: () => void;
  userId: string;
  onReaction: (msgId: string, emoji: string) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onlineUserIds?: Set<string>;
  readReceipts?: Map<string, string>;
  onStartCall?: (type: 'voice' | 'video') => void;
  onStartLiveTrek?: () => void;
  onStopLiveTrek?: () => void;
  onStartLiveLocation?: (duration: string) => void;
  onStopLiveLocation?: () => void;
  onSendSos?: () => void;
  liveTrek?: ChatLiveTrek | null;
  activeSos?: ChatSosAlert | null;
  onAcknowledgeSos?: (id: string) => void;
  onResolveSos?: (id: string) => void;
  onVotePoll?: (pollId: string, optionIndex: number) => void;
  pollResults?: Record<string, ChatPollVote[]>;
  drafts?: Map<string, string>;
  onSendAlbum?: (files: File[], title: string) => void;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24); if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
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

function shouldGroupMessages(current: ChatMessage, previous?: ChatMessage): boolean {
  if (!previous) return false;
  if (current.sender_id !== previous.sender_id) return false;
  return new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() < 300000;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export function MessageArea({
  conversation, messages, onSend, onBack, userId, onReaction, loading, onLoadMore, hasMore,
  onlineUserIds, readReceipts, onStartCall, onStartLiveTrek, onStopLiveTrek, onStartLiveLocation,
  onStopLiveLocation, onSendSos, liveTrek, activeSos, onAcknowledgeSos, onResolveSos,
  onVotePoll, pollResults, drafts, onSendAlbum,
}: MessageAreaProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; sender: string } | null>(null);
  const [showMsgMenu, setShowMsgMenu] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showWaypointPicker, setShowWaypointPicker] = useState(false);
  const [showTrailReport, setShowTrailReport] = useState(false);
  const [showLiveLocationPicker, setShowLiveLocationPicker] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [liveTrekActive, setLiveTrekActive] = useState(!!liveTrek?.is_active);
  const [showSosModal, setShowSosModal] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length]);
  useEffect(() => { setLiveTrekActive(!!liveTrek?.is_active); }, [liveTrek]);

  useEffect(() => {
    const hasSos = messages.some(m => m.message_type === 'sos_alert');
    if (hasSos || activeSos) setShowSosModal(true);
  }, [messages, activeSos]);

  useEffect(() => {
    const saved = drafts?.get(conversation?.id || '');
    if (saved && !text) setText(saved);
  }, [conversation?.id, drafts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); setSearchOpen(true); }
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); setShowEmoji(true); }
      if (e.ctrlKey && e.shiftKey && e.key === 'M') { e.preventDefault(); }
      if (e.key === 'Escape') { setShowMsgMenu(null); setShowContextMenu(false); setSearchOpen(false); setShowEmoji(false); setShowCamera(false); setShowWaypointPicker(false); setShowTrailReport(false); setShowLiveLocationPicker(false); setShowAIAssistant(false); setShowAlbumPicker(false); setShowVoiceRecorder(false); setShowActionSheet(false); setEditingMsg(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), replyTo?.id);
    setText('');
    setReplyTo(null);
    setEditingMsg(null);
    if (conversation) emitTyping(conversation.id, userId, false);
  };

  const handleEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    await editMessage(msgId, editText.trim());
    setEditingMsg(null);
    setEditText('');
  };

  const handleDeleteForMe = async (msgId: string) => {
    await deleteForMe(msgId, userId);
    setShowMsgMenu(null);
  };

  const handleDeleteForEveryone = async (msgId: string) => {
    await deleteForEveryone(msgId, userId);
    setShowMsgMenu(null);
  };

  const handlePin = async (msgId: string) => {
    if (!conversation) return;
    await pinMessage(msgId, conversation.id, userId);
    setShowMsgMenu(null);
  };

  const handleForward = async (msg: ChatMessage) => {
    const convId = prompt('Enter conversation ID to forward to:');
    if (!convId) return;
    await forwardMessage(msg.id, convId, userId);
    setShowMsgMenu(null);
  };

  const handleCopy = (content: string | null) => {
    if (content) navigator.clipboard.writeText(content);
    setShowMsgMenu(null);
  };

  const handleStar = async (msgId: string) => {
    await starMessage(msgId, userId);
    setShowMsgMenu(null);
  };

  const handleBookmark = async (msgId: string) => {
    await bookmarkMessage(msgId, userId);
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
    if (conversation && e.target.value) {
      emitTyping(conversation.id, userId, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(conversation.id, userId, false);
      }, 2000);
    } else if (conversation) {
      emitTyping(conversation.id, userId, false);
    }
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    setUploading(true);
    setUploadProgress(0);
    const tempId = `temp-${Date.now()}`;
    await uploadAttachment(file, tempId, userId, setUploadProgress);
    setUploading(false);
    onSend(`📎 ${file.name}`, replyTo?.id);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (!conversation || !files.length) return;
    setUploading(true);
    for (const file of files) {
      const tempId = `temp-${Date.now()}`;
      await uploadAttachment(file, tempId, userId);
      onSend(`📎 ${file.name}`, replyTo?.id);
    }
    setUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || !conversation) return;
        setUploading(true);
        const tempId = `temp-${Date.now()}`;
        await uploadAttachment(file, tempId, userId);
        onSend('📷 Photo (pasted)', replyTo?.id);
        setUploading(false);
        return;
      }
    }
  };

  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch { alert('Camera not available'); }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/png'));
  };

  const sendPhoto = () => {
    if (capturedImage && conversation) {
      onSend('📷 Photo');
      setShowCamera(false);
      setCapturedImage(null);
      camStream?.getTracks().forEach(t => t.stop());
      setCamStream(null);
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
    setCapturedImage(null);
    camStream?.getTracks().forEach(t => t.stop());
    setCamStream(null);
  };

  const handleVoice = () => {
    setShowVoiceRecorder(!showVoiceRecorder);
  };

  const handleVoiceSend = (blob: Blob) => {
    onSend('🎤 Voice message', replyTo?.id);
    setShowVoiceRecorder(false);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        onSend(`📍 Location: ${url}`);
      },
      () => alert('Could not get location')
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !conversation) return;
    setSearching(true);
    const results = await searchMessages(conversation.id, searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const jumpToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('ring-2', 'ring-brand-emerald', 'rounded-2xl');
    setTimeout(() => el?.classList.remove('ring-2', 'ring-brand-emerald', 'rounded-2xl'), 2000);
  };

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

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => handleLongPress(msgId), 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleMultiDelete = async () => {
    for (const id of selectedMessages) await deleteForMe(id, userId);
    setSelectedMessages(new Set());
  };

  const handleMultiForward = () => {
    const convId = prompt('Enter conversation ID to forward to:');
    if (!convId) return;
    selectedMessages.forEach(id => forwardMessage(id, convId, userId));
    setSelectedMessages(new Set());
  };

  const handleMultiBookmark = () => {
    selectedMessages.forEach(id => bookmarkMessage(id, userId));
    setSelectedMessages(new Set());
  };

  const handleMultiClear = () => setSelectedMessages(new Set());

  const handleWaypointSelect = (type: any, title?: string, description?: string) => {
    onSend(`📍 Waypoint: ${type}${title ? ' - ' + title : ''}`, replyTo?.id);
    setShowWaypointPicker(false);
  };

  const handleTrailReportSend = (report: any) => {
    onSend(`📋 Trail report: ${report.type} - ${report.severity}: ${report.description}`, replyTo?.id);
    setShowTrailReport(false);
  };

  const handleWeatherShare = async () => {
    if (!navigator.geolocation) { alert('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const weather = await getWeatherForLocation(pos.coords.latitude, pos.coords.longitude);
      if (weather) {
        onSend(`🌤️ Weather: ${weather.temp}°C, ${weather.condition}`, replyTo?.id);
      } else {
        alert('Could not fetch weather');
      }
    }, () => alert('Could not get location'));
  };

  const handleAlbumSend = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*';
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length && onSendAlbum) {
        const title = prompt('Album title:') || 'Expedition Album';
        onSendAlbum(files, title);
        onSend(`📸 Album: ${title} (${files.length} photos)`, replyTo?.id);
      }
    };
    input.click();
  };

  const handleLiveTrekToggle = () => {
    if (liveTrekActive) {
      onStopLiveTrek?.();
      setLiveTrekActive(false);
    } else {
      onStartLiveTrek?.();
      setLiveTrekActive(true);
    }
  };

  const handleLiveLocationStart = (duration: string) => {
    onStartLiveLocation?.(duration);
    setShowLiveLocationPicker(false);
  };

  const handleSos = () => {
    onSendSos?.();
    if (conversation) sendSosAlert(conversation.id, userId);
  };

  const handleAIAssistantInsert = (text: string) => {
    setText(text);
    setShowAIAssistant(false);
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center px-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-emerald/20 to-emerald-100 flex items-center justify-center mx-auto mb-4">
            <IconMessage className="w-10 h-10 text-brand-emerald" />
          </div>
          <h3 className="text-xl font-bold mb-2">Your Messages</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Select a conversation or start a new chat with fellow trekkers
          </p>
        </div>
      </div>
    );
  }

  const otherParticipants = conversation.participants?.filter(p => p.user_id !== userId) || [];
  const otherProfile = otherParticipants[0] as any;
  const otherUserId = otherProfile?.user_id;
  const isOnline = otherUserId ? onlineUserIds?.has(otherUserId) : false;
  const chatName = conversation.title || otherProfile?.profile?.display_name || otherProfile?.profile?.username || 'Chat';
  const chatAvatar = otherProfile?.profile?.avatar_url;

  const typingName = (uid: string) => {
    const p = conversation?.participants?.find(p => p.user_id === uid);
    return (p as any)?.profile?.display_name || (p as any)?.profile?.username || 'Someone';
  };

  const renderMessageContent = (msg: ChatMessage, isOwn: boolean) => {
    const type = msg.message_type;
    const meta = msg.metadata || {};

    if (type === 'live_trek') {
      return <LiveTrekCard trek={meta as any} userId={userId} conversationId={conversation!.id} onStart={() => onStartLiveTrek?.()} onStop={() => onStopLiveTrek?.()} />;
    }

    if (type === 'sos_alert') {
      const sosData: ChatSosAlert = {
        id: msg.id, user_id: msg.sender_id || '', conversation_id: conversation!.id,
        latitude: (meta as any).latitude || 0, longitude: (meta as any).longitude || 0,
        altitude: (meta as any).altitude || null, battery_pct: (meta as any).battery_pct || null,
        nearest_trail: (meta as any).nearest_trail || null, emergency_message: msg.content,
        status: 'active', acknowledged_by: [], resolved_at: null, created_at: msg.created_at,
      };
      return (
        <SOSAlert
          alert={sosData}
          userId={userId}
          onAcknowledge={(id) => onAcknowledgeSos?.(id)}
          onResolve={(id) => onResolveSos?.(id)}
          onClose={() => setShowSosModal(false)}
        />
      );
    }

    if (type === 'expedition_album') {
      return (
        <ExpeditionAlbumCard
          album={{
            id: msg.id, conversation_id: conversation!.id, user_id: msg.sender_id || '',
            title: (meta as any).title || 'Album', description: (meta as any).description || null,
            cover_url: (meta as any).cover_url || null, photo_count: (meta as any).photo_count || 0,
            journey_summary: (meta as any).journey_summary || null, created_at: msg.created_at, message_id: msg.id,
          }}
          media={(meta as any).media || []}
          onView={() => {}}
        />
      );
    }

    if (type === 'weather_card') {
      return (
        <WeatherCard
          temp={(meta as any).temp || 0}
          condition={(meta as any).condition || 'Unknown'}
          sunrise={(meta as any).sunrise || ''}
          sunset={(meta as any).sunset || ''}
          rainProb={(meta as any).rainProb || 0}
          windSpeed={(meta as any).windSpeed || 0}
          visibility={(meta as any).visibility || 0}
          location={(meta as any).location}
        />
      );
    }

    if (type === 'waypoint') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <IconFlag className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">{(meta as any).waypoint_type || 'Waypoint'}</span>
          </div>
          {(meta as any).title && <p className="text-sm font-medium">{(meta as any).title}</p>}
          <a href={`https://maps.google.com/?q=${(meta as any).latitude},${(meta as any).longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1 mt-1">
            <IconMap className="w-3 h-3" /> View on Map
          </a>
        </div>
      );
    }

    if (type === 'poll' && onVotePoll) {
      return (
        <div className="min-w-[260px]">
          <PollView
            poll={(meta as any)}
            votes={pollResults?.[(meta as any).id] || []}
            userId={userId}
            onVote={(idx) => onVotePoll?.((meta as any).id, idx)}
          />
        </div>
      );
    }

    if (type === 'call_log' || type === 'missed_call') {
      const callMeta = meta as any;
      return (
        <div className={`rounded-2xl p-3 flex items-center gap-3 ${type === 'missed_call' ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-black/5'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'missed_call' ? 'bg-red-100' : 'bg-brand-emerald/10'}`}>
            <IconPhone className={`w-5 h-5 ${type === 'missed_call' ? 'text-red-500' : 'text-brand-emerald'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{type === 'missed_call' ? 'Missed Call' : 'Call'}</p>
            <p className="text-xs text-gray-500">
              {callMeta.call_type || 'voice'} · {callMeta.duration_seconds ? formatDuration(callMeta.duration_seconds) : 'No duration'}
            </p>
          </div>
          {callMeta.status && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${callMeta.status === 'missed' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {callMeta.status}
            </span>
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
            <div className="flex-1">
              <div className="flex gap-0.5 items-end h-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-1 bg-purple-400 rounded-full"
                    style={{ height: `${Math.max(4, Math.sin(i * 0.8 + Date.now() * 0.001) * 12 + 12)}px` }} />
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{(meta as any).duration || '0:00'}</p>
            </div>
          </div>
        </div>
      );
    }

    if (['gpx', 'kml', 'route_share', 'gpx_route'].includes(type)) {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-emerald-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <IconRoute className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">{(meta as any).name || type.toUpperCase()}</span>
          </div>
          <p className="text-xs text-gray-600">{(meta as any).distance || '?'} km</p>
          <div className="flex gap-2 mt-2">
            {(meta as any).file_url && (
              <a href={(meta as any).file_url} download className="text-xs text-blue-600 underline flex items-center gap-1">
                <IconDownload className="w-3 h-3" /> Download
              </a>
            )}
            {(meta as any).latitude && (
              <a href={`https://maps.google.com/?q=${(meta as any).latitude},${(meta as any).longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1">
                <IconMap className="w-3 h-3" /> View on Map
              </a>
            )}
          </div>
        </div>
      );
    }

    if (type === 'live_location') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-3 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <IconCurrentLocation className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">Live Location</span>
          </div>
          <p className="text-xs text-gray-600">
            {(meta as any).latitude?.toFixed(4)}, {(meta as any).longitude?.toFixed(4)}
          </p>
          <a href={`https://maps.google.com/?q=${(meta as any).latitude},${(meta as any).longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1 mt-1">
            <IconMap className="w-3 h-3" /> View on Map
          </a>
          {(meta as any).battery_pct && (
            <div className="flex items-center gap-1 mt-1">
              <IconBattery className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500">{(meta as any).battery_pct}%</span>
            </div>
          )}
        </div>
      );
    }

    if (type === 'live_checkpoint') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-3">
          <div className="flex items-center gap-2">
            <IconTarget className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-xs font-semibold text-emerald-800">{(meta as any).name || 'Checkpoint'}</span>
              {(meta as any).checkpoint_type && (
                <span className="text-[10px] text-emerald-600 ml-1">({(meta as any).checkpoint_type})</span>
              )}
            </div>
          </div>
          {(meta as any).eta && <p className="text-xs text-gray-600 mt-1">ETA: {new Date((meta as any).eta).toLocaleTimeString()}</p>}
          {(meta as any).notes && <p className="text-xs text-gray-500 mt-0.5">{(meta as any).notes}</p>}
        </div>
      );
    }

    if (type === 'journey_card') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 border border-amber-200 p-3 min-w-[200px]">
          <h4 className="font-bold text-sm">{(meta as any).title || 'Journey'}</h4>
          <div className="flex gap-3 mt-2 text-xs text-gray-600">
            {(meta as any).difficulty && (
              <span className="flex items-center gap-1">
                <IconMountain className="w-3 h-3" /> {(meta as any).difficulty}
              </span>
            )}
            {(meta as any).duration && (
              <span className="flex items-center gap-1">
                <IconClock className="w-3 h-3" /> {(meta as any).duration}
              </span>
            )}
            {(meta as any).distance && (
              <span className="flex items-center gap-1">
                <IconNavigation className="w-3 h-3" /> {(meta as any).distance} km
              </span>
            )}
          </div>
        </div>
      );
    }

    if (type === 'trail_card') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-emerald-200 p-3 min-w-[200px]">
          <h4 className="font-bold text-sm">{(meta as any).name || 'Trail'}</h4>
          {(meta as any).difficulty && <p className="text-xs text-gray-500">Difficulty: {(meta as any).difficulty}</p>}
          {(meta as any).length && <p className="text-xs text-gray-500">Length: {(meta as any).length} km</p>}
          {(meta as any).elevation_gain && <p className="text-xs text-gray-500">Elevation gain: {(meta as any).elevation_gain} m</p>}
        </div>
      );
    }

    if (type === 'document' || type === 'zip') {
      const isZip = type === 'zip';
      return (
        <div className="rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-black/10 p-3 min-w-[200px]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isZip ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <IconFile className={`w-5 h-5 ${isZip ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{(meta as any).file_name || msg.content || 'File'}</p>
              <p className="text-[10px] text-gray-500">{formatFileSize((meta as any).file_size || 0)}</p>
            </div>
            {(meta as any).file_url && (
              <a href={(meta as any).file_url} download className="p-2 bg-white rounded-full shadow-sm hover:shadow transition-shadow">
                <IconDownload className="w-4 h-4 text-brand-emerald" />
              </a>
            )}
          </div>
        </div>
      );
    }

    if (type === 'image' || type === 'video') {
      const isVideo = type === 'video';
      return (
        <div className="rounded-2xl overflow-hidden border border-black/5">
          {(meta as any).thumbnail_url || (meta as any).file_url ? (
            <div className="relative group cursor-pointer" onClick={() => setFullscreenMedia((meta as any).file_url || (meta as any).thumbnail_url)}>
              {isVideo ? (
                <video src={(meta as any).file_url} className="max-w-full max-h-64 object-cover rounded-2xl" controls />
              ) : (
                <img src={(meta as any).thumbnail_url || (meta as any).file_url} alt="" className="max-w-full max-h-64 object-cover rounded-2xl" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl flex items-center justify-center">
                <button className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 rounded-full transition-opacity">
                  <IconPhoto className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3">
              {isVideo ? <IconPlayerPlay className="w-5 h-5" /> : <IconPhoto className="w-5 h-5" />}
              <span className="text-sm">{msg.content}</span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50/50 relative">
      {/* Fullscreen media overlay */}
      <AnimatePresence>
        {fullscreenMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
            onClick={() => setFullscreenMedia(null)}>
            <img src={fullscreenMedia} className="max-w-full max-h-full object-contain" alt="" />
            <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white">
              <IconX className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Modal */}
      {activeSos?.status === 'active' && (
        <SOSAlert
          alert={activeSos}
          userId={userId}
          onAcknowledge={(id) => onAcknowledgeSos?.(id)}
          onResolve={(id) => onResolveSos?.(id)}
          onClose={() => setShowSosModal(false)}
        />
      )}

      {/* SOS Banner */}
      <AnimatePresence>
        {activeSos?.status === 'active' && !showSosModal && (
          <motion.div initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}
            className="sticky top-0 z-20 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 flex items-center gap-3">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
              <IconAlertTriangle className="w-5 h-5" />
            </motion.div>
            <span className="text-sm font-semibold flex-1">SOS Emergency in this conversation</span>
            <button onClick={() => setShowSosModal(true)} className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium hover:bg-white/30">
              View
            </button>
            <button onClick={() => setShowSosModal(false)} className="p-1 rounded-full hover:bg-white/20">
              <IconX className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col">
            <div className="relative flex-1">
              {capturedImage ? (
                <img src={capturedImage} className="w-full h-full object-contain" alt="captured" />
              ) : (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex items-center justify-center gap-6 p-4">
              {capturedImage ? (
                <>
                  <button onClick={() => setCapturedImage(null)} className="p-3 bg-white/20 rounded-full text-white"><IconX /></button>
                  <button onClick={sendPhoto} className="p-3 bg-brand-emerald rounded-full text-white"><IconCheck /></button>
                </>
              ) : (
                <>
                  <button onClick={closeCamera} className="p-3 bg-white/20 rounded-full text-white"><IconX /></button>
                  <button onClick={capturePhoto} className="p-4 bg-white rounded-full"><div className="w-8 h-8 border-2 border-black rounded-full" /></button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-black/5 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5 md:hidden">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-brand-emerald/20">
            {chatAvatar ? (
              <img src={chatAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center text-white font-bold">
                {chatName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{chatName}</h3>
          <p className={`text-[11px] font-medium ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onStartCall?.('voice')} className="p-2 rounded-full hover:bg-black/5 transition-colors" title="Voice call">
            <IconPhone className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => onStartCall?.('video')} className="p-2 rounded-full hover:bg-black/5 transition-colors" title="Video call">
            <IconVideo className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-full hover:bg-black/5 transition-colors" title="Search conversation">
            <IconSearch className="w-4 h-4 text-gray-600" />
          </button>
          <div className="relative">
            <button onClick={() => setShowContextMenu(!showContextMenu)} className="p-2 rounded-full hover:bg-black/5 transition-colors" title="More">
              <IconDotsVertical className="w-4 h-4 text-gray-600" />
            </button>
            <AnimatePresence>
              {showContextMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-black/10 py-1 z-20">
                  <button onClick={() => { setShowContextMenu(false); setSearchOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5"><IconSearch className="w-4 h-4" /> Search</button>
                  <button onClick={() => { setShowContextMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5"><IconPin className="w-4 h-4" /> Pinned messages</button>
                  <button onClick={() => { setShowContextMenu(false); setShowAIAssistant(true); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5"><IconRobot className="w-4 h-4" /> AI Assistant</button>
                  <hr className="my-1 border-black/5" />
                  <button onClick={() => { setShowContextMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5 text-red-600"><IconX className="w-4 h-4" /> Block user</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-black/5">
            <div className="p-3 flex gap-2">
              <input
                type="text" placeholder="Search messages..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                className="flex-1 px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald"
                autoFocus
              />
              <button onClick={handleSearch} className="px-3 py-2 bg-brand-emerald text-white text-sm rounded-xl font-medium">{searching ? '...' : 'Search'}</button>
              <button onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchQuery(''); }} className="p-2"><IconX className="w-4 h-4" /></button>
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto px-3 pb-3 space-y-1">
                {searchResults.map(m => (
                  <button key={m.id} onClick={() => jumpToMessage(m.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 text-sm truncate">
                    <span className="text-gray-400 text-xs">{timeAgo(m.created_at)}</span>{' '}
                    {m.content}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1 text-xs text-brand-emerald font-medium">
          {Array.from(typingUsers).map(u => typingName(u)).join(', ')} typing...
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin"
        onDrop={handleDrop} onDragOver={handleDragOver} onPaste={handlePaste}>
        {hasMore && (
          <button onClick={onLoadMore} className="w-full text-xs text-brand-emerald font-medium py-2 hover:underline text-center">
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
            No messages yet. Start a conversation!
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
            const isDeletedForMe = msg.deleted_for?.includes(userId);
            const isSelected = selectedMessages.has(msg.id);
            const customContent = renderMessageContent(msg, isOwn);

            if (isDeletedForMe) return null;

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} id={`msg-${msg.id}`}>
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
                    {/* Selection checkmark */}
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
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content.startsWith('http') ? (
                                <a href={msg.content} target="_blank" rel="noopener noreferrer" className="underline">{msg.content}</a>
                              ) : msg.content.startsWith('📍') ? (
                                <a href={msg.content.slice(12)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-300 underline">
                                  <IconMap className="w-4 h-4" /> View on Map
                                </a>
                              ) : msg.content.startsWith('📎') ? (
                                <span className="flex items-center gap-1"><IconPaperclip className="w-4 h-4" />{msg.content.slice(2)}</span>
                              ) : msg.content.startsWith('🎤') ? (
                                <span className="flex items-center gap-1"><IconPlayerPlay className="w-4 h-4" /> Voice message</span>
                              ) : msg.content.startsWith('📷') ? (
                                <span className="flex items-center gap-1"><IconCamera className="w-4 h-4" /> Photo</span>
                              ) : (
                                msg.content
                              )}
                            </p>
                          )
                        )}
                        {!customContent && (
                          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                              {timeAgo(msg.created_at)}
                            </span>
                            {isOwn && (
                              readReceipts?.has(msg.id)
                                ? <span className="text-[10px] text-blue-300 font-medium">Seen</span>
                                : <IconCheck className="w-3 h-3 text-emerald-300" />
                            )}
                            {msg.is_pinned && <IconPin className="w-3 h-3 text-yellow-400" />}
                            {msg.is_edited && !isDeleted && (
                              <span className={`text-[9px] ${isOwn ? 'text-white/50' : 'text-gray-400'}`}>(edited)</span>
                            )}
                          </div>
                        )}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex flex-wrap gap-0.5 mt-1 -mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                              <span key={emoji} className="text-xs bg-white/90 rounded-full px-1.5 py-0.5 shadow-sm border border-black/5">
                                {emoji} {msg.reactions!.filter(r => r.emoji === emoji).length}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Context menu on click */}
                        <AnimatePresence>
                          {showMsgMenu === msg.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                              className={`absolute top-0 ${isOwn ? 'right-0' : 'left-0'} -translate-y-full mt-1 bg-white rounded-xl shadow-xl border border-black/10 py-1 w-40 z-20`}>
                              <button onClick={() => { handleCopy(msg.content); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconCopy className="w-3.5 h-3.5" /> Copy</button>
                              <button onClick={() => { setReplyTo({ id: msg.id, content: msg.content || '', sender: msgSender?.display_name || 'User' }); setShowMsgMenu(null); inputRef.current?.focus(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconArrowBackUp className="w-3.5 h-3.5" /> Reply</button>
                              <button onClick={() => handleStar(msg.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconStar className="w-3.5 h-3.5" /> Star</button>
                              <button onClick={() => handleBookmark(msg.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconBookmark className="w-3.5 h-3.5" /> Bookmark</button>
                              {isOwn && (
                                <>
                                  <button onClick={() => { setEditingMsg(msg.id); setEditText(msg.content || ''); setShowMsgMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconEdit className="w-3.5 h-3.5" /> Edit</button>
                                  <button onClick={() => handlePin(msg.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconPin className="w-3.5 h-3.5" /> {msg.is_pinned ? 'Unpin' : 'Pin'}</button>
                                  <button onClick={() => handleDeleteForEveryone(msg.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 text-red-600"><IconTrash className="w-3.5 h-3.5" /> Delete for everyone</button>
                                </>
                              )}
                              <button onClick={() => handleDeleteForMe(msg.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 text-red-600"><IconX className="w-3.5 h-3.5" /> Delete for me</button>
                              <button onClick={() => handleForward(msg)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5"><IconArrowForward className="w-3.5 h-3.5" /> Forward</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <div className={`hidden group-hover:flex items-center gap-0.5 mt-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {EMOJI_LIST.map(emoji => (
                        <button key={emoji} onClick={() => { onReaction(msg.id, emoji); if (showMsgMenu === msg.id) setShowMsgMenu(null); }}
                          className="text-xs hover:scale-125 transition-transform p-0.5 rounded hover:bg-black/5">
                          {emoji}
                        </button>
                      ))}
                      <button onClick={() => { setShowMsgMenu(showMsgMenu === msg.id ? null : msg.id); }}
                        className="p-0.5 rounded hover:bg-black/5">
                        <IconDotsVertical className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-black/5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-brand-emerald">Replying to {replyTo.sender}</span>
            <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 rounded-full hover:bg-black/10">
            <IconX className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Uploading... {uploadProgress}%
          </div>
        </div>
      )}

      {/* Voice recorder */}
      <AnimatePresence>
        {showVoiceRecorder && (
          <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoiceRecorder(false)} />
        )}
      </AnimatePresence>

      {/* Waypoint picker modal */}
      <AnimatePresence>
        {showWaypointPicker && (
          <WaypointPicker onSelect={handleWaypointSelect} onClose={() => setShowWaypointPicker(false)} />
        )}
      </AnimatePresence>

      {/* Trail report form modal */}
      <AnimatePresence>
        {showTrailReport && (
          <TrailReportForm onSend={handleTrailReportSend} onClose={() => setShowTrailReport(false)} />
        )}
      </AnimatePresence>

      {/* Live location duration picker */}
      <AnimatePresence>
        {showLiveLocationPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLiveLocationPicker(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Share Live Location</h3>
              <div className="space-y-2">
                {[
                  { label: '15 minutes', value: '15min', icon: IconClock },
                  { label: '1 hour', value: '1hour', icon: IconClock },
                  { label: 'Until stopped', value: 'until_stopped', icon: IconCurrentLocation },
                ].map(opt => (
                  <button key={opt.value} onClick={() => handleLiveLocationStart(opt.value)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-black/5 hover:bg-black/10 transition-colors text-left">
                    <div className="w-10 h-10 rounded-full bg-brand-emerald/10 flex items-center justify-center">
                      <opt.icon className="w-5 h-5 text-brand-emerald" />
                    </div>
                    <span className="font-semibold text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowLiveLocationPicker(false)} className="w-full mt-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-black/5">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant panel */}
      <AnimatePresence>
        {showAIAssistant && conversation && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            className="absolute inset-y-0 right-0 w-full sm:w-80 z-30">
            <AIAssistant conversationId={conversation.id} messages={messages} onInsertText={handleAIAssistantInsert} onClose={() => setShowAIAssistant(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 py-3 border-t border-black/5 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder={'Message...'}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full pl-4 pr-[124px] py-3 bg-black/5 border border-black/10 rounded-2xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20 transition-all"
            />
            <div className="absolute right-1.5 bottom-1.5 flex items-center gap-0.5">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-1.5 rounded-full hover:bg-black/10 active:bg-black/20 transition-colors" title="Emoji">
                <IconMoodSmile className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={handleFilePick} className="p-1.5 rounded-full hover:bg-black/10 active:bg-black/20 transition-colors" title="Attach file">
                <IconPaperclip className="w-4 h-4 text-gray-500" />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <button onClick={handleVoice} className="p-1.5 rounded-full hover:bg-black/10 active:bg-black/20 transition-colors" title="Voice recording">
                <IconMicrophone className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={shareLocation} className="p-1.5 rounded-full hover:bg-black/10 active:bg-black/20 transition-colors" title="Share location">
                <IconMapPin className="w-4 h-4 text-gray-500" />
              </button>
              <div className="relative">
                <button onClick={() => setShowActionSheet(!showActionSheet)} className="p-1.5 rounded-full hover:bg-black/10 active:bg-black/20 transition-colors" title="More actions">
                  <IconPlus className="w-4 h-4 text-gray-500" />
                </button>
                <ActionSheet
                  isOpen={showActionSheet}
                  onClose={() => setShowActionSheet(false)}
                  sections={[
                    {
                      title: 'Media', emoji: '📷',
                      items: [
                        { icon: IconCamera, label: 'Camera', onClick: handleCamera },
                        { icon: IconPhoto, label: 'Gallery', onClick: handleFilePick },
                        { icon: IconVideo, label: 'Video', onClick: handleCamera },
                        { icon: IconFile, label: 'Documents', onClick: handleFilePick },
                      ],
                    },
                    {
                      title: 'Trekking', emoji: '🏔',
                      items: [
                        { icon: IconNavigation, label: 'Live Trek', color: liveTrekActive ? '#059669' : '#6b7280', onClick: handleLiveTrekToggle },
                        { icon: IconRoute, label: 'Route', onClick: () => alert('Route sharing coming soon') },
                        { icon: IconFlag, label: 'Waypoint', onClick: () => setShowWaypointPicker(true) },
                        { icon: IconMap, label: 'Journey Plan', onClick: () => alert('Journey plan coming soon') },
                        { icon: IconMountain, label: 'Expedition', onClick: () => alert('Expedition sharing coming soon') },
                        { icon: IconBook, label: 'Adventure Log', onClick: () => alert('Adventure log coming soon') },
                        { icon: IconAlbum, label: 'Album', onClick: handleAlbumSend },
                        { icon: IconUserPlus, label: 'Invite', onClick: () => alert('Expedition invite coming soon') },
                      ],
                    },
                    {
                      title: 'Location', emoji: '🗺',
                      items: [
                        { icon: IconCurrentLocation, label: 'My Location', onClick: shareLocation },
                        { icon: IconRadio, label: 'Live Location', onClick: () => setShowLiveLocationPicker(true) },
                        { icon: IconCampfire, label: 'Nearby Camps', onClick: () => alert('Nearby camps coming soon') },
                        { icon: IconDroplet, label: 'Water Sources', onClick: () => alert('Water sources coming soon') },
                      ],
                    },
                    {
                      title: 'Weather', emoji: '🌦',
                      items: [
                        { icon: IconCloud, label: 'Current', onClick: handleWeatherShare },
                        { icon: IconCloudRain, label: 'Forecast', onClick: () => alert('Forecast coming soon') },
                        { icon: IconAlertTriangle, label: 'Trail Conditions', onClick: () => setShowTrailReport(true) },
                      ],
                    },
                    {
                      title: 'Group', emoji: '👥',
                      items: [
                        { icon: IconReportAnalytics, label: 'Poll', onClick: () => alert('Polls coming soon') },
                        { icon: IconCalendarEvent, label: 'Event', onClick: () => alert('Events coming soon') },
                      ],
                    },
                    {
                      title: 'Safety', emoji: '🚨',
                      items: [
                        { icon: IconLifebuoy, label: 'SOS', color: '#dc2626', onClick: handleSos },
                        { icon: IconRadio, label: 'Emergency', onClick: () => alert('Emergency broadcast coming soon') },
                        { icon: IconHeartbeat, label: 'Medical', onClick: () => alert('Medical assistance coming soon') },
                      ],
                    },
                  ]}
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex-shrink-0 p-3 bg-gradient-to-r from-brand-emerald to-emerald-500 text-white rounded-full disabled:opacity-40 hover:shadow-lg hover:shadow-brand-emerald/30 transition-all active:scale-95"
          >
            <IconSend className="w-4 h-4" />
          </button>
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                {['👍','❤️','😂','😮','😢','🙏','🔥','🎉','⭐','👋','💪','🏔️','⛰️','🌄','🗺️','🧗','🚵','🏕️','⛺','🌲','💚','✨','🌟','💯','✅','❌','📷','🎥','🎵','📊','📝','🔔','📌','📍','⚠️','🚨','🆘','🏆','🥇','🥾','🧭','⚡','💬'].map(e => (
                  <button key={e} onClick={() => { setText(t => t + e); inputRef.current?.focus(); }}
                    className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Multi-select bar */}
      <MultiSelectBar
        selectedCount={selectedMessages.size}
        onDelete={handleMultiDelete}
        onForward={handleMultiForward}
        onBookmark={handleMultiBookmark}
        onClear={handleMultiClear}
      />
    </div>
  );
}
