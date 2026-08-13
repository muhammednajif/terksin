export type UserRole = 'user' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  trekker_level: number;
  verification_badge: boolean;
  role: UserRole;
  followers_count: number;
  following_count: number;
  completed_treks: number;
  total_distance_km: number;
  highest_elevation_m: number;
  reputation_score: number;
  xp: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  post_type: PostType;
  caption: string | null;
  trek_location: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  distance_km: number | null;
  duration_hours: number | null;
  weather_temp_c: number | null;
  weather_condition: string | null;
  difficulty: Difficulty | null;
  route_id: string | null;
  hashtags: string[];
  visibility: Visibility;
  is_edited: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  created_at: string;
  updated_at: string;
}

export type PostType = 'Trek Experience' | 'Photo Post' | 'Trek Story' | 'Route Review' | 'Safety Update' | 'Question' | 'Achievement' | 'Group Trek Announcement';
export type Difficulty = 'Easy' | 'Moderate' | 'Hard' | 'Extreme';
export type Visibility = 'public' | 'followers' | 'group' | 'private';

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  width: number | null;
  height: number | null;
  file_size: number | null;
  sort_order: number;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  reply_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  expires_at: string;
  like_count: number;
  created_at: string;
}

export interface TrekEvent {
  id: string;
  organizer_id: string;
  title: string;
  location: string;
  meeting_point: string | null;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  start_time: string;
  difficulty: Difficulty | null;
  total_seats: number;
  available_seats: number;
  price: number;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  goal_type: 'distance_km' | 'treks' | 'waterfalls' | 'night_treks' | 'elevation_m' | 'days_active';
  goal_value: number;
  reward_xp: number;
  badge_name: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'post_like' | 'comment' | 'reply' | 'mention' | 'trek_invite' | 'event_update' | 'challenge_complete' | 'badge_earned' | 'safety_alert' | 'journey_reminder' | 'journey_completion' | 'journey_safety';
  title: string;
  body: string | null;
  actor_id: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PostWithAuthor extends Post {
  author: Profile;
  media: PostMedia[];
  liked_by_user?: boolean;
  saved_by_user?: boolean;
}

export interface CommentWithAuthor extends PostComment {
  author: Profile;
  liked_by_user?: boolean;
  replies?: CommentWithAuthor[];
}

export interface StoryWithAuthor extends Story {
  author: Profile;
  viewed: boolean;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface ExpeditionDeparture {
  id: string;
  trek_id: string;
  departure_date: string;
  return_date: string;
  total_seats: number;
  available_seats: number;
  price: number;
  currency: string;
  status: 'scheduled' | 'sold_out' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ExpeditionBooking {
  id: string;
  user_id: string;
  trek_id: string;
  trek_name: string | null;
  trek_location: string | null;
  departure_id: string;
  departure_date: string | null;
  return_date: string | null;
  participant_count: number;
  price_per_person: number;
  total_price: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  booking_reference: string;
  readiness_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SafetyReport {
  id: string;
  user_id: string;
  report_type: 'dangerous_area' | 'wildlife' | 'trail_closure' | 'weather_hazard' | 'other';
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  photo_url: string | null;
  is_anonymous: boolean;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface CommunityReport {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface Announcement {
  id: string;
  author_id: string | null;
  title: string;
  content: string;
  target_audience: 'all' | 'trekkers' | 'moderators' | 'admins';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  title: string | null;
  is_group: boolean;
  created_by: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  mute_until: string | null;
  description: string | null;
  cover_url: string | null;
  invite_code: string | null;
  max_members: number;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  last_message?: ChatMessage | null;
  unread_count?: number;
}

export interface ChatParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  is_admin: boolean;
  is_muted: boolean;
  is_archived: boolean;
  role: 'leader' | 'co_leader' | 'moderator' | 'member';
  nickname: string | null;
  draft: string | null;
  draft_updated_at: string | null;
  profile?: Profile;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: ChatMessageType;
  metadata: Record<string, unknown>;
  reply_to_id: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_for: string[];
  is_draft: boolean;
  is_starred: boolean;
  is_bookmarked: boolean;
  is_delivered: boolean;
  delivered_at: string | null;
  seen_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  reactions?: ChatReaction[];
  reply_to?: ChatMessage | null;
  read_receipts?: ChatReadReceipt[];
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  storage_path: string;
  created_at: string;
}

export type ChatMessageType =
  | 'text' | 'image' | 'video' | 'location' | 'gpx_route' | 'map'
  | 'trail_card' | 'expedition_invite' | 'poll' | 'voice_note'
  | 'document' | 'achievement_card' | 'badge_unlock' | 'journey_share'
  | 'weather_alert' | 'emergency_alert' | 'system_automation'
  | 'gif' | 'checkpoint' | 'campsite' | 'equipment_checklist'
  | 'elevation_graph' | 'live_trek' | 'live_location' | 'sos_alert'
  | 'waypoint' | 'expedition_album' | 'weather_card' | 'journey_card'
  | 'live_checkpoint' | 'screen_recording' | 'audio' | 'zip' | 'gpx' | 'kml'
  | 'route_share' | 'call_log' | 'missed_call';

export interface ChatReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChatReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface ChatLiveTrek {
  id: string;
  user_id: string;
  conversation_id: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  battery_pct: number | null;
  weather_temp_c: number | null;
  weather_condition: string | null;
  eta: string | null;
  is_active: boolean;
  started_at: string;
  updated_at: string;
}

export interface ChatLiveLocation {
  id: string;
  user_id: string;
  conversation_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  battery_pct: number | null;
  expires_at: string | null;
  duration: '15min' | '1hour' | 'until_stopped' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatSosAlert {
  id: string;
  user_id: string;
  conversation_id: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
  battery_pct: number | null;
  nearest_trail: string | null;
  emergency_message: string | null;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_alarm';
  acknowledged_by: string[];
  resolved_at: string | null;
  created_at: string;
}

export interface ChatWaypoint {
  id: string;
  conversation_id: string;
  user_id: string;
  message_id: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  waypoint_type: 'camp' | 'water_source' | 'danger' | 'parking' | 'peak' | 'food' | 'emergency_point' | 'viewpoint' | 'river_crossing' | 'bridge' | 'shelter' | 'cave' | 'summit' | 'pass' | 'lake' | 'forest';
  title: string | null;
  description: string | null;
  created_at: string;
}

export interface ChatExpeditionAlbum {
  id: string;
  conversation_id: string;
  user_id: string;
  message_id: string | null;
  title: string | null;
  description: string | null;
  cover_url: string | null;
  photo_count: number;
  journey_summary: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatAlbumMedia {
  id: string;
  album_id: string;
  media_url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  width: number | null;
  height: number | null;
  file_size: number | null;
  latitude: number | null;
  longitude: number | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface ChatCheckpoint {
  id: string;
  conversation_id: string;
  user_id: string;
  message_id: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  checkpoint_type: 'reached' | 'next' | 'rest_stop' | 'camp_setup' | 'departure' | 'waypoint';
  eta: string | null;
  notes: string | null;
  created_at: string;
}

export interface ChatPoll {
  id: string;
  conversation_id: string;
  user_id: string;
  message_id: string | null;
  question: string;
  options: Record<string, unknown>;
  is_multiple_choice: boolean;
  is_anonymous: boolean;
  expires_at: string | null;
  is_closed: boolean;
  created_at: string;
  votes?: ChatPollVote[];
}

export interface ChatPollVote {
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface ChatCallLog {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_ids: string[];
  call_type: 'voice' | 'video' | 'group_voice' | 'group_video';
  status: 'ringing' | 'connected' | 'missed' | 'ended' | 'rejected';
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface ChatInviteLink {
  id: string;
  conversation_id: string;
  created_by: string;
  code: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ChatMention {
  id: string;
  message_id: string;
  user_id: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatTrailReport {
  id: string;
  user_id: string;
  conversation_id: string | null;
  latitude: number;
  longitude: number;
  report_type: 'trail_condition' | 'wildlife_sighting' | 'danger_alert' | 'rockfall' | 'flood_warning' | 'trail_closure' | 'lost_equipment' | 'medical_assistance' | 'nearby_rescue' | 'camp_availability' | 'water_source_update';
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  description: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface ChatBookmark {
  id: string;
  user_id: string;
  message_id: string;
  label: string | null;
  created_at: string;
}

export interface ChatDraft {
  id: string;
  user_id: string;
  conversation_id: string;
  content: string | null;
  reply_to_id: string | null;
  updated_at: string;
}

export interface ChatOfflineMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  retry_count: number;
  created_at: string;
}

// ─── Group Types ──────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  group_type: 'user' | 'expedition' | 'public' | 'private';
  visibility: 'public' | 'private' | 'invite_only';
  expedition_id: string | null;
  owner_id: string;
  max_members: number;
  is_locked: boolean;
  is_archived: boolean;
  expedition_status: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled' | null;
  expedition_start: string | null;
  expedition_end: string | null;
  expedition_route: Record<string, unknown> | null;
  current_checkpoint: string | null;
  current_weather: Record<string, unknown> | null;
  remaining_distance_km: number | null;
  elevation_gain_m: number | null;
  eta: string | null;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  members?: GroupMember[];
  last_message?: GroupMessage | null;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'owner' | 'leader' | 'co_leader' | 'guide' | 'moderator' | 'member' | 'guest';
  nickname: string | null;
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
  is_archived: boolean;
  is_approved: boolean;
  approved_by: string | null;
  profile?: Profile;
}

export interface GroupRole {
  id: string;
  group_id: string;
  name: string;
  color: string;
  priority: number;
  is_default: boolean;
  created_at: string;
}

export interface GroupPermission {
  role_id: string;
  permission: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: GroupMessageType;
  metadata: Record<string, unknown>;
  reply_to_id: string | null;
  thread_id: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_for: string[];
  created_at: string;
  updated_at: string;
  sender?: Profile;
  reactions?: GroupMessageReaction[];
  reply_to?: GroupMessage | null;
}

export type GroupMessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'voice_note' | 'document' | 'location'
  | 'gpx' | 'kml' | 'route' | 'waypoint' | 'weather_card' | 'expedition_card'
  | 'journey_card' | 'checkpoint' | 'poll' | 'event' | 'announcement'
  | 'sos_alert' | 'emergency_broadcast' | 'call_log' | 'missed_call'
  | 'checklist' | 'expense' | 'shared_note' | 'system';

export interface GroupMessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GroupReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface GroupAttachment {
  id: string;
  message_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  storage_path: string | null;
  created_at: string;
}

export interface GroupEvent {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_type: 'trek' | 'meetup' | 'training' | 'social' | 'expedition' | 'camping' | 'other';
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  max_attendees: number | null;
  created_at: string;
}

export interface GroupEventAttendee {
  event_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'maybe';
}

export interface GroupChecklist {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  checklist_type: 'general' | 'packing' | 'pre_trip' | 'safety' | 'equipment' | 'custom';
  is_completed: boolean;
  created_at: string;
  items?: GroupChecklistItem[];
}

export interface GroupChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_checked: boolean;
  checked_by: string | null;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
}

export interface GroupExpense {
  id: string;
  group_id: string;
  paid_by: string;
  title: string;
  amount: number;
  currency: string;
  category: 'transport' | 'food' | 'accommodation' | 'equipment' | 'guide' | 'permits' | 'emergency' | 'other' | null;
  split_type: 'equal' | 'custom' | 'percentage';
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface GroupExpenseSplit {
  expense_id: string;
  user_id: string;
  amount: number;
  is_paid: boolean;
}

export interface GroupAnnouncement {
  id: string;
  group_id: string;
  sender_id: string;
  title: string | null;
  content: string;
  priority: 'normal' | 'high' | 'urgent' | 'emergency';
  is_pinned: boolean;
  created_at: string;
  sender?: Profile;
}

export interface GroupSosAlert {
  id: string;
  group_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  battery_pct: number | null;
  alert_type: 'sos' | 'medical' | 'lost' | 'weather_warning' | 'wildlife' | 'trail_closure' | 'landslide' | 'flash_flood' | 'battery_low' | 'low_signal';
  message: string | null;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by: string[];
  resolved_at: string | null;
  created_at: string;
}

export interface GroupLocationShare {
  id: string;
  group_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  battery_pct: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupSharedRoute {
  id: string;
  group_id: string;
  user_id: string;
  title: string | null;
  route_type: 'gpx' | 'kml' | 'treksin_route' | 'planned';
  file_url: string | null;
  thumbnail_url: string | null;
  distance_km: number | null;
  elevation_gain_m: number | null;
  waypoints: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface GroupSharedWaypoint {
  id: string;
  group_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  waypoint_type: 'camp' | 'water_source' | 'danger' | 'parking' | 'peak' | 'food' | 'emergency_point' | 'viewpoint' | 'summit' | 'shelter' | 'cave' | 'pass' | 'lake' | 'forest' | 'bridge' | 'river_crossing';
  title: string | null;
  description: string | null;
  created_at: string;
}

export interface GroupCallRoom {
  id: string;
  group_id: string;
  started_by: string;
  call_type: 'voice' | 'video' | 'group_voice' | 'group_video' | 'broadcast';
  status: 'active' | 'ended';
  participants: Record<string, unknown>[];
  duration_seconds: number | null;
  created_at: string;
  ended_at: string | null;
}

export interface GroupInviteLink {
  id: string;
  group_id: string;
  created_by: string;
  code: string;
  qr_code_url: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Database {
  public: {
    profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; };
    posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post>; };
    post_media: { Row: PostMedia; Insert: Partial<PostMedia>; Update: Partial<PostMedia>; };
    post_likes: { Row: PostLike; Insert: Partial<PostLike>; Update: Partial<PostLike>; };
    post_comments: { Row: PostComment; Insert: Partial<PostComment>; Update: Partial<PostComment>; };
    follows: { Row: Follow; Insert: Partial<Follow>; Update: Partial<Follow>; };
    stories: { Row: Story; Insert: Partial<Story>; Update: Partial<Story>; };
    trek_events: { Row: TrekEvent; Insert: Partial<TrekEvent>; Update: Partial<TrekEvent>; };
    challenges: { Row: Challenge; Insert: Partial<Challenge>; Update: Partial<Challenge>; };
    notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; };
    saved_treks: { Row: { id: string; user_id: string; trek_id: string; created_at: string }; Insert: Partial<{ id: string; user_id: string; trek_id: string }>; Update: Partial<{ id: string; user_id: string; trek_id: string }>; };
    expedition_departures: { Row: ExpeditionDeparture; Insert: Partial<ExpeditionDeparture>; Update: Partial<ExpeditionDeparture>; };
    expedition_bookings: { Row: ExpeditionBooking; Insert: Partial<ExpeditionBooking>; Update: Partial<ExpeditionBooking>; };
    booking_participants: { Row: { id: string; booking_id: string; full_name: string; age: number | null; nationality: string | null; emergency_contact: string | null; experience_level: string | null; created_at: string }; Insert: Partial<{ id: string; booking_id: string; full_name: string; age: number | null; nationality: string | null; emergency_contact: string | null }>; Update: Partial<{ id: string; booking_id: string; full_name: string; age: number | null; nationality: string | null; emergency_contact: string | null }>; };
    safety_reports: { Row: SafetyReport; Insert: Partial<SafetyReport>; Update: Partial<SafetyReport>; };
    community_reports: { Row: CommunityReport; Insert: Partial<CommunityReport>; Update: Partial<CommunityReport>; };
    announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement>; };
    admin_audit_log: { Row: AdminAuditLog; Insert: Partial<AdminAuditLog>; Update: Partial<AdminAuditLog>; };
    challenge_members: { Row: { id: string; challenge_id: string; user_id: string; progress: number; completed: boolean; joined_at: string; created_at: string }; Insert: Partial<{ id: string; challenge_id: string; user_id: string; progress: number; completed: boolean }>; Update: Partial<{ id: string; challenge_id: string; user_id: string; progress: number; completed: boolean }>; };
    event_members: { Row: { id: string; event_id: string; user_id: string; status: string; created_at: string }; Insert: Partial<{ id: string; event_id: string; user_id: string; status: string }>; Update: Partial<{ id: string; event_id: string; user_id: string; status: string }>; };
    chat_conversations: { Row: ChatConversation; Insert: Partial<ChatConversation>; Update: Partial<ChatConversation>; };
    chat_participants: { Row: ChatParticipant; Insert: Partial<ChatParticipant>; Update: Partial<ChatParticipant>; };
    chat_messages: { Row: ChatMessage; Insert: Partial<ChatMessage>; Update: Partial<ChatMessage>; };
    chat_reactions: { Row: ChatReaction; Insert: Partial<ChatReaction>; Update: Partial<ChatReaction>; };
    chat_read_receipts: { Row: ChatReadReceipt; Insert: Partial<ChatReadReceipt>; Update: Partial<ChatReadReceipt>; };
    chat_attachments: { Row: ChatAttachment; Insert: Partial<ChatAttachment>; Update: Partial<ChatAttachment>; };
    chat_typing_events: { Row: { id: string; conversation_id: string; user_id: string; is_typing: boolean; updated_at: string }; Insert: Partial<{ id: string; conversation_id: string; user_id: string; is_typing: boolean }>; Update: Partial<{ id: string; conversation_id: string; user_id: string; is_typing: boolean }>; };
    chat_blocked_users: { Row: { id: string; user_id: string; blocked_user_id: string; created_at: string }; Insert: Partial<{ id: string; user_id: string; blocked_user_id: string }>; Update: Partial<{ id: string; user_id: string; blocked_user_id: string }>; };
    chat_live_treks: { Row: ChatLiveTrek; Insert: Partial<ChatLiveTrek>; Update: Partial<ChatLiveTrek>; };
    chat_live_locations: { Row: ChatLiveLocation; Insert: Partial<ChatLiveLocation>; Update: Partial<ChatLiveLocation>; };
    chat_sos_alerts: { Row: ChatSosAlert; Insert: Partial<ChatSosAlert>; Update: Partial<ChatSosAlert>; };
    chat_waypoints: { Row: ChatWaypoint; Insert: Partial<ChatWaypoint>; Update: Partial<ChatWaypoint>; };
    chat_expedition_albums: { Row: ChatExpeditionAlbum; Insert: Partial<ChatExpeditionAlbum>; Update: Partial<ChatExpeditionAlbum>; };
    chat_album_media: { Row: ChatAlbumMedia; Insert: Partial<ChatAlbumMedia>; Update: Partial<ChatAlbumMedia>; };
    chat_checkpoints: { Row: ChatCheckpoint; Insert: Partial<ChatCheckpoint>; Update: Partial<ChatCheckpoint>; };
    chat_polls: { Row: ChatPoll; Insert: Partial<ChatPoll>; Update: Partial<ChatPoll>; };
    chat_poll_votes: { Row: ChatPollVote; Insert: Partial<ChatPollVote>; Update: Partial<ChatPollVote>; };
    chat_call_logs: { Row: ChatCallLog; Insert: Partial<ChatCallLog>; Update: Partial<ChatCallLog>; };
    chat_invite_links: { Row: ChatInviteLink; Insert: Partial<ChatInviteLink>; Update: Partial<ChatInviteLink>; };
    chat_mentions: { Row: ChatMention; Insert: Partial<ChatMention>; Update: Partial<ChatMention>; };
    chat_trail_reports: { Row: ChatTrailReport; Insert: Partial<ChatTrailReport>; Update: Partial<ChatTrailReport>; };
    chat_bookmarks: { Row: ChatBookmark; Insert: Partial<ChatBookmark>; Update: Partial<ChatBookmark>; };
    chat_drafts: { Row: ChatDraft; Insert: Partial<ChatDraft>; Update: Partial<ChatDraft>; };
    chat_offline_queue: { Row: ChatOfflineMessage; Insert: Partial<ChatOfflineMessage>; Update: Partial<ChatOfflineMessage>; };
    groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group>; };
    group_members: { Row: GroupMember; Insert: Partial<GroupMember>; Update: Partial<GroupMember>; };
    group_roles: { Row: GroupRole; Insert: Partial<GroupRole>; Update: Partial<GroupRole>; };
    group_permissions: { Row: GroupPermission; Insert: Partial<GroupPermission>; Update: Partial<GroupPermission>; };
    group_messages: { Row: GroupMessage; Insert: Partial<GroupMessage>; Update: Partial<GroupMessage>; };
    group_message_reactions: { Row: GroupMessageReaction; Insert: Partial<GroupMessageReaction>; Update: Partial<GroupMessageReaction>; };
    group_read_receipts: { Row: GroupReadReceipt; Insert: Partial<GroupReadReceipt>; Update: Partial<GroupReadReceipt>; };
    group_attachments: { Row: GroupAttachment; Insert: Partial<GroupAttachment>; Update: Partial<GroupAttachment>; };
    group_events: { Row: GroupEvent; Insert: Partial<GroupEvent>; Update: Partial<GroupEvent>; };
    group_event_attendees: { Row: GroupEventAttendee; Insert: Partial<GroupEventAttendee>; Update: Partial<GroupEventAttendee>; };
    group_checklists: { Row: GroupChecklist; Insert: Partial<GroupChecklist>; Update: Partial<GroupChecklist>; };
    group_checklist_items: { Row: GroupChecklistItem; Insert: Partial<GroupChecklistItem>; Update: Partial<GroupChecklistItem>; };
    group_expenses: { Row: GroupExpense; Insert: Partial<GroupExpense>; Update: Partial<GroupExpense>; };
    group_expense_splits: { Row: GroupExpenseSplit; Insert: Partial<GroupExpenseSplit>; Update: Partial<GroupExpenseSplit>; };
    group_announcements: { Row: GroupAnnouncement; Insert: Partial<GroupAnnouncement>; Update: Partial<GroupAnnouncement>; };
    group_sos_alerts: { Row: GroupSosAlert; Insert: Partial<GroupSosAlert>; Update: Partial<GroupSosAlert>; };
    group_location_shares: { Row: GroupLocationShare; Insert: Partial<GroupLocationShare>; Update: Partial<GroupLocationShare>; };
    group_shared_routes: { Row: GroupSharedRoute; Insert: Partial<GroupSharedRoute>; Update: Partial<GroupSharedRoute>; };
    group_shared_waypoints: { Row: GroupSharedWaypoint; Insert: Partial<GroupSharedWaypoint>; Update: Partial<GroupSharedWaypoint>; };
    group_call_rooms: { Row: GroupCallRoom; Insert: Partial<GroupCallRoom>; Update: Partial<GroupCallRoom>; };
    group_invite_links: { Row: GroupInviteLink; Insert: Partial<GroupInviteLink>; Update: Partial<GroupInviteLink>; };
    group_typing_events: { Row: { group_id: string; user_id: string; is_typing: boolean; updated_at: string }; Insert: Partial<{ group_id: string; user_id: string; is_typing: boolean }>; Update: Partial<{ group_id: string; user_id: string; is_typing: boolean }>; };
  };
}