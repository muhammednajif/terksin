import { supabase } from '@/lib/supabase';
import type {
  Group, GroupMember, GroupMessage, GroupMessageType,
  GroupEvent, GroupEventAttendee, GroupChecklist, GroupChecklistItem,
  GroupExpense, GroupExpenseSplit, GroupAnnouncement, GroupSosAlert,
  GroupLocationShare, GroupSharedRoute, GroupSharedWaypoint,
  GroupCallRoom, GroupInviteLink, Profile,
} from '@/lib/database.types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ─── 1. Group CRUD ─────────────────────────────────────

export async function fetchUserGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase.rpc('get_user_groups', { p_user_id: userId });
  if (error) { console.error('[Groups] fetchUserGroups error:', error); return []; }
  return (data || []) as Group[];
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
  if (error) { console.error('[Groups] getGroup error:', error); return null; }
  return data;
}

export async function createGroup(data: Partial<Group>): Promise<string | null> {
  const { data: inserted, error } = await supabase.from('groups').insert(data).select('id').single();
  if (error) { console.error('[Groups] createGroup error:', error); return null; }
  return inserted.id;
}

export async function updateGroup(groupId: string, data: Partial<Group>): Promise<boolean> {
  const { error } = await supabase.from('groups').update({ ...data, updated_at: new Date().toISOString() }).eq('id', groupId);
  if (error) { console.error('[Groups] updateGroup error:', error); return false; }
  return true;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) { console.error('[Groups] deleteGroup error:', error); return false; }
  return true;
}

// ─── 2. Member Management ──────────────────────────────

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase.rpc('get_group_members', { group_id: groupId });
  if (error) { console.error('[Groups] fetchGroupMembers error:', error); return []; }
  return (data || []) as GroupMember[];
}

export async function joinGroup(groupId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role: 'member' });
  if (error) { console.error('[Groups] joinGroup error:', error); return false; }
  return true;
}

export async function joinGroupByCode(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('join_group_by_code', { invite_code: code });
  if (error) { console.error('[Groups] joinGroupByCode error:', error); return null; }
  return data as string;
}

export async function leaveGroup(groupId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
  if (error) { console.error('[Groups] leaveGroup error:', error); return false; }
  return true;
}

export async function updateMemberRole(groupId: string, userId: string, role: GroupMember['role']): Promise<boolean> {
  const { error } = await supabase.from('group_members').update({ role }).eq('group_id', groupId).eq('user_id', userId);
  if (error) { console.error('[Groups] updateMemberRole error:', error); return false; }
  return true;
}

export async function approveMember(groupId: string, userId: string, approverId: string): Promise<boolean> {
  const { error } = await supabase.from('group_members').update({ is_approved: true, approved_by: approverId }).eq('group_id', groupId).eq('user_id', userId);
  if (error) { console.error('[Groups] approveMember error:', error); return false; }
  return true;
}

export async function removeMember(groupId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
  if (error) { console.error('[Groups] removeMember error:', error); return false; }
  return true;
}

export async function transferOwnership(groupId: string, newOwnerId: string, oldOwnerId: string): Promise<boolean> {
  const { error: groupErr } = await supabase.from('groups').update({ owner_id: newOwnerId, updated_at: new Date().toISOString() }).eq('id', groupId).eq('owner_id', oldOwnerId);
  if (groupErr) { console.error('[Groups] transferOwnership group error:', groupErr); return false; }
  await supabase.from('group_members').update({ role: 'member' }).eq('group_id', groupId).eq('user_id', oldOwnerId);
  const { error: newRoleErr } = await supabase.from('group_members').update({ role: 'owner' }).eq('group_id', groupId).eq('user_id', newOwnerId);
  if (newRoleErr) { console.error('[Groups] transferOwnership new role error:', newRoleErr); return false; }
  return true;
}

// ─── 3. Messages ───────────────────────────────────────

export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  content: string,
  messageType: GroupMessageType = 'text',
  replyToId?: string | null,
  metadata?: Record<string, unknown>
): Promise<GroupMessage | null> {
  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      sender_id: senderId,
      content,
      message_type: messageType,
      reply_to_id: replyToId || null,
      metadata: metadata || {},
    })
    .select('*, sender:profiles!group_messages_sender_id_fkey(*)')
    .single() as any;
  if (error) { console.error('[Groups] sendGroupMessage error:', error); return null; }
  return data ? { ...data, sender: data.sender } : null;
}

export async function fetchGroupMessages(
  groupId: string,
  page = 0,
  pageSize = 50
): Promise<{ messages: GroupMessage[]; hasMore: boolean }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data: messages } = await supabase
    .from('group_messages')
    .select('*, sender:profiles!group_messages_sender_id_fkey(*)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, to) as any;

  if (!messages) return { messages: [], hasMore: false };

  const enriched = await Promise.all(messages.map(async (msg: GroupMessage) => {
    const { data: reactions } = await supabase
      .from('group_message_reactions')
      .select('*, profile:profiles!group_message_reactions_user_id_fkey(display_name, avatar_url)')
      .eq('message_id', msg.id) as any;

    let replyTo = null;
    if (msg.reply_to_id) {
      const { data: reply } = await supabase
        .from('group_messages')
        .select('id, content, message_type, sender_id, created_at, sender:profiles!group_messages_sender_id_fkey(display_name, avatar_url)')
        .eq('id', msg.reply_to_id)
        .single() as any;
      replyTo = reply;
    }

    return { ...msg, sender: (msg as any).sender, reactions: reactions || [], reply_to: replyTo };
  }));

  return { messages: enriched.reverse(), hasMore: messages.length === pageSize };
}

export async function editGroupMessage(messageId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_messages')
    .update({ content, is_edited: true, updated_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) { console.error('[Groups] editGroupMessage error:', error); return false; }
  return true;
}

export async function deleteGroupMessage(messageId: string, userId: string): Promise<boolean> {
  const { data: msg } = await supabase.from('group_messages').select('deleted_for').eq('id', messageId).single();
  const existing: string[] = (msg as any)?.deleted_for || [];
  const { error } = await supabase.from('group_messages').update({ deleted_for: [...existing, userId] }).eq('id', messageId);
  if (error) { console.error('[Groups] deleteGroupMessage error:', error); return false; }
  return true;
}

export async function deleteGroupMessageEveryone(messageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_messages')
    .update({ content: null, is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', userId);
  if (error) { console.error('[Groups] deleteGroupMessageEveryone error:', error); return false; }
  return true;
}

export async function pinGroupMessage(messageId: string): Promise<boolean> {
  const { data: msg } = await supabase.from('group_messages').select('is_pinned').eq('id', messageId).single();
  const isPinned = msg?.is_pinned ?? false;
  const { error } = await supabase.from('group_messages').update({ is_pinned: !isPinned }).eq('id', messageId);
  if (error) { console.error('[Groups] pinGroupMessage error:', error); return false; }
  return true;
}

export async function addGroupReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  const { error } = await supabase.from('group_message_reactions').upsert(
    { message_id: messageId, user_id: userId, emoji },
    { onConflict: 'message_id,user_id,emoji' }
  );
  if (error) console.error('[Groups] addGroupReaction error:', error);
}

export async function removeGroupReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  const { error } = await supabase.from('group_message_reactions').delete()
    .eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
  if (error) console.error('[Groups] removeGroupReaction error:', error);
}

export async function markGroupRead(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', groupId).eq('user_id', userId);
  if (error) console.error('[Groups] markGroupRead error:', error);
}

export async function markGroupMessagesRead(messageIds: string[], userId: string): Promise<void> {
  if (!messageIds.length) return;
  const receipts = messageIds.map(id => ({ message_id: id, user_id: userId, read_at: new Date().toISOString() }));
  const { error } = await supabase.from('group_read_receipts')
    .upsert(receipts, { onConflict: 'message_id,user_id' });
  if (error) console.error('[Groups] markGroupMessagesRead error:', error);
}

export async function searchGroupMessages(groupId: string, query: string): Promise<GroupMessage[]> {
  const { data } = await supabase
    .from('group_messages')
    .select('*, sender:profiles!group_messages_sender_id_fkey(*)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .textSearch('content', query, { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(50) as any;
  return (data || []).reverse();
}

// ─── 4. Events ─────────────────────────────────────────

export async function createGroupEvent(data: Partial<GroupEvent>): Promise<string | null> {
  const { data: inserted, error } = await supabase.from('group_events').insert(data).select('id').single();
  if (error) { console.error('[Groups] createGroupEvent error:', error); return null; }
  return inserted.id;
}

export async function updateGroupEvent(eventId: string, data: Partial<GroupEvent>): Promise<boolean> {
  const { error } = await supabase.from('group_events').update(data).eq('id', eventId);
  if (error) { console.error('[Groups] updateGroupEvent error:', error); return false; }
  return true;
}

export async function deleteGroupEvent(eventId: string): Promise<boolean> {
  const { error } = await supabase.from('group_events').delete().eq('id', eventId);
  if (error) { console.error('[Groups] deleteGroupEvent error:', error); return false; }
  return true;
}

export async function rsvpEvent(eventId: string, userId: string, status: GroupEventAttendee['status']): Promise<boolean> {
  const { error } = await supabase.from('group_event_attendees').upsert(
    { event_id: eventId, user_id: userId, status },
    { onConflict: 'event_id,user_id' }
  );
  if (error) { console.error('[Groups] rsvpEvent error:', error); return false; }
  return true;
}

export async function fetchGroupEvents(groupId: string): Promise<(GroupEvent & { attendee_count: number })[]> {
  const { data: events } = await supabase
    .from('group_events')
    .select('*')
    .eq('group_id', groupId)
    .order('start_time', { ascending: true }) as any;

  if (!events) return [];

  const enriched = await Promise.all(events.map(async (event: GroupEvent) => {
    const { count } = await supabase
      .from('group_event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id);
    return { ...event, attendee_count: count ?? 0 };
  }));

  return enriched;
}

// ─── 5. Checklists ─────────────────────────────────────

export async function createChecklist(groupId: string, userId: string, title: string, type: GroupChecklist['checklist_type'] = 'general'): Promise<string | null> {
  const { data, error } = await supabase.from('group_checklists').insert({
    group_id: groupId, created_by: userId, title, checklist_type: type,
  }).select('id').single();
  if (error) { console.error('[Groups] createChecklist error:', error); return null; }
  return data.id;
}

export async function addChecklistItem(checklistId: string, content: string, assignedTo?: string): Promise<string | null> {
  const { data, error } = await supabase.from('group_checklist_items').insert({
    checklist_id: checklistId, content, assigned_to: assignedTo || null,
  }).select('id').single();
  if (error) { console.error('[Groups] addChecklistItem error:', error); return null; }
  return data.id;
}

export async function toggleChecklistItem(itemId: string, userId: string): Promise<boolean> {
  const { data: item } = await supabase.from('group_checklist_items').select('is_checked').eq('id', itemId).single();
  if (!item) return false;
  const isChecked = !item.is_checked;
  const { error } = await supabase.from('group_checklist_items')
    .update({ is_checked: isChecked, checked_by: isChecked ? userId : null })
    .eq('id', itemId);
  if (error) { console.error('[Groups] toggleChecklistItem error:', error); return false; }
  return true;
}

export async function deleteChecklist(checklistId: string): Promise<boolean> {
  const { error } = await supabase.from('group_checklists').delete().eq('id', checklistId);
  if (error) { console.error('[Groups] deleteChecklist error:', error); return false; }
  return true;
}

export async function deleteChecklistItem(itemId: string): Promise<boolean> {
  const { error } = await supabase.from('group_checklist_items').delete().eq('id', itemId);
  if (error) { console.error('[Groups] deleteChecklistItem error:', error); return false; }
  return true;
}

export async function fetchChecklists(groupId: string): Promise<(GroupChecklist & { items: GroupChecklistItem[] })[]> {
  const { data: checklists } = await supabase
    .from('group_checklists')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true }) as any;

  if (!checklists) return [];

  return Promise.all(checklists.map(async (cl: GroupChecklist) => {
    const { data: items } = await supabase
      .from('group_checklist_items')
      .select('*')
      .eq('checklist_id', cl.id)
      .order('sort_order', { ascending: true });
    return { ...cl, items: items || [] };
  }));
}

// ─── 6. Expenses ───────────────────────────────────────

export async function createExpense(data: Partial<GroupExpense>, splits: Partial<GroupExpenseSplit>[]): Promise<string | null> {
  const { data: expense, error } = await supabase.from('group_expenses').insert(data).select('id').single();
  if (error || !expense) { console.error('[Groups] createExpense error:', error); return null; }

  const splitsWithId = splits.map(s => ({ ...s, expense_id: expense.id }));
  const { error: splitErr } = await supabase.from('group_expense_splits').insert(splitsWithId);
  if (splitErr) { console.error('[Groups] createExpense splits error:', splitErr); return null; }

  return expense.id;
}

export async function fetchExpenses(groupId: string): Promise<(GroupExpense & { paid_by_profile?: Profile; splits: GroupExpenseSplit[] })[]> {
  const { data: expenses } = await supabase
    .from('group_expenses')
    .select('*, paid_by_profile:profiles!group_expenses_paid_by_fkey(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false }) as any;

  if (!expenses) return [];

  return Promise.all(expenses.map(async (exp: any) => {
    const { data: splits } = await supabase
      .from('group_expense_splits')
      .select('*')
      .eq('expense_id', exp.id);
    return { ...exp, splits: splits || [] };
  }));
}

export async function markSplitPaid(expenseId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('group_expense_splits')
    .update({ is_paid: true })
    .eq('expense_id', expenseId)
    .eq('user_id', userId);
  if (error) { console.error('[Groups] markSplitPaid error:', error); return false; }
  return true;
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  const { error } = await supabase.from('group_expenses').delete().eq('id', expenseId);
  if (error) { console.error('[Groups] deleteExpense error:', error); return false; }
  return true;
}

// ─── 7. Announcements ──────────────────────────────────

export async function createAnnouncement(
  groupId: string,
  senderId: string,
  content: string,
  title?: string | null,
  priority: GroupAnnouncement['priority'] = 'normal'
): Promise<string | null> {
  const { data, error } = await supabase.from('group_announcements').insert({
    group_id: groupId, sender_id: senderId, content, title: title || null, priority,
  }).select('id').single();
  if (error) { console.error('[Groups] createAnnouncement error:', error); return null; }
  return data.id;
}

export async function fetchAnnouncements(groupId: string): Promise<GroupAnnouncement[]> {
  const { data, error } = await supabase
    .from('group_announcements')
    .select('*, sender:profiles!group_announcements_sender_id_fkey(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false }) as any;
  if (error) { console.error('[Groups] fetchAnnouncements error:', error); return []; }
  return (data || []).map((a: any) => ({ ...a, sender: a.sender }));
}

export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  const { error } = await supabase.from('group_announcements').delete().eq('id', announcementId);
  if (error) { console.error('[Groups] deleteAnnouncement error:', error); return false; }
  return true;
}

// ─── 8. SOS ────────────────────────────────────────────

export async function createSosAlert(
  groupId: string,
  userId: string,
  alertType: GroupSosAlert['alert_type'] = 'sos',
  message?: string
): Promise<GroupSosAlert | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { data, error } = await supabase.from('group_sos_alerts').insert({
        group_id: groupId,
        user_id: userId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude,
        alert_type: alertType,
        message: message || null,
        status: 'active',
      }).select().single() as any;
      if (error) { console.error('[Groups] createSosAlert error:', error); resolve(null); }
      resolve(data);
    }, () => resolve(null), { enableHighAccuracy: true, timeout: 10000 });
  });
}

export async function acknowledgeSos(alertId: string, userId: string): Promise<boolean> {
  const { data: alert } = await supabase.from('group_sos_alerts').select('acknowledged_by').eq('id', alertId).single();
  const existing: string[] = (alert as any)?.acknowledged_by || [];
  const { error } = await supabase.from('group_sos_alerts')
    .update({ acknowledged_by: [...existing, userId], status: 'acknowledged' })
    .eq('id', alertId);
  if (error) { console.error('[Groups] acknowledgeSos error:', error); return false; }
  return true;
}

export async function resolveSos(alertId: string, _userId: string): Promise<boolean> {
  const { error } = await supabase.from('group_sos_alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', alertId);
  if (error) { console.error('[Groups] resolveSos error:', error); return false; }
  return true;
}

export async function fetchActiveSosAlerts(groupId: string): Promise<GroupSosAlert[]> {
  const { data, error } = await supabase
    .from('group_sos_alerts')
    .select('*, user:profiles!group_sos_alerts_user_id_fkey(display_name, avatar_url)')
    .eq('group_id', groupId)
    .in('status', ['active', 'acknowledged'])
    .order('created_at', { ascending: false }) as any;
  if (error) { console.error('[Groups] fetchActiveSosAlerts error:', error); return []; }
  return data || [];
}

// ─── 9. Location Sharing ───────────────────────────────

let _locationWatchIds: Record<string, number> = {};

async function _getBatteryLevel(): Promise<number | null> {
  try { const b = await (navigator as any).getBattery?.(); return b ? Math.round(b.level * 100) : null; } catch { return null; }
}

export async function startLocationShare(groupId: string, userId: string, durationMinutes?: number): Promise<boolean> {
  const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null;

  const watchId = navigator.geolocation.watchPosition(async (pos) => {
    await supabase.from('group_location_shares').upsert({
      group_id: groupId,
      user_id: userId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      battery_pct: await _getBatteryLevel(),
      expires_at: expiresAt,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'group_id,user_id' });
  }, () => {}, { enableHighAccuracy: true });

  _locationWatchIds[`${groupId}:${userId}`] = watchId;
  return true;
}

export async function stopLocationShare(groupId: string, userId: string): Promise<boolean> {
  const key = `${groupId}:${userId}`;
  if (_locationWatchIds[key] !== undefined) {
    navigator.geolocation.clearWatch(_locationWatchIds[key]);
    delete _locationWatchIds[key];
  }
  const { error } = await supabase.from('group_location_shares')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('group_id', groupId).eq('user_id', userId);
  if (error) { console.error('[Groups] stopLocationShare error:', error); return false; }
  return true;
}

// ─── 10. Routes & Waypoints ────────────────────────────

export async function shareRoute(groupId: string, userId: string, data: Partial<GroupSharedRoute>): Promise<string | null> {
  const { data: route, error } = await supabase.from('group_shared_routes').insert({
    group_id: groupId, user_id: userId, ...data,
  }).select('id').single();
  if (error) { console.error('[Groups] shareRoute error:', error); return null; }
  return route.id;
}

export async function shareWaypoint(
  groupId: string,
  userId: string,
  type: GroupSharedWaypoint['waypoint_type'],
  lat?: number, lng?: number,
  title?: string,
  description?: string
): Promise<GroupSharedWaypoint | null> {
  return new Promise((resolve) => {
    const save = async (latitude: number, longitude: number) => {
      const { data, error } = await supabase.from('group_shared_waypoints').insert({
        group_id: groupId, user_id: userId, latitude, longitude,
        waypoint_type: type, title: title || null, description: description || null,
      }).select().single() as any;
      if (error) { console.error('[Groups] shareWaypoint error:', error); resolve(null); }
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

export async function fetchGroupRoutes(groupId: string): Promise<GroupSharedRoute[]> {
  const { data, error } = await supabase
    .from('group_shared_routes')
    .select('*, user:profiles!group_shared_routes_user_id_fkey(display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false }) as any;
  if (error) { console.error('[Groups] fetchGroupRoutes error:', error); return []; }
  return data || [];
}

export async function fetchGroupWaypoints(groupId: string): Promise<GroupSharedWaypoint[]> {
  const { data, error } = await supabase
    .from('group_shared_waypoints')
    .select('*, user:profiles!group_shared_waypoints_user_id_fkey(display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false }) as any;
  if (error) { console.error('[Groups] fetchGroupWaypoints error:', error); return []; }
  return data || [];
}

// ─── 11. Call Rooms ────────────────────────────────────

export async function createCallRoom(groupId: string, userId: string, callType: GroupCallRoom['call_type']): Promise<string | null> {
  const { data, error } = await supabase.from('group_call_rooms').insert({
    group_id: groupId, started_by: userId, call_type: callType, status: 'active', participants: [],
  }).select('id').single();
  if (error) { console.error('[Groups] createCallRoom error:', error); return null; }
  return data.id;
}

export async function endCallRoom(roomId: string): Promise<boolean> {
  const { data: room } = await supabase.from('group_call_rooms').select('created_at').eq('id', roomId).single();
  if (!room) return false;
  const durationSeconds = Math.round((Date.now() - new Date(room.created_at).getTime()) / 1000);
  const { error } = await supabase.from('group_call_rooms')
    .update({ status: 'ended', duration_seconds: durationSeconds, ended_at: new Date().toISOString() })
    .eq('id', roomId);
  if (error) { console.error('[Groups] endCallRoom error:', error); return false; }
  return true;
}

// ─── 12. Invite Links ──────────────────────────────────

export async function createInviteLink(groupId: string, userId: string, maxUses?: number, expiresAt?: string): Promise<GroupInviteLink | null> {
  const { data, error } = await supabase.from('group_invite_links').insert({
    group_id: groupId, created_by: userId, max_uses: maxUses || null, expires_at: expiresAt || null,
  }).select().single() as any;
  if (error) { console.error('[Groups] createInviteLink error:', error); return null; }
  return data;
}

export async function deactivateInviteLink(linkId: string): Promise<boolean> {
  const { error } = await supabase.from('group_invite_links').update({ is_active: false }).eq('id', linkId);
  if (error) { console.error('[Groups] deactivateInviteLink error:', error); return false; }
  return true;
}

export async function fetchInviteLinks(groupId: string): Promise<GroupInviteLink[]> {
  const { data, error } = await supabase
    .from('group_invite_links')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('[Groups] fetchInviteLinks error:', error); return []; }
  return data || [];
}

// ─── 13. Typing ────────────────────────────────────────

export async function emitGroupTyping(groupId: string, userId: string, isTyping: boolean): Promise<void> {
  const { error } = await supabase.from('group_typing_events').upsert(
    { group_id: groupId, user_id: userId, is_typing: isTyping, updated_at: new Date().toISOString() },
    { onConflict: 'group_id,user_id' }
  );
  if (error) console.error('[Groups] emitGroupTyping error:', error);
}

// ─── Aliases & Missing Exports ────────────────────────

export async function subscribeToGroupList(_userId: string, onUpdate: () => void) {
  const channel = supabase
    .channel('group-list')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages' }, () => onUpdate())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => onUpdate())
    .subscribe();
  return channel;
}

export function subscribeToGroupTyping(
  groupId: string,
  userId: string,
  onTyping: (userId: string) => void,
  onStopTyping: (userId: string) => void,
  throttleMs = 2000
) {
  const timers: Record<string, ReturnType<typeof setTimeout>> = {};
  return supabase
    .channel(`group-typing:${groupId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'group_typing_events', filter: `group_id=eq.${groupId}` },
      (payload: any) => {
        const record = payload.new as { user_id: string; is_typing: boolean };
        if (record.user_id === userId) return;
        if (record.is_typing) {
          onTyping(record.user_id);
          if (timers[record.user_id]) clearTimeout(timers[record.user_id]);
          timers[record.user_id] = setTimeout(() => { onStopTyping(record.user_id); delete timers[record.user_id]; }, throttleMs);
        } else {
          onStopTyping(record.user_id);
          if (timers[record.user_id]) { clearTimeout(timers[record.user_id]); delete timers[record.user_id]; }
        }
      }
    )
    .subscribe();
}

export function subscribeToSosAlerts(groupId: string, onAlert: (alert: GroupSosAlert) => void) {
  return supabase
    .channel(`group-sos:${groupId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'group_sos_alerts', filter: `group_id=eq.${groupId}` },
      (payload: any) => { onAlert(payload.new as GroupSosAlert); }
    )
    .subscribe();
}

export const acknowledgeGroupSos = acknowledgeSos;
export const resolveGroupSos = resolveSos;

export async function toggleMuteGroup(groupId: string, userId: string): Promise<boolean> {
  const { data } = await supabase.from('group_members').select('is_muted').eq('group_id', groupId).eq('user_id', userId).single();
  const { error } = await supabase.from('group_members').update({ is_muted: !data?.is_muted }).eq('group_id', groupId).eq('user_id', userId);
  return !error;
}

export async function toggleArchiveGroup(groupId: string, userId: string): Promise<boolean> {
  const { data } = await supabase.from('group_members').select('is_archived').eq('group_id', groupId).eq('user_id', userId).single();
  const { error } = await supabase.from('group_members').update({ is_archived: !data?.is_archived }).eq('group_id', groupId).eq('user_id', userId);
  return !error;
}

export async function fetchGroupMedia(groupId: string): Promise<GroupAttachment[]> {
  const { data } = await supabase.from('group_attachments').select('*').limit(50) as any;
  return data || [];
}

export async function fetchGroupFiles(groupId: string): Promise<GroupAttachment[]> {
  const { data } = await supabase.from('group_attachments').select('*').limit(50) as any;
  return data || [];
}



export const fetchGroupExpenses = fetchExpenses;
export const createGroupExpense = createExpense;

export async function fetchExpenseSplits(expenseId: string): Promise<GroupExpenseSplit[]> {
  const { data } = await supabase.from('group_expense_splits').select('*').eq('expense_id', expenseId);
  return data || [];
}

export const fetchSosAlerts = fetchActiveSosAlerts;

export async function lockGroup(groupId: string, locked: boolean): Promise<boolean> {
  const { error } = await supabase.from('groups').update({ is_locked: locked }).eq('id', groupId);
  return !error;
}

export const createGroupAnnouncement = createAnnouncement;

export async function searchUsers(query: string, excludeIds: string[] = []): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .limit(20);
  return (data || []) as Profile[];
}

export const fetchGroupChecklists = fetchChecklists;
export const createGroupChecklist = createChecklist;

export async function updateChecklistItem(itemId: string, data: Partial<GroupChecklistItem>): Promise<boolean> {
  const { error } = await supabase.from('group_checklist_items').update(data).eq('id', itemId);
  return !error;
}

// ─── 14. Subscriptions ─────────────────────────────────

export function subscribeToGroupMessages(
  groupId: string,
  onInsert: (msg: GroupMessage) => void,
  onUpdate?: (msg: GroupMessage) => void,
  onDelete?: (msgId: string) => void
) {
  return supabase
    .channel(`group-messages:${groupId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
      async (payload: RealtimePostgresChangesPayload<GroupMessage>) => {
        const newMsg = payload.new as GroupMessage;
        if (newMsg.is_deleted) return;
        const { data: sender } = await supabase.from('profiles').select('*').eq('id', newMsg.sender_id).single();
        onInsert({ ...newMsg, sender: sender as Profile } as GroupMessage);
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
      (payload: any) => {
        const updated = payload.new as GroupMessage;
        if (updated.is_deleted) { onDelete?.(updated.id); return; }
        onUpdate?.(updated);
      }
    )
    .subscribe();
}

export function subscribeToGroupSos(
  groupId: string,
  onAlert: (alert: GroupSosAlert) => void
) {
  return supabase
    .channel(`group-sos:${groupId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_sos_alerts', filter: `group_id=eq.${groupId}` },
      (payload: any) => { onAlert(payload.new as GroupSosAlert); }
    )
    .subscribe();
}

export function subscribeToGroupLocations(
  groupId: string,
  onUpdate: (loc: GroupLocationShare) => void
) {
  return supabase
    .channel(`group-locations:${groupId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'group_location_shares', filter: `group_id=eq.${groupId}` },
      (payload: any) => { onUpdate(payload.new as GroupLocationShare); }
    )
    .subscribe();
}

export function subscribeToGroupAnnouncements(
  groupId: string,
  onAnnouncement: (announcement: GroupAnnouncement) => void
) {
  return supabase
    .channel(`group-announcements:${groupId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_announcements', filter: `group_id=eq.${groupId}` },
      async (payload: any) => {
        const ann = payload.new as GroupAnnouncement;
        const { data: sender } = await supabase.from('profiles').select('*').eq('id', ann.sender_id).single();
        onAnnouncement({ ...ann, sender: sender as Profile });
      }
    )
    .subscribe();
}

// ─── 15. Expedition-specific ───────────────────────────

export async function updateExpeditionStatus(groupId: string, status: Group['expedition_status']): Promise<boolean> {
  const { error } = await supabase.from('groups').update({
    expedition_status: status, updated_at: new Date().toISOString(),
  }).eq('id', groupId);
  if (error) { console.error('[Groups] updateExpeditionStatus error:', error); return false; }
  return true;
}

export async function broadcastEmergency(groupId: string, senderId: string, content: string): Promise<boolean> {
  const { error: annErr } = await supabase.from('group_announcements').insert({
    group_id: groupId, sender_id: senderId, content, title: 'EMERGENCY', priority: 'emergency',
  });
  if (annErr) { console.error('[Groups] broadcastEmergency announcement error:', annErr); return false; }
  const { error: msgErr } = await supabase.from('group_messages').insert({
    group_id: groupId, sender_id: senderId, content, message_type: 'emergency_broadcast',
    metadata: { is_emergency: true },
  });
  if (msgErr) { console.error('[Groups] broadcastEmergency message error:', msgErr); return false; }
  return true;
}

export async function updateExpeditionCheckpoint(groupId: string, checkpoint: string, eta?: string): Promise<boolean> {
  const { error } = await supabase.from('groups').update({
    current_checkpoint: checkpoint, eta: eta || null, updated_at: new Date().toISOString(),
  }).eq('id', groupId);
  if (error) { console.error('[Groups] updateExpeditionCheckpoint error:', error); return false; }
  return true;
}

export async function fetchExpeditionDashboard(groupId: string): Promise<{
  group: Group | null;
  members: GroupMember[];
  weather: Record<string, unknown> | null;
  checkpoint: string | null;
} | null> {
  const group = await getGroup(groupId);
  if (!group) return null;
  const members = await fetchGroupMembers(groupId);
  return {
    group,
    members,
    weather: group.current_weather,
    checkpoint: group.current_checkpoint,
  };
}
