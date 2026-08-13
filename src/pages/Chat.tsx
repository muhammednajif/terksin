import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { ChatSidebar } from '@/components/community/chat/ChatSidebar';
import { MessageArea } from '@/components/community/chat/MessageArea';
import { InfoPanel } from '@/components/community/chat/InfoPanel';
import { fetchConversations, fetchMessages, sendMessage, addReaction, subscribeToConversation, subscribeToConversationList, markAsRead, markMessagesAsRead, fetchReadReceipts } from '@/lib/chat';
import { fetchUserGroups, subscribeToGroupList } from '@/lib/groups';
import { GroupChatView } from './GroupChatView';
import { CreateGroup } from './CreateGroup';
import type { ChatConversation, ChatMessage, Profile, Group } from '@/lib/database.types';
import { IconSearch, IconX, IconUsers, IconMessage, IconPlus, IconChevronRight, IconMountain } from '@tabler/icons-react';

export function Chat() {
  const { user } = useAuth();
  const onlineUserIds = useStore(s => s.onlineUserIds);
  const setChatUnreadCount = useStore(s => s.setChatUnreadCount);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'messages' | 'groups'>(tabParam === 'groups' ? 'groups' : 'messages');

  useEffect(() => {
    if (tabParam === 'groups') setActiveTab('groups');
  }, [tabParam]);

  const switchTab = (tab: 'messages' | 'groups') => {
    setActiveTab(tab);
    setSearchParams(tab === 'groups' ? { tab: 'groups' } : {}, { replace: true });
  };

  // ─── Messages Tab State ───────────────────────────────
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readReceipts, setReadReceipts] = useState<Map<string, string>>(new Map());
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgPage, setMsgPage] = useState(0);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(true);
  const [showConvInfo, setShowConvInfo] = useState(false);
  const [mobileConvView, setMobileConvView] = useState<'list' | 'chat'>('list');
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Groups Tab State ───────────────────────────────
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupTab, setGroupTab] = useState<'all' | 'my' | 'expeditions'>('all');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [mobileGroupView, setMobileGroupView] = useState<'list' | 'chat'>('list');

  // ─── Messages: Load conversation list ───────────────
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const convs = await fetchConversations(user.id);
    setConversations(convs);
    setLoadingList(false);
    const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    setChatUnreadCount(total);
  }, [user, setChatUnreadCount]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!user) return;
    const sub = subscribeToConversationList(user.id, loadConversations);
    return () => { sub.unsubscribe(); };
  }, [user, loadConversations]);

  // ─── Messages: Load messages when conversation selected ──
  const loadMessages = useCallback(async (convId: string, pg = 0) => {
    setLoadingMsgs(true);
    const result = await fetchMessages(convId, pg);
    if (pg === 0) setMessages(result.messages);
    else setMessages(prev => [...result.messages, ...prev]);
    setHasMoreMsgs(result.hasMore);
    setMsgPage(pg);
    setLoadingMsgs(false);
    if (pg === 0 && user) {
      const otherMsgs = result.messages.filter(m => m.sender_id !== user.id).map(m => m.id);
      if (otherMsgs.length > 0) await markMessagesAsRead(otherMsgs, user.id);
      const receipts = await fetchReadReceipts(result.messages.map(m => m.id));
      setReadReceipts(receipts);
    }
  }, [user]);

  const handleSelectConv = async (conv: ChatConversation) => {
    setActiveConv(conv);
    setMobileConvView('chat');
    await loadMessages(conv.id, 0);
    if (user) {
      await markAsRead(conv.id, user.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      await loadConversations();
    }
  };

  useEffect(() => {
    if (!activeConv || !user) return;
    const sub = subscribeToConversation(activeConv.id, async (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.sender_id !== user.id) {
        await markMessagesAsRead([msg.id], user.id);
        await markAsRead(activeConv.id, user.id);
        const receipts = await fetchReadReceipts([msg.id]);
        if (receipts.size > 0) setReadReceipts(prev => new Map([...prev, ...receipts]));
      }
    });
    return () => { sub.unsubscribe(); };
  }, [activeConv, user]);

  const handleSend = async (text: string, replyToId?: string | null) => {
    if (!user || !activeConv) return;
    const msg = await sendMessage(activeConv.id, user.id, text, 'text', replyToId);
    if (msg) {
      setMessages(prev => [...prev, msg]);
      const receipts = await fetchReadReceipts([msg.id]);
      if (receipts.size > 0) setReadReceipts(prev => new Map([...prev, ...receipts]));
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    await addReaction(msgId, user.id, emoji);
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, reactions: [...(m.reactions || []), { message_id: msgId, user_id: user.id, emoji, created_at: new Date().toISOString() }] }
        : m
    ));
  };

  const handleLoadMore = () => {
    if (activeConv && hasMoreMsgs) loadMessages(activeConv.id, msgPage + 1);
  };

  const handleConvBack = () => {
    setMobileConvView('list');
    setActiveConv(null);
  };

  // ─── Messages: New Chat ────────────────────────────
  const openNewChat = () => {
    setShowNewChat(true);
    setUserSearch('');
    setSearchResults([]);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (!userSearch.trim() || !user) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const q = userSearch.trim();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(20);
      setSearchResults((data || []) as Profile[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, user]);

  const handleStartConversation = async (otherUserId: string) => {
    if (!user) return;
    try {
      const { data: convId, error: rpcErr } = await supabase.rpc('create_direct_conversation', { other_user_id: otherUserId });
      if (rpcErr || !convId) { setShowNewChat(false); return; }
      setShowNewChat(false);
      const { data: conv } = await supabase.from('chat_conversations').select('*').eq('id', convId).single() as any;
      const { data: participants } = await supabase.rpc('get_conversation_participants', { conv_id: convId }) as any;
      if (conv) {
        handleSelectConv({ ...conv, participants: (participants as any[]) || [], last_message: null, unread_count: 0 });
      }
      fetchConversations(user.id).then(setConversations).catch(console.error);
    } catch { setShowNewChat(false); }
  };

  // ─── Groups: Load groups ───────────────────────────
  const loadGroups = useCallback(async () => {
    if (!user) return;
    const gs = await fetchUserGroups(user.id);
    setGroups(gs);
    setLoadingGroups(false);
  }, [user]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    if (!user) return;
    const sub = subscribeToGroupList(user.id, loadGroups);
    return () => { sub.unsubscribe(); };
  }, [user, loadGroups]);

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(groupSearch.toLowerCase());
    if (groupTab === 'my') return matchesSearch && g.group_type === 'user';
    if (groupTab === 'expeditions') return matchesSearch && g.group_type === 'expedition';
    return matchesSearch;
  });

  const handleGroupSelect = (g: Group) => {
    setActiveGroup(g);
    setMobileGroupView('chat');
  };

  const handleGroupBack = () => {
    setMobileGroupView('list');
    setActiveGroup(null);
  };

  const timeAgo = (date: string): string => {
    const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24); return `${d}d ago`;
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <IconMessage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign in to see your messages</h2>
          <p className="text-sm text-gray-500">Chat with trekkers and manage your groups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex bg-white">
      {/* Tabs sidebar */}
      <div className={`w-full md:w-[380px] flex-shrink-0 border-r border-black/5 flex flex-col bg-gray-50/50 ${
        activeTab === 'messages'
          ? (mobileConvView === 'chat' ? 'hidden md:flex' : 'flex')
          : (mobileGroupView === 'chat' ? 'hidden md:flex' : 'flex')
      }`}>
        {/* Tab bar */}
        <div className="flex border-b border-black/5 bg-white">
          <button
            onClick={() => switchTab('messages')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'messages' ? 'text-brand-emerald border-b-2 border-brand-emerald' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <IconMessage className="w-4 h-4" />
            Messages
          </button>
          <button
            onClick={() => switchTab('groups')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'groups' ? 'text-brand-emerald border-b-2 border-brand-emerald' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <IconUsers className="w-4 h-4" />
            Groups
          </button>
        </div>

        {/* Messages Tab Content */}
        {activeTab === 'messages' && (
          <ChatSidebar
            conversations={conversations}
            activeId={activeConv?.id || null}
            onSelect={handleSelectConv}
            userId={user.id}
            loading={loadingList}
            onNewChat={openNewChat}
            onlineUserIds={onlineUserIds}
          />
        )}

        {/* Groups Tab Content */}
        {activeTab === 'groups' && (
          <>
            {/* Groups Header */}
            <div className="p-4 pb-3 border-b border-black/5">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-bold">Groups</h1>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  <IconPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create</span>
                </button>
              </div>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" placeholder="Search groups..."
                  value={groupSearch} onChange={e => setGroupSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors"
                />
                {groupSearch && (
                  <button onClick={() => setGroupSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <IconX className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Group tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-1 border-b border-black/5">
              {(['all', 'my', 'expeditions'] as const).map(tab => (
                <button key={tab} onClick={() => setGroupTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                    groupTab === tab ? 'bg-brand-emerald text-white' : 'text-gray-500 hover:bg-black/5'
                  }`}>
                  {tab === 'all' ? 'All Groups' : tab === 'my' ? 'My Groups' : 'Expeditions'}
                </button>
              ))}
            </div>

            {/* Group List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loadingGroups ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <IconUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">
                    {groupSearch ? 'No groups match your search' : 'No groups yet'}
                  </p>
                  <button onClick={() => setShowCreateGroup(true)}
                    className="px-4 py-2 bg-brand-emerald text-white text-sm font-semibold rounded-xl">
                    Create your first group
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredGroups.map(g => (
                    <motion.button
                      key={g.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      layout
                      onClick={() => handleGroupSelect(g)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] ${
                        activeGroup?.id === g.id ? 'bg-brand-emerald/5 border-r-2 border-brand-emerald' : ''
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-black/5">
                          {g.avatar_url ? (
                            <img src={g.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center text-white font-bold text-lg">
                              {g.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {(g.unread_count || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                            {g.unread_count! > 99 ? '99+' : g.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold truncate">{g.name}</h3>
                          {g.group_type === 'expedition' && (
                            <IconMountain className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {g.last_message
                            ? ((g.last_message as any)?.sender?.display_name || '') + ': ' + (g.last_message.content || '')
                            : g.description || 'No messages yet'}
                        </p>
                        {g.last_message && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {timeAgo(g.last_message.created_at)}
                          </p>
                        )}
                      </div>
                      <IconChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail Area */}
      <div className={`flex-1 min-w-0 flex flex-col ${
        activeTab === 'messages'
          ? (mobileConvView === 'list' ? 'hidden md:flex' : 'flex')
          : (mobileGroupView === 'list' ? 'hidden md:flex' : 'flex')
      }`}>
        {/* Messages Detail */}
        {activeTab === 'messages' && (
          activeConv ? (
            <MessageArea
              conversation={activeConv}
              messages={messages}
              onSend={handleSend}
              onBack={handleConvBack}
              userId={user.id}
              onReaction={handleReaction}
              loading={loadingMsgs}
              onLoadMore={handleLoadMore}
              hasMore={hasMoreMsgs}
              onlineUserIds={onlineUserIds}
              readReceipts={readReceipts}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
              <div className="text-center px-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-emerald/20 to-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <IconMessage className="w-10 h-10 text-brand-emerald" />
                </div>
                <h3 className="text-xl font-bold mb-2">Your Messages</h3>
                <p className="text-sm text-gray-500 max-w-sm">Select a conversation or start a new chat</p>
              </div>
            </div>
          )
        )}

        {/* Groups Detail */}
        {activeTab === 'groups' && (
          activeGroup ? (
            <GroupChatView
              group={activeGroup}
              userId={user.id}
              onBack={handleGroupBack}
              onGroupUpdated={loadGroups}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
              <div className="text-center px-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-emerald/20 to-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <IconUsers className="w-10 h-10 text-brand-emerald" />
                </div>
                <h3 className="text-xl font-bold mb-2">Select a Group</h3>
                <p className="text-sm text-gray-500 max-w-sm">Choose a group or create a new one</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Info Panel */}
      <InfoPanel
        conversation={activeConv}
        isOpen={showConvInfo}
        onClose={() => setShowConvInfo(false)}
        userId={user.id}
        onlineUserIds={onlineUserIds}
      />

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-black/5">
              <h3 className="text-base font-bold">New Chat</h3>
              <button onClick={() => setShowNewChat(false)} className="p-1.5 rounded-full hover:bg-black/5">
                <IconX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 pb-2">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input ref={searchRef} type="text" placeholder="Search trekkers..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {searching ? (
                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" /></div>
              ) : searchResults.length > 0 ? (
                searchResults.map(p => (
                  <button key={p.id} onClick={() => handleStartConversation(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 transition-colors text-left">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center text-white font-bold text-sm">
                          {(p.display_name || p.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.display_name || p.username || 'Unknown'}</p>
                      {p.display_name && p.username && <p className="text-xs text-gray-400">@{p.username}</p>}
                    </div>
                  </button>
                ))
              ) : userSearch.trim() ? (
                <p className="text-sm text-gray-400 text-center py-8">No trekkers found</p>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Type a name to search for trekkers</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Dialog */}
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroup
            onClose={() => setShowCreateGroup(false)}
            onCreated={(g) => {
              setShowCreateGroup(false);
              handleGroupSelect(g);
              loadGroups();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
