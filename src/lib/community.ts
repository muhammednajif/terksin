/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import type {
  Post, PostWithAuthor, CommentWithAuthor, StoryWithAuthor,
  Challenge, TrekEvent, PostType, Difficulty
} from './database.types';

const POSTS_PER_PAGE = 10;
const COMMENTS_PER_PAGE = 10;

// ---- AUTH HELPERS ----

export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
};

// ---- POSTS ----

export async function fetchPosts(options: {
  page?: number;
  limit?: number;
  feed?: 'latest' | 'popular' | 'nearby' | 'following';
  latitude?: number;
  longitude?: number;
  userId?: string;
  type?: PostType;
}): Promise<{ posts: PostWithAuthor[]; hasMore: boolean }> {
  const { page = 0, limit = POSTS_PER_PAGE, feed = 'latest', latitude, longitude, userId } = options;
  const currentUserId = await getCurrentUserId();

  let query = supabase
    .from('posts')
    .select(`*, author:profiles!author_id(*), media:post_media(*)`)
    .eq('visibility', 'public')
    .limit(limit)
    .range(page * limit, (page + 1) * limit - 1);

  if (options.type) query = query.eq('post_type', options.type);

  if (feed === 'latest') query = query.order('created_at', { ascending: false });
  else if (feed === 'popular') query = query.order('like_count', { ascending: false }).order('comment_count', { ascending: false });
  else if (feed === 'following' && userId) {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
    const ids = (follows || []).map((f: { following_id: string }) => f.following_id);
    if (ids.length === 0) return { posts: [], hasMore: false };
    query = query.in('author_id', ids);
  } else if (feed === 'nearby' && latitude && longitude) {
    const range = 0.5;
    query = query.gte('latitude', latitude - range).lte('latitude', latitude + range)
      .gte('longitude', longitude - range).lte('longitude', longitude + range);
  }

  const { data, error } = await query;

  if (error) throw error;

  const posts = (data || []) as unknown as PostWithAuthor[];

  if (currentUserId) {
    const postIds = posts.map(p => p.id);
    if (postIds.length > 0) {
      const [{ data: likes }, { data: saves }] = await Promise.all([
        supabase.from('post_likes').select('post_id').in('post_id', postIds).eq('user_id', currentUserId),
        supabase.from('post_saves').select('post_id').in('post_id', postIds).eq('user_id', currentUserId),
      ]);
      const likedIds = new Set((likes || []).map(l => l.post_id));
      const savedIds = new Set((saves || []).map(s => s.post_id));
      posts.forEach(p => { p.liked_by_user = likedIds.has(p.id); p.saved_by_user = savedIds.has(p.id); });
    }
  }

  return { posts, hasMore: (data?.length ?? 0) >= limit };
}

export async function createPost(input: {
  post_type: PostType;
  caption?: string;
  trek_location?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  distance_km?: number;
  duration_hours?: number;
  difficulty?: Difficulty;
  visibility?: string;
  hashtags?: string[];
  mediaFiles?: File[];
}) {
  const log = (...args: unknown[]) => { if (import.meta.env.DEV) console.log('[createPost]', ...args); };

  log('Submit started');
  const userId = await getCurrentUserId();
  log('Auth user ID:', userId);
  if (!userId) throw new Error('Not authenticated');

  log('Validating post_type:', input.post_type);
  log('Creating post row with author_id:', userId);
  const { data: post, error } = await supabase.from('posts').insert({
    author_id: userId,
    post_type: input.post_type,
    caption: input.caption,
    trek_location: input.trek_location,
    latitude: input.latitude,
    longitude: input.longitude,
    rating: input.rating,
    distance_km: input.distance_km,
    duration_hours: input.duration_hours,
    difficulty: input.difficulty,
    visibility: input.visibility || 'public',
    hashtags: input.hashtags || [],
  }).select().single();

  if (error) {
    log('Post insert failed:', error.code, error.message, error.details);
    throw error;
  }
  log('Post created with ID:', post.id);

  const mediaUrls: { url: string; type: 'image' | 'video' }[] = [];
  if (input.mediaFiles && input.mediaFiles.length > 0) {
    log('Uploading', input.mediaFiles.length, 'media files');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      log('Verified user fetch failed:', userError?.message);
      throw new Error('You must be signed in to upload media.');
    }
    for (const file of input.mediaFiles) {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;
      const filePath = `${user.id}/${uniqueFileName}`;
      log('Uploading to storage path:', filePath);
      const { error: uploadError } = await supabase.storage.from('community').upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) {
        log('Media upload failed:', uploadError.message, uploadError);
        await supabase.from('posts').delete().eq('id', post.id);
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
      const { data: { publicUrl } } = supabase.storage.from('community').getPublicUrl(filePath);
      log('Media upload completed, URL:', publicUrl);
      mediaUrls.push({ url: publicUrl, type: file.type.startsWith('video/') ? 'video' : 'image' });
    }
  }

  if (mediaUrls.length > 0) {
    log('Saving', mediaUrls.length, 'media records');
    const mediaInserts = mediaUrls.map((m, i) => ({
      post_id: post.id, media_url: m.url, media_type: m.type, sort_order: i,
    }));
    const { error: mediaError } = await supabase.from('post_media').insert(mediaInserts);
    if (mediaError) {
      log('Media record insert failed:', mediaError.message, mediaError);
      throw mediaError;
    }
  }

  log('Feed refresh ready');
  return post as Post;
}

export async function deletePost(postId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: post } = await supabase.from('posts').select('author_id, media:post_media(media_url)').eq('id', postId).single();
  if (!post) throw new Error('Post not found');
  if (post.author_id !== userId) throw new Error('Not authorized');

  if (post.media && post.media.length > 0) {
    const paths: string[] = [];
    for (const m of post.media) {
      const url = new URL(m.media_url);
      const pathMatch = url.pathname.match(/\/community\/(.+)/);
      if (pathMatch) paths.push(pathMatch[1]);
    }
    if (paths.length > 0) {
      await supabase.storage.from('community').remove(paths);
    }
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

// ---- LIKES ----

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();

  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id);
    return { liked: false };
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    return { liked: true };
  }
}

export async function fetchPostLikes(postId: string): Promise<{ user_id: string; username: string; avatar_url: string | null }[]> {
  const { data } = await supabase.from('post_likes').select('user_id, profiles!user_id(username, avatar_url)').eq('post_id', postId);
  return (data || []).map((d: any) => ({ user_id: d.user_id, username: d.profiles?.username ?? 'Unknown', avatar_url: d.profiles?.avatar_url }));
}

// ---- COMMENTS ----

export async function fetchComments(postId: string, page = 0): Promise<{ comments: CommentWithAuthor[]; hasMore: boolean }> {
  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('post_comments')
    .select(`*, author:profiles!user_id(*)`)
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(page * COMMENTS_PER_PAGE, (page + 1) * COMMENTS_PER_PAGE - 1);

  if (error) throw error;

  const comments = (data || []) as unknown as CommentWithAuthor[];

  for (const comment of comments) {
    const { data: replies } = await supabase
      .from('post_comments')
      .select(`*, author:profiles!user_id(*)`)
      .eq('parent_id', comment.id)
      .order('created_at', { ascending: true });
    comment.replies = (replies || []) as unknown as CommentWithAuthor[];

    if (currentUserId) {
      const { data: cl } = await supabase.from('comment_likes').select('id').eq('comment_id', comment.id).eq('user_id', currentUserId).maybeSingle();
      comment.liked_by_user = !!cl;
      for (const reply of (comment.replies || [])) {
        const { data: rl } = await supabase.from('comment_likes').select('id').eq('comment_id', reply.id).eq('user_id', currentUserId).maybeSingle();
        reply.liked_by_user = !!rl;
      }
    }
  }

  return { comments, hasMore: (data?.length ?? 0) >= COMMENTS_PER_PAGE };
}

export async function addComment(postId: string, content: string, parentId?: string): Promise<CommentWithAuthor> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase.from('post_comments').insert({
    post_id: postId, user_id: userId, content, parent_id: parentId || null,
  }).select(`*, author:profiles!user_id(*)`).single();
  if (error) throw error;
  return data as unknown as CommentWithAuthor;
}

export async function deleteComment(commentId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  await supabase.from('post_comments').delete().eq('id', commentId).eq('user_id', userId);
}

export async function toggleCommentLike(commentId: string): Promise<{ liked: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data: existing } = await supabase.from('comment_likes').select('id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle();
  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id);
    return { liked: false };
  } else {
    await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
    return { liked: true };
  }
}

// ---- SAVES ----

export async function toggleSave(postId: string): Promise<{ saved: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data: existing } = await supabase.from('post_saves').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (existing) {
    await supabase.from('post_saves').delete().eq('id', existing.id);
    return { saved: false };
  } else {
    await supabase.from('post_saves').insert({ post_id: postId, user_id: userId });
    return { saved: true };
  }
}

export async function fetchSavedPosts(): Promise<PostWithAuthor[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase.from('post_saves').select(`post:posts(*, author:profiles!author_id(*), media:post_media(*))`).eq('user_id', userId).order('created_at', { ascending: false });
  return (data || []).map((d: any) => ({ ...d.post, saved_by_user: true })) as PostWithAuthor[];
}

// ---- SHARES ----

export async function recordShare(postId: string, shareType: string): Promise<void> {
  const userId = await getCurrentUserId();
  await supabase.from('post_shares').insert({ post_id: postId, user_id: userId, share_type: shareType });
}

// ---- STORIES ----

export async function fetchStories(): Promise<StoryWithAuthor[]> {
  const currentUserId = await getCurrentUserId();
  const { data } = await supabase
    .from('stories')
    .select(`*, author:profiles!user_id(*)`)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const stories = (data || []) as unknown as StoryWithAuthor[];
  if (currentUserId && stories.length > 0) {
    const storyIds = stories.map(s => s.id);
    const { data: views } = await supabase.from('story_views').select('story_id').in('story_id', storyIds).eq('user_id', currentUserId);
    const viewedIds = new Set((views || []).map(v => v.story_id));
    stories.forEach(s => { s.viewed = viewedIds.has(s.id); });
  }
  return stories;
}

export async function createStory(file: File, caption?: string, location?: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('You must be signed in.');

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;
  const filePath = `${user.id}/${uniqueFileName}`;
  const { error: uploadError } = await supabase.storage.from('community').upload(filePath, file, {
    upsert: false, contentType: file.type,
  });
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('community').getPublicUrl(filePath);

  await supabase.from('stories').insert({
    user_id: userId,
    media_url: publicUrl,
    media_type: file.type.startsWith('video/') ? 'video' : 'image',
    caption, location,
  });
}

export async function viewStory(storyId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from('story_views').insert({ story_id: storyId, user_id: userId }).maybeSingle();
}

export async function deleteStory(storyId: string): Promise<void> {
  await supabase.from('stories').delete().eq('id', storyId);
}

// ---- FOLLOWS ----

export async function toggleFollow(targetUserId: string): Promise<{ following: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId || userId === targetUserId) throw new Error('Invalid operation');

  const { data: existing } = await supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', targetUserId).maybeSingle();
  if (existing) {
    await supabase.from('follows').delete().eq('id', existing.id);
    return { following: false };
  } else {
    await supabase.from('follows').insert({ follower_id: userId, following_id: targetUserId });

    const { data: actor } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'follow',
      title: `${actor?.display_name || 'Someone'} started following you`,
      body: null,
      actor_id: userId,
    }).maybeSingle();

    return { following: true };
  }
}

export async function fetchPopularTrekkers(): Promise<any[]> {
  const { data } = await supabase.from('profiles').select('*').order('xp', { ascending: false }).limit(20);
  return data || [];
}

export async function fetchLeaderboard(): Promise<any[]> {
  const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url, xp, trekker_level').order('xp', { ascending: false }).limit(50);
  return (data || []).map((p, i) => ({ ...p, rank: i + 1 }));
}

// ---- EVENTS ----

export async function fetchUpcomingEvents(): Promise<TrekEvent[]> {
  const { data } = await supabase.from('trek_events').select('*').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true }).limit(10);
  return (data || []) as TrekEvent[];
}

export async function joinEvent(eventId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data: event } = await supabase.from('trek_events').select('available_seats, price').eq('id', eventId).single();
  if (!event || event.available_seats <= 0) throw new Error('No seats available');
  await supabase.from('event_members').insert({ event_id: eventId, user_id: userId });
}

// ---- CHALLENGES ----

export async function fetchChallenges(): Promise<Challenge[]> {
  const { data } = await supabase.from('challenges').select('*').gte('end_date', new Date().toISOString()).limit(10);
  return (data || []) as Challenge[];
}

export async function joinChallenge(challengeId: string): Promise<{ id: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('challenge_members').insert({ challenge_id: challengeId, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

// ---- NOTIFICATIONS ----

export async function fetchNotifications(): Promise<any[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase.from('notifications').select('*, actor:profiles!actor_id(username, avatar_url)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  return data || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId();
  if (userId) await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
}

// ---- SEARCH ----

export async function searchCommunity(query: string, type?: 'people' | 'posts' | 'treks' | 'locations') {
  const sanitized = query.replace(/[%_]/g, '\\$&');
  const results: any = { profiles: [], posts: [] };

  if (!type || type === 'people') {
    const { data: profiles } = await supabase.from('profiles')
      .select('id, username, display_name, avatar_url, bio, location, xp, completed_treks, verification_badge')
      .or(`display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%,location.ilike.%${sanitized}%`)
      .limit(20);
    results.profiles = profiles || [];
  }

  if (!type || type === 'posts' || type === 'treks' || type === 'locations') {
    let postQuery = supabase
      .from('posts')
      .select(`id, post_type, caption, trek_location, latitude, longitude, created_at, author:profiles!author_id(id, display_name, username, avatar_url)`)
      .eq('visibility', 'public')
      .limit(20);

    if (type === 'treks' && query) {
      postQuery = postQuery.or(`caption.ilike.%${sanitized}%,trek_location.ilike.%${sanitized}%`);
    } else if (type === 'locations' && query) {
      postQuery = postQuery.ilike('trek_location', `%${sanitized}%`);
    } else if (query) {
      postQuery = postQuery.or(`caption.ilike.%${sanitized}%,trek_location.ilike.%${sanitized}%`);
    }

    const { data: posts } = await postQuery.order('created_at', { ascending: false });
    results.posts = (posts || []).map((p: any) => ({
      ...p,
      author: Array.isArray(p.author) ? p.author[0] : p.author,
    }));
  }

  return results;
}

export async function searchProfiles(query: string, page = 0, pageSize = 20): Promise<{ profiles: any[]; hasMore: boolean }> {
  const sanitized = query.replace(/[%_]/g, '\\$&');
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, location, xp, completed_treks, verification_badge', { count: 'exact' })
    .or(`display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%,location.ilike.%${sanitized}%`)
    .range(from, to)
    .order('xp', { ascending: false });
  return { profiles: data || [], hasMore: (count || 0) > to + 1 };
}

export async function fetchFollowers(userId: string, page = 0, pageSize = 20): Promise<{ users: any[]; hasMore: boolean }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data } = await supabase
    .from('follows')
    .select(`follower:follower_id(id, username, display_name, avatar_url, xp, completed_treks, verification_badge)`)
    .eq('following_id', userId)
    .range(from, to)
    .order('created_at', { ascending: false });
  const users = (data || []).map((d: any) => d.follower);
  return { users, hasMore: (data?.length ?? 0) >= pageSize };
}

export async function fetchFollowing(userId: string, page = 0, pageSize = 20): Promise<{ users: any[]; hasMore: boolean }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data } = await supabase
    .from('follows')
    .select(`following:following_id(id, username, display_name, avatar_url, xp, completed_treks, verification_badge)`)
    .eq('follower_id', userId)
    .range(from, to)
    .order('created_at', { ascending: false });
  const users = (data || []).map((d: any) => d.following);
  return { users, hasMore: (data?.length ?? 0) >= pageSize };
}

export async function fetchSuggestedTrekkers(userId: string): Promise<any[]> {
  const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  const followedIds = new Set((myFollows || []).map(f => f.following_id));
  followedIds.add(userId);

  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, location, xp, completed_treks, verification_badge')
    .order('xp', { ascending: false })
    .limit(10);
  return (data || []).filter(p => !followedIds.has(p.id));
}

// ---- SAFETY REPORTS ----

export async function createSafetyReport(data: {
  report_type: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  severity?: string;
  is_anonymous?: boolean;
  trek_id?: string;
}) {
  const userId = await getCurrentUserId();
  const { data: report, error } = await supabase.from('safety_reports').insert({
    ...data,
    user_id: userId || undefined,
    status: 'pending',
  }).select('id').single();

  if (error) throw error;

  // Match to active/upcoming journeys via trek_id
  if (report?.id && data.trek_id) {
    try {
      const { data: matches } = await supabase.rpc('match_safety_report_to_journeys', {
        p_report_id: report.id,
      });

      if (matches && matches.length > 0) {
        const trekName = data.location || 'a nearby trail';
        for (const match of matches as { journey_id: string; user_id: string }[]) {
          await supabase.from('notifications').insert({
            user_id: match.user_id,
            type: 'journey_safety',
            title: 'Community Trail Report',
            body: `A new ${data.report_type.replace(/_/g, ' ')} report was submitted for ${trekName}. Review the report before continuing.`,
            reference_id: match.journey_id,
            reference_type: 'journey',
          }).maybeSingle();
        }
      }
    } catch (e) {
      console.error('Safety report matching failed:', e);
    }
  }
}

// ---- COMMUNITY REPORTS ----

export async function reportPost(postId: string, reason: string) {
  const userId = await getCurrentUserId();
  await supabase.from('community_reports').insert({ post_id: postId, report_type: reason, reporter_id: userId });
}