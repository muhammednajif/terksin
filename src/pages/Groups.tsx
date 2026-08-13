import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  IconUsers, IconPlus, IconSearch, IconX, IconMessage, IconChevronRight,
  IconUserCircle, IconMountain, IconBell, IconCheck,
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserGroups } from '@/lib/groups';
import { subscribeToGroupList } from '@/lib/groups';
import type { Group } from '@/lib/database.types';
import { GroupChatView } from './GroupChatView';
import { CreateGroup } from './CreateGroup';

export function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'expeditions'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [listUnread, setListUnread] = useState(0);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    const gs = await fetchUserGroups(user.id);
    setGroups(gs);
    setLoading(false);
    setListUnread(gs.reduce((sum, g) => sum + (g.unread_count || 0), 0));
  }, [user]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    if (!user) return;
    const sub = subscribeToGroupList(user.id, loadGroups);
    return () => { sub.unsubscribe(); };
  }, [user, loadGroups]);

  const filtered = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'my') return matchesSearch && g.group_type === 'user';
    if (activeTab === 'expeditions') return matchesSearch && g.group_type === 'expedition';
    return matchesSearch;
  });

  const handleSelect = (g: Group) => {
    setActiveGroup(g);
    setMobileView('chat');
  };

  const handleBack = () => {
    setMobileView('list');
    setActiveGroup(null);
  };

  const tabs = [
    { key: 'all' as const, label: 'All Groups' },
    { key: 'my' as const, label: 'My Groups' },
    { key: 'expeditions' as const, label: 'Expeditions' },
  ];

  if (!user) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <IconUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign in to see your groups</h2>
          <p className="text-sm text-gray-500 mb-4">Create or join trekking groups and expeditions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex bg-white">
      {/* Sidebar */}
      <div className={`w-full md:w-[380px] flex-shrink-0 border-r border-black/5 flex flex-col bg-gray-50/50 ${
        mobileView === 'chat' ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="p-4 pb-3 border-b border-black/5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Groups</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Group</span>
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search groups..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <IconX className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-1 border-b border-black/5">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab.key ? 'bg-brand-emerald text-white' : 'text-gray-500 hover:bg-black/5'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <IconUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">
                {search ? 'No groups match your search' : 'No groups yet'}
              </p>
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-brand-emerald text-white text-sm font-semibold rounded-xl">
                Create your first group
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map(g => (
                <motion.button
                  key={g.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  layout
                  onClick={() => handleSelect(g)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] ${
                    activeGroup?.id === g.id ? 'bg-brand-emerald/5 border-r-2 border-brand-emerald' : ''
                  }`}
                >
                  {/* Avatar */}
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
                  {/* Info */}
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
      </div>

      {/* Chat Area */}
      <div className={`flex-1 min-w-0 ${
        mobileView === 'list' ? 'hidden md:flex' : 'flex'
      } flex-col`}>
        {activeGroup ? (
          <GroupChatView
            group={activeGroup}
            userId={user.id}
            onBack={handleBack}
            onGroupUpdated={loadGroups}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
            <div className="text-center px-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-emerald/20 to-emerald-100 flex items-center justify-center mx-auto mb-4">
                <IconUsers className="w-10 h-10 text-brand-emerald" />
              </div>
              <h3 className="text-xl font-bold mb-2">Select a Group</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Choose a group from the sidebar or create a new one to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <AnimatePresence>
        {showCreate && (
          <CreateGroup
            onClose={() => setShowCreate(false)}
            onCreated={(g) => {
              setShowCreate(false);
              handleSelect(g);
              loadGroups();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24); return `${d}d ago`;
}
