import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconPin, IconStar, IconArchive, IconMessage, IconUsers, IconChevronDown, IconDotsVertical, IconEdit } from '@tabler/icons-react';
import type { ChatConversation } from '@/lib/database.types';
import { BackButton } from '@/components/ui/BackButton';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeId: string | null;
  onSelect: (conv: ChatConversation) => void;
  userId: string;
  loading?: boolean;
  onNewChat?: () => void;
  onlineUserIds?: Set<string>;
}

type SectionKey = 'pinned' | 'favorites' | 'recent' | 'groups' | 'direct' | 'unread';

const sections: { key: SectionKey; label: string; icon: any; filter: (c: ChatConversation, userId: string) => boolean }[] = [
  { key: 'pinned', label: 'Pinned', icon: IconPin, filter: () => false },
  { key: 'favorites', label: 'Favorites', icon: IconStar, filter: () => false },
  { key: 'unread', label: 'Unread', icon: IconMessage, filter: (c, uid) => (c.unread_count || 0) > 0 },
  { key: 'recent', label: 'Recent', icon: IconMessage, filter: () => true },
  { key: 'groups', label: 'Trek Groups', icon: IconUsers, filter: (c) => c.is_group },
  { key: 'direct', label: 'Direct Messages', icon: IconMessage, filter: (c) => !c.is_group },
];

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24); if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString();
}

export function ChatSidebar({ conversations, activeId, onSelect, userId, loading, onNewChat, onlineUserIds }: ChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(new Set(['pinned', 'favorites', 'groups', 'direct']));

  const filtered = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => {
      if (c.title?.toLowerCase().includes(q)) return true;
      const matchParticipant = c.participants?.some(p =>
        (p as any).profile?.display_name?.toLowerCase().includes(q) ||
        (p as any).profile?.username?.toLowerCase().includes(q)
      );
      return matchParticipant;
    });
  }, [conversations, search]);

  const toggleSection = (key: SectionKey) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white/95 border-r border-black/5">
      {/* Header */}
      <div className="p-4 border-b border-black/5">
        <div className="flex items-center gap-2 mb-3">
          <BackButton />
          <h2 className="text-lg font-bold flex items-center gap-2 flex-1">
            <IconMessage className="w-5 h-5 text-brand-emerald" />
            Messages
          </h2>
          <button
            onClick={onNewChat}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            title="New Chat"
          >
            <IconEdit className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search conversations..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <IconMessage className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{search ? 'No conversations found' : 'No conversations yet'}</p>
            <p className="text-xs text-gray-400 mt-1">Start chatting with other trekkers!</p>
            {!search && onNewChat && (
              <button
                onClick={onNewChat}
                className="mt-4 px-4 py-2 bg-brand-emerald text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Start New Chat
              </button>
            )}
          </div>
        ) : (
          sections.map(section => {
            const items = section.key === 'recent' || section.key === 'groups' || section.key === 'direct'
              ? filtered.filter(c => section.filter(c, userId))
              : filtered.filter(c => section.filter(c, userId));

            if (items.length === 0) return null;

            if (search) {
              return items.map(conv => (
                <ConversationCard key={conv.id} conv={conv} activeId={activeId} onSelect={onSelect} userId={userId} onlineUserIds={onlineUserIds} />
              ));
            }

            return (
              <div key={section.key}>
                <button
                  onClick={() => toggleSection(section.key)}
                  className="flex items-center gap-1.5 w-full px-4 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                >
                  <motion.div animate={{ rotate: collapsedSections.has(section.key) ? -90 : 0 }} className="flex">
                    <IconChevronDown className="w-3 h-3" />
                  </motion.div>
                  <section.icon className="w-3 h-3" />
                  {section.label}
                  <span className="text-[10px] text-gray-400 ml-auto">{items.length}</span>
                </button>
                <AnimatePresence>
                  {!collapsedSections.has(section.key) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      {items.map(conv => (
                        <ConversationCard key={conv.id} conv={conv} activeId={activeId} onSelect={onSelect} userId={userId} onlineUserIds={onlineUserIds} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ConversationCard({ conv, activeId, onSelect, userId, onlineUserIds }: {
  conv: ChatConversation; activeId: string | null; onSelect: (c: ChatConversation) => void; userId: string; onlineUserIds?: Set<string>;
}) {
  const isActive = conv.id === activeId;
  const otherParticipants = conv.participants?.filter(p => p.user_id !== userId) || [];
  const otherProfile = otherParticipants[0] as any;
  const otherUserId = otherProfile?.user_id;
  const isOnline = otherUserId ? onlineUserIds?.has(otherUserId) : false;
  const displayName = conv.title || otherProfile?.profile?.display_name || otherProfile?.profile?.username || 'Unknown';
  const avatarUrl = otherProfile?.profile?.avatar_url;
  const lastMsg = conv.last_message as any;
  const isOwn = lastMsg?.sender_id === userId;

  return (
    <button
      onClick={() => onSelect(conv)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-black/5 ${
        isActive ? 'bg-brand-emerald/10 border-l-2 border-brand-emerald' : 'border-l-2 border-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-11 h-11 rounded-full overflow-hidden ${isActive ? 'ring-2 ring-brand-emerald' : ''}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center text-white font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-semibold truncate">{displayName}</span>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(conv.updated_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {lastMsg ? (
            <p className="text-xs text-gray-500 truncate flex-1">
              {isOwn && <span className="text-gray-400">You: </span>}
              {lastMsg.content || (lastMsg.message_type !== 'text' ? `[${lastMsg.message_type}]` : '')}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">No messages yet</p>
          )}
          {(conv.unread_count || 0) > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-emerald text-white text-[10px] font-bold rounded-full px-1">
              {conv.unread_count! > 9 ? '9+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
