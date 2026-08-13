import { supabase } from '@/lib/supabase';
import type {
  ChatConversation, ChatMessage, ChatReaction, Profile,
  ChatLiveTrek, ChatLiveLocation, ChatSosAlert, ChatWaypoint,
  ChatExpeditionAlbum, ChatAlbumMedia, ChatCheckpoint, ChatPoll,
  ChatPollVote, ChatCallLog, ChatInviteLink, ChatMention,
  ChatTrailReport, ChatBookmark, ChatDraft, ChatAttachment, ChatParticipant,
} from '@/lib/database.types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ─── Helpers ──────────────────────────────────────────
function getUserId(): string | null {
  return (supabase.auth.getSession() as any)?.user?.id || null;
}

function getParticipantIds(conv: ChatConversation): string[] {
  return (conv.participants || []).map(p => p.user_id);
}

// ─── Conversations ────────────────────────────────────

export async function fetchConversations(userId: string): Promise<ChatConversation[]> {
  const { data: participations } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('user_id', userId);

  if (!participations?.length) return [];

  const convIds = participations.map(p => p.conversation_id);
  const partsMap = new Map(participations.map(p => [p.conversation_id, p]));

  const { data: convs } = await supabase
    .from('chat_conversations')
    .select('*')
    .in('id', convIds)
    .order('updated_at', { ascending: false });

  if (!convs) return [];

  const conversations = await Promise.all(convs.map(async (conv) => {
    const { data: participants } = await supabase
      .rpc('get_conversation_participants', { conv_id: conv.id }) as any;

    const { data: lastMsg } = await supabase
      .from('chat_messages')
      .select('*, sender:profiles!chat_messages_sender_id_fkey(*)')
      .eq('conversation_id', conv.id)
      .or(`is_deleted.eq.false,deleted_for.cs.{${userId}}`)
      .order('created_at', { ascending: false })
      .limit(1) as any;

    const part = partsMap.get(conv.id);
    const lastRead = part?.last_read_at;
    let unreadCount = 0;
    if (lastMsg?.[0] && lastRead) {
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .gt('created_at', lastRead)
        .neq('sender_id', userId)
        .or(`is_deleted.eq.false,deleted_for.cs.{${userId}}`);
      unreadCount = count ?? 0;
    }

    const { data: draft } = await supabase
      .from('chat_drafts')
      .select('content, reply_to_id')
      .eq('user_id', userId)
      .eq('conversation_id', conv.id)
      .single();

    return {
      ...conv,
      participants: ((participants as any[]) || []).map(p => ({ ...p, profile: p.profile })),
      last_message: lastMsg?.[0] || null,
      unread_count: unreadCount,
      draft: draft?.content || null,
    } as ChatConversation;
  }));

  return conversations;
}

// ─── Messages ─────────────────────────────────────────

export async function fetchMessages(
  conversationId: string,
  page = 0,
  pageSize = 50
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const uid = getUserId();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*, sender:profiles!chat_messages_sender_id_fkey(*)')
    .eq('conversation_id', conversationId)
    .or(`is_deleted.eq.false,deleted_for.cs.{${uid}}`)
    .order('created_at', { ascending: false })
    .range(from, to) as any;

  if (!messages) return { messages: [], hasMore: false };

  const enriched = await Promise.all(messages.map(async (msg: ChatMessage) => {
    const { data: reactions } = await supabase
      .from('chat_reactions')
      .select('*, profile:profiles!chat_reactions_user_id_fkey(display_name, avatar_url)')
      .eq('message_id', msg.id) as any;

    let replyTo = null;
    if (msg.reply_to_id) {
      const { data: reply } = await supabase
        .from('chat_messages')
        .select('id, content, message_type, sender_id, created_at, sender:profiles!chat_messages_sender_id_fkey(display_name, avatar_url)')
        .eq('id', msg.reply_to_id)
        .single() as any;
      replyTo = reply;
    }

    return {
      ...msg,
      sender: (msg as any).sender,
      reactions: reactions || [],
      reply_to: replyTo,
    };
  }));

  return {
    messages: enriched.reverse(),
    hasMore: messages.length === pageSize,
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: ChatMessage['message_type'] = 'text',
  replyToId?: string | null,
  metadata?: Record<string, unknown>
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
      reply_to_id: replyToId || null,
      metadata: metadata || {},
    })
    .select('*, sender:profiles!chat_messages_sender_id_fkey(*)')
    .single() as any;

  if (error) { console.error('[Chat] sendMessage error:', error); return null; }
  return data ? { ...data, sender: (data as any).sender } : null;
}

// ─── Message Actions ─────────────────────────────────

export async function editMessage(messageId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ content, is_edited: true, updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', getUserId());
  return !error;
}

export async function deleteForMe(messageId: string, userId: string): Promise<boolean> {
  const { data: msg } = await supabase
    .from('chat_messages')
    .select('deleted_for')
    .eq('id', messageId)
    .single();
  const existing: string[] = (msg as any)?.deleted_for || [];
  const { error } = await supabase
    .from('chat_messages')
    .update({ deleted_for: [...existing, userId] })
    .eq('id', messageId);
  return !error;
}

export async function deleteForEveryone(messageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ content: null, is_deleted: true, message_type: 'text', updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', userId);
  return !error;
}

export async function pinMessage(messageId: string, conversationId: string): Promise<boolean> {
  const { data: msg } = await supabase
    .from('chat_messages')
    .select('is_pinned')
    .eq('id', messageId)
    .single();
  const isPinned = msg?.is_pinned ?? false;
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_pinned: !isPinned })
    .eq('id', messageId);
  if (!error) {
    await supabase.from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }
  return !error;
}

export async function forwardMessage(
  messageId: string,
  targetConversationId: string,
  userId: string
): Promise<ChatMessage | null> {
  const { data: original } = await supabase
    .from('chat_messages')
    .select('content, message_type, metadata')
    .eq('id', messageId)
    .single();
  if (!original) return null;
  return sendMessage(
    targetConversationId, userId, original.content || '',
    original.message_type, null,
    { ...original.metadata as any, forwarded_from: messageId }
  );
}

export async function starMessage(messageId: string, userId: string): Promise<boolean> {
  const { data: msg } = await supabase
    .from('chat_messages')
    .select('is_starred')
    .eq('id', messageId)
    .single();
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_starred: !msg?.is_starred })
    .eq('id', messageId)
    .eq('sender_id', userId);
  return !error;
}

export async function bookmarkMessage(
  messageId: string,
  userId: string,
  label?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_bookmarks')
    .upsert({ message_id: messageId, user_id: userId, label: label || null },
      { onConflict: 'user_id,message_id' });
  return !error;
}

export async function removeBookmark(messageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_bookmarks')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId);
  return !error;
}

export async function getBookmarkedMessages(userId: string): Promise<ChatBookmark[]> {
  const { data } = await supabase
    .from('chat_bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function bulkDeleteMessages(
  messageIds: string[],
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_deleted: true, content: null })
    .in('id', messageIds)
    .eq('sender_id', userId);
  return !error;
}

// ─── Conversation Management ─────────────────────────

export async function startConversation(
  userIds: string[],
  title?: string,
  isGroup = false
): Promise<string | null> {
  const { data: conv, error } = await supabase
    .from('chat_conversations')
    .insert({ title: title || null, is_group: isGroup, created_by: userIds[0] })
    .select()
    .single();

  if (error || !conv) { console.error('[Chat] create conversation error:', error); return null; }

  const participants = userIds.map((uid, i) => ({
    conversation_id: conv.id,
    user_id: uid,
    role: i === 0 ? 'leader' : 'member',
  }));

  const { error: pErr } = await supabase.from('chat_participants').insert(participants);
  if (pErr) { console.error('[Chat] add participants error:', pErr); return null; }

  return conv.id;
}

export async function toggleMute(
  conversationId: string, userId: string, muteHours?: number
): Promise<boolean> {
  const { data } = await supabase
    .from('chat_participants')
    .select('is_muted')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();
  const isMuted = data?.is_muted ?? false;
  const updates: any = { is_muted: !isMuted };
  if (!isMuted && muteHours) updates.mute_until = new Date(Date.now() + muteHours * 3600000).toISOString();
  const { error } = await supabase
    .from('chat_participants')
    .update(updates)
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  return !error;
}

export async function pinConversation(
  conversationId: string, userId: string, isPinned: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_participants')
    .update({ is_pinned: isPinned })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  return !error;
}

export async function archiveConversation(
  conversationId: string, userId: string, isArchived: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_participants')
    .update({ is_archived: isArchived })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  return !error;
}

export async function blockUser(userId: string, blockedUserId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_blocked_users')
    .insert({ user_id: userId, blocked_user_id: blockedUserId });
  return !error;
}

export async function unblockUser(userId: string, blockedUserId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_blocked_users')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_user_id', blockedUserId);
  return !error;
}

export async function clearChat(conversationId: string, userId: string): Promise<boolean> {
  const { data: msgs } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('conversation_id', conversationId);
  if (!msgs) return false;
  const ids = msgs.map(m => m.id);
  const { error } = await supabase
    .from('chat_messages')
    .update({ deleted_for: [userId] })
    .in('id', ids);
  return !error;
}

export async function createDirectConversation(otherUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('create_direct_conversation', { other_user_id: otherUserId });
  if (error) { console.error('[Chat] createDirectConversation error:', error); return null; }
  return data as string;
}

// ─── Drafts ───────────────────────────────────────────

export async function saveDraft(
  conversationId: string, userId: string, content: string, replyToId?: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_drafts')
    .upsert({
      user_id: userId,
      conversation_id: conversationId,
      content,
      reply_to_id: replyToId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,conversation_id' });
  return !error;
}

export async function getDraft(
  conversationId: string, userId: string
): Promise<ChatDraft | null> {
  const { data } = await supabase
    .from('chat_drafts')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();
  return data;
}

export async function deleteDraft(conversationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_drafts')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  return !error;
}

// ─── Reactions ────────────────────────────────────────

export async function addReaction(
  messageId: string, userId: string, emoji: string
): Promise<void> {
  await supabase.from('chat_reactions').upsert(
    { message_id: messageId, user_id: userId, emoji },
    { onConflict: 'message_id,user_id,emoji' }
  );
}

export async function removeReaction(
  messageId: string, userId: string, emoji: string
): Promise<void> {
  await supabase.from('chat_reactions').delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
}

// ─── Read Receipts ────────────────────────────────────

export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('chat_participants')
    .update({ last_read_at: now })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

export async function markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
  if (!messageIds.length) return;
  const now = new Date().toISOString();
  const receipts = messageIds.map(id => ({ message_id: id, user_id: userId, read_at: now }));
  await supabase.from('chat_read_receipts')
    .upsert(receipts, { onConflict: 'message_id,user_id' });
}

export async function markMessagesDelivered(messageIds: string[], userId: string): Promise<void> {
  if (!messageIds.length) return;
  await supabase.rpc('mark_messages_delivered', {
    p_message_ids: messageIds,
    p_user_id: userId,
  });
}

export async function fetchReadReceipts(
  messageIds: string[]
): Promise<Map<string, string>> {
  if (!messageIds.length) return new Map();
  const { data } = await supabase
    .rpc('get_message_read_receipts', { p_message_ids: messageIds });
  const map = new Map<string, string>();
  if (data) {
    for (const r of data as { message_id: string; user_id: string; read_at: string }[]) {
      map.set(r.message_id, r.read_at);
    }
  }
  return map;
}

// ─── Typing Indicator ─────────────────────────────────

export async function emitTyping(
  conversationId: string, userId: string, isTyping: boolean
): Promise<void> {
  await supabase.from('chat_typing_events').upsert(
    { conversation_id: conversationId, user_id: userId, is_typing: isTyping, updated_at: new Date().toISOString() },
    { onConflict: 'conversation_id,user_id' }
  );
}

export function subscribeToTyping(
  conversationId: string,
  userId: string,
  onTyping: (userId: string) => void,
  onStopTyping: (userId: string) => void,
  throttleMs = 2000
) {
  const timers: Record<string, ReturnType<typeof setTimeout>> = {};
  return supabase
    .channel(`typing:${conversationId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_typing_events', filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => {
        const record = payload.new as { user_id: string; is_typing: boolean };
        if (record.user_id === userId) return;
        if (record.is_typing) {
          onTyping(record.user_id);
          if (timers[record.user_id]) clearTimeout(timers[record.user_id]);
          timers[record.user_id] = setTimeout(() => {
            onStopTyping(record.user_id);
            delete timers[record.user_id];
          }, throttleMs);
        } else {
          onStopTyping(record.user_id);
          if (timers[record.user_id]) {
            clearTimeout(timers[record.user_id]);
            delete timers[record.user_id];
          }
        }
      }
    )
    .subscribe();
}

// ─── Attachments ──────────────────────────────────────

export async function uploadAttachment(
  file: File,
  messageId: string,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<{ url: string; thumbnail?: string; storagePath: string } | null> {
  const ext = file.name.split('.').pop();
  const storagePath = `${userId}/${messageId}_${Date.now()}.${ext}`;

  const { data: upload, error: uploadError } = await supabase.storage
    .from('chat_attachments')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) { console.error('[Chat] upload error:', uploadError); return null; }

  const { data: { publicUrl } } = supabase.storage
    .from('chat_attachments')
    .getPublicUrl(storagePath);

  const signedUrl = await supabase.storage
    .from('chat_attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const fileUrl = signedUrl.data?.signedUrl || publicUrl;

  await supabase.from('chat_attachments').insert({
    message_id: messageId,
    user_id: userId,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type || ext || 'application/octet-stream',
    file_url: fileUrl,
    storage_path: storagePath,
  });

  return { url: fileUrl, storagePath };
}

export async function getAttachmentUrl(storagePath: string): Promise<string | null> {
  const signed = await supabase.storage
    .from('chat_attachments')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
  return signed.data?.signedUrl || null;
}

// ─── Search ────────────────────────────────────────────

export async function searchMessages(
  conversationId: string,
  query: string
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('*, sender:profiles!chat_messages_sender_id_fkey(*)')
    .eq('conversation_id', conversationId)
    .or(`is_deleted.eq.false,deleted_for.cs.{${getUserId()}}`)
    .textSearch('content', query, { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(50) as any;
  return (data || []).reverse();
}

export async function searchAllConversations(
  userId: string,
  query: string
): Promise<{ message_id: string; conversation_id: string; content: string; created_at: string; sender_name: string }[]> {
  const { data } = await supabase
    .rpc('search_all_messages', { user_id: userId, search_query: query });
  return data || [];
}

// ─── Live Trek ────────────────────────────────────────

export async function startLiveTrek(
  conversationId: string,
  userId: string
): Promise<boolean> {
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { error } = await supabase.from('chat_live_treks').upsert({
      user_id: userId,
      conversation_id: conversationId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      elevation: pos.coords.altitude,
      battery_pct: await getBatteryLevel(),
      is_active: true,
      started_at: new Date().toISOString(),
    }, { onConflict: 'user_id,conversation_id' });
    return !error;
  });
  return true;
}

export async function updateLiveTrek(
  conversationId: string,
  userId: string,
  data: Partial<ChatLiveTrek>
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_live_treks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);
  return !error;
}

export async function stopLiveTrek(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_live_treks')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);
  return !error;
}

export function subscribeToLiveTrek(
  conversationId: string,
  onUpdate: (trek: ChatLiveTrek) => void
) {
  return supabase
    .channel(`live-trek:${conversationId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_live_treks', filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => { onUpdate(payload.new as ChatLiveTrek); }
    )
    .subscribe();
}

// ─── Live Location ────────────────────────────────────

export async function startLiveLocation(
  conversationId: string,
  userId: string,
  duration: '15min' | '1hour' | 'until_stopped'
): Promise<boolean> {
  const expiresAt = duration === '15min' ? new Date(Date.now() + 15 * 60000).toISOString()
    : duration === '1hour' ? new Date(Date.now() + 3600000).toISOString()
    : null;

  const watchId = navigator.geolocation.watchPosition(async (pos) => {
    await supabase.from('chat_live_locations').upsert({
      user_id: userId,
      conversation_id: conversationId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      battery_pct: await getBatteryLevel(),
      duration,
      expires_at: expiresAt,
      is_active: true,
    }, { onConflict: 'user_id,conversation_id' });
  });

  (window as any).__liveLocationWatchers = (window as any).__liveLocationWatchers || {};
  (window as any).__liveLocationWatchers[conversationId] = watchId;
  return true;
}

export async function stopLiveLocation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const watchId = (window as any).__liveLocationWatchers?.[conversationId];
  if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
  const { error } = await supabase
    .from('chat_live_locations')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);
  return !error;
}

export function subscribeToLiveLocations(
  conversationId: string,
  onUpdate: (loc: ChatLiveLocation) => void
) {
  return supabase
    .channel(`live-loc:${conversationId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_live_locations', filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => { onUpdate(payload.new as ChatLiveLocation); }
    )
    .subscribe();
}

// ─── SOS Emergency ────────────────────────────────────

export async function sendSosAlert(
  conversationId: string | null,
  userId: string,
  emergencyMessage?: string
): Promise<ChatSosAlert | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const battery = await getBatteryLevel();
      const { data } = await supabase.from('chat_sos_alerts').insert({
        user_id: userId,
        conversation_id: conversationId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude,
        battery_pct: battery,
        nearest_trail: 'Detecting...',
        emergency_message: emergencyMessage || 'SOS Emergency! Need immediate assistance.',
        status: 'active',
      }).select().single() as any;
      resolve(data);
    }, () => resolve(null), { enableHighAccuracy: true, timeout: 10000 });
  });
}

export async function acknowledgeSos(alertId: string, userId: string): Promise<boolean> {
  const { data: alert } = await supabase
    .from('chat_sos_alerts')
    .select('acknowledged_by')
    .eq('id', alertId)
    .single();
  const existing = (alert as any)?.acknowledged_by || [];
  const { error } = await supabase
    .from('chat_sos_alerts')
    .update({ acknowledged_by: [...existing, userId] })
    .eq('id', alertId);
  return !error;
}

export async function resolveSos(alertId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sos_alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('user_id', userId);
  return !error;
}

export function subscribeToSosAlerts(
  conversationId: string,
  onAlert: (alert: ChatSosAlert) => void
) {
  return supabase
    .channel(`sos:${conversationId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_sos_alerts', filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => { onAlert(payload.new as ChatSosAlert); }
    )
    .subscribe();
}

// ─── Waypoints ────────────────────────────────────────

export async function dropWaypoint(
  conversationId: string,
  userId: string,
  type: ChatWaypoint['waypoint_type'],
  lat?: number, lng?: number,
  title?: string,
  description?: string
): Promise<ChatWaypoint | null> {
  return new Promise((resolve) => {
    const save = async (latitude: number, longitude: number) => {
      const { data } = await supabase.from('chat_waypoints').insert({
        conversation_id: conversationId,
        user_id: userId,
        latitude,
        longitude,
        waypoint_type: type,
        title: title || null,
        description: description || null,
      }).select().single() as any;
      resolve(data);
    };
    if (lat !== undefined && lng !== undefined) {
      save(lat, lng);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => save(pos.coords.latitude, pos.coords.longitude),
        () => resolve(null)
      );
    }
  });
}

export async function getConversationWaypoints(conversationId: string): Promise<ChatWaypoint[]> {
  const { data } = await supabase
    .from('chat_waypoints')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });
  return data || [];
}

// ─── Expedition Albums ────────────────────────────────

export async function createExpeditionAlbum(
  conversationId: string,
  userId: string,
  title: string,
  files: File[],
  description?: string
): Promise<ChatExpeditionAlbum | null> {
  const tempId = `album-${Date.now()}`;
  const { data: album } = await supabase.from('chat_expedition_albums').insert({
    conversation_id: conversationId,
    user_id: userId,
    title,
    description: description || null,
    photo_count: files.length,
  }).select().single() as any;
  if (!album) return null;

  for (let i = 0; i < files.length; i++) {
    const ext = files[i].name.split('.').pop();
    const storagePath = `${userId}/albums/${album.id}_${i}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('chat_attachments')
      .upload(storagePath, files[i]);
    if (uploadErr) continue;

    const { data: { publicUrl } } = supabase.storage
      .from('chat_attachments')
      .getPublicUrl(storagePath);

    await supabase.from('chat_album_media').insert({
      album_id: album.id,
      media_url: publicUrl,
      media_type: files[i].type.startsWith('video') ? 'video' : 'image',
      file_size: files[i].size,
      sort_order: i,
    });

    if (i === 0) {
      await supabase.from('chat_expedition_albums')
        .update({ cover_url: publicUrl })
        .eq('id', album.id);
    }
  }

  return album;
}

export async function getConversationAlbums(conversationId: string): Promise<(ChatExpeditionAlbum & { media: ChatAlbumMedia[] })[]> {
  const { data: albums } = await supabase
    .from('chat_expedition_albums')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false }) as any;
  if (!albums) return [];

  return Promise.all(albums.map(async (a: ChatExpeditionAlbum) => {
    const { data: media } = await supabase
      .from('chat_album_media')
      .select('*')
      .eq('album_id', a.id)
      .order('sort_order') as any;
    return { ...a, media: media || [] };
  }));
}

// ─── Checkpoints ──────────────────────────────────────

export async function announceCheckpoint(
  conversationId: string,
  userId: string,
  name: string,
  type: ChatCheckpoint['checkpoint_type'],
  eta?: string,
  notes?: string
): Promise<ChatCheckpoint | null> {
  return new Promise((resolve) => {
    const save = async (latitude?: number, longitude?: number) => {
      const { data } = await supabase.from('chat_checkpoints').insert({
        conversation_id: conversationId,
        user_id: userId,
        name,
        latitude: latitude || null,
        longitude: longitude || null,
        checkpoint_type: type,
        eta: eta || null,
        notes: notes || null,
      }).select().single() as any;
      resolve(data);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => save(pos.coords.latitude, pos.coords.longitude),
      () => save()
    );
  });
}

// ─── Polls ────────────────────────────────────────────

export async function createPoll(
  conversationId: string,
  userId: string,
  question: string,
  options: string[],
  isMultipleChoice = false,
  expiresAt?: string
): Promise<ChatPoll | null> {
  const { data } = await supabase.from('chat_polls').insert({
    conversation_id: conversationId,
    user_id: userId,
    question,
    options: options,
    is_multiple_choice: isMultipleChoice,
    expires_at: expiresAt || null,
  }).select().single() as any;
  return data;
}

export async function votePoll(
  pollId: string,
  userId: string,
  optionIndex: number
): Promise<boolean> {
  const { data: poll } = await supabase
    .from('chat_polls')
    .select('is_multiple_choice')
    .eq('id', pollId)
    .single();

  if (!poll) return false;

  if (!poll.is_multiple_choice) {
    await supabase.from('chat_poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', userId);
  }

  const { error } = await supabase.from('chat_poll_votes').insert({
    poll_id: pollId,
    user_id: userId,
    option_index: optionIndex,
  });
  return !error;
}

export async function getPollResults(pollId: string): Promise<{ option_index: number; count: number }[]> {
  const { data } = await supabase
    .from('chat_poll_votes')
    .select('option_index')
    .eq('poll_id', pollId);
  if (!data) return [];
  const counts: Record<number, number> = {};
  data.forEach(v => { counts[v.option_index] = (counts[v.option_index] || 0) + 1; });
  return Object.entries(counts).map(([k, v]) => ({ option_index: parseInt(k), count: v }));
}

// ─── Invite Links ─────────────────────────────────────

export async function createInviteLink(
  conversationId: string,
  userId: string,
  maxUses?: number,
  expiresAt?: string
): Promise<ChatInviteLink | null> {
  const { data } = await supabase.from('chat_invite_links').insert({
    conversation_id: conversationId,
    created_by: userId,
    max_uses: maxUses || null,
    expires_at: expiresAt || null,
  }).select().single() as any;
  return data;
}

export async function joinViaInvite(code: string, userId: string): Promise<boolean> {
  const { data: link } = await supabase
    .from('chat_invite_links')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single() as any;

  if (!link) return false;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return false;
  if (link.max_uses && link.use_count >= link.max_uses) return false;

  await supabase.from('chat_invite_links')
    .update({ use_count: link.use_count + 1 })
    .eq('id', link.id);

  const { error } = await supabase.from('chat_participants').insert({
    conversation_id: link.conversation_id,
    user_id: userId,
    role: 'member',
  });
  return !error;
}

// ─── Call Logs ───────────────────────────────────────

export async function logCall(
  conversationId: string,
  callerId: string,
  calleeIds: string[],
  callType: ChatCallLog['call_type'],
  status: ChatCallLog['status'],
  durationSeconds?: number
): Promise<ChatCallLog | null> {
  const { data } = await supabase.from('chat_call_logs').insert({
    conversation_id: conversationId,
    caller_id: callerId,
    callee_ids: calleeIds,
    call_type: callType,
    status,
    duration_seconds: durationSeconds || null,
    ended_at: status === 'ended' ? new Date().toISOString() : null,
  }).select().single() as any;
  return data;
}

export async function getCallHistory(
  conversationId: string,
  limit = 50
): Promise<ChatCallLog[]> {
  const { data } = await supabase
    .from('chat_call_logs')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('started_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ─── Trail Reports ────────────────────────────────────

export async function submitTrailReport(
  conversationId: string | null,
  userId: string,
  type: ChatTrailReport['report_type'],
  description: string,
  severity?: ChatTrailReport['severity']
): Promise<ChatTrailReport | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { data } = await supabase.from('chat_trail_reports').insert({
        user_id: userId,
        conversation_id: conversationId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        report_type: type,
        severity: severity || null,
        description,
      }).select().single() as any;
      resolve(data);
    }, () => resolve(null));
  });
}

// ─── Conversation Roles ──────────────────────────────

export async function updateMemberRole(
  conversationId: string,
  targetUserId: string,
  role: ChatParticipant['role']
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_participants')
    .update({ role })
    .eq('conversation_id', conversationId)
    .eq('user_id', targetUserId);
  return !error;
}

// ─── Subscriptions ───────────────────────────────────

export function subscribeToConversation(
  conversationId: string,
  onMessage: (msg: ChatMessage) => void,
  onUpdate?: (msg: ChatMessage) => void,
  onDelete?: (msgId: string) => void
) {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      async (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
        const newMsg = payload.new as ChatMessage;
        if (newMsg.is_deleted) return;
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newMsg.sender_id)
          .single();
        onMessage({ ...newMsg, sender: sender as Profile } as ChatMessage);
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => {
        const updated = payload.new as ChatMessage;
        if (updated.is_deleted) { onDelete?.(updated.id); return; }
        onUpdate?.(updated);
      }
    );

  return channel.subscribe();
}

export function subscribeToConversationList(
  userId: string,
  onUpdate: () => void
) {
  return supabase
    .channel(`chat-list:${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: undefined },
      () => onUpdate()
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_conversations', filter: undefined },
      () => onUpdate()
    )
    .subscribe();
}

export function subscribeToMentions(
  userId: string,
  onMention: (mention: ChatMention) => void
) {
  return supabase
    .channel(`mentions:${userId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_mentions', filter: `user_id=eq.${userId}` },
      (payload: any) => { onMention(payload.new as ChatMention); }
    )
    .subscribe();
}

// ─── Utilities ────────────────────────────────────────

async function getBatteryLevel(): Promise<number | null> {
  try {
    const battery = await (navigator as any).getBattery?.();
    return battery ? Math.round(battery.level * 100) : null;
  } catch { return null; }
}

export async function getWeatherForLocation(
  lat: number, lng: number
): Promise<{ temp: number; condition: string; sunrise: string; sunset: string; rainProb: number; windSpeed: number; visibility: number } | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode,precipitation_probability,wind_speed_10m,visibility&daily=sunrise,sunset&timezone=auto`
    );
    const data = await res.json();
    if (!data.current) return null;
    const weatherCodes: Record<number, string> = {
      0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Depositing rime fog', 51: 'Light drizzle',
      61: 'Slight rain', 71: 'Slight snow', 95: 'Thunderstorm',
    };
    return {
      temp: data.current.temperature_2m,
      condition: weatherCodes[data.current.weathercode] || 'Unknown',
      sunrise: data.daily?.sunrise?.[0] || '',
      sunset: data.daily?.sunset?.[0] || '',
      rainProb: data.current.precipitation_probability || 0,
      windSpeed: data.current.wind_speed_10m || 0,
      visibility: data.current.visibility || 0,
    };
  } catch { return null; }
}

export async function getConversationMedia(
  convId: string,
  mediaType?: string | null
): Promise<ChatAttachment[]> {
  const { data } = await supabase
    .rpc('get_conversation_media', { conv_id: convId, media_type: mediaType || null }) as any;
  return data || [];
}

export async function getConversationRoutes(
  convId: string
): Promise<{ id: string; message_id: string; content: string; metadata: Record<string, unknown>; created_at: string }[]> {
  const { data } = await supabase
    .rpc('get_conversation_routes', { conv_id: convId }) as any;
  return data || [];
}

