-- ============================================================
-- FIX: get_moderation_and_safety_summary
-- Bug 1 (NEW): posts.is_hidden does not exist - first reference
--   at line 344 runs BEFORE exception handler at line 348-352
-- Fix: remove the unprotected first reference
-- Bug 2 (OLD): community_reports.reported_id does not exist
-- Fix: use reporter_id
-- ============================================================
create or replace function public.get_moderation_and_safety_summary()
returns jsonb as $$
declare
  v_result jsonb;
  v_pending_reports integer;
  v_pending_safety integer;
  v_reported_users integer;
  v_hidden_posts integer;
  v_community_flags integer;
  v_today_actions integer;
begin
  select count(*) into v_pending_reports from public.community_reports where status = 'pending';
  select count(*) into v_pending_safety from public.safety_reports where status = 'pending';
  select count(distinct reporter_id) into v_reported_users from public.community_reports;
  select count(*) into v_community_flags from public.community_reports where status != 'resolved';

  begin
    select count(*) into v_hidden_posts from public.posts where is_hidden = true;
  exception when undefined_column then
    v_hidden_posts := 0;
  end;

  select count(*) into v_today_actions
    from public.admin_audit_log
    where created_at::date = current_date
      and (action like '%report%' or action like '%moderat%' or action like '%safety%' or action like '%hidden%');

  v_result := jsonb_build_object(
    'pending_reports', v_pending_reports,
    'pending_safety_reviews', v_pending_safety,
    'reported_users', coalesce(v_reported_users, 0),
    'hidden_posts', coalesce(v_hidden_posts, 0),
    'community_flags', v_community_flags,
    'today_moderation_actions', v_today_actions
  );
  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FIX: get_daily_activity_feed_v2
-- Bug: user_achievements has "unlocked_at" not "created_at"
-- Bug (already fixed): posts.content -> posts.caption,
--   trek_journeys.title -> trek_journeys.trek_name,
--   expedition_departures.title -> expedition_bookings.trek_name
-- ============================================================
create or replace function public.get_daily_activity_feed_v2()
returns jsonb as $$
declare
  v_result jsonb;
begin
  with combined as (
    select created_at, 'user_joined' as type, display_name as subject, '' as detail
    from public.profiles where created_at > now() - interval '48 hours'
    union all
    select p.created_at, 'post_created', pr.display_name, p.caption
    from public.posts p join public.profiles pr on pr.id = p.author_id
    where p.created_at > now() - interval '24 hours'
    union all
    select j.created_at, 'journey_planned', pr.display_name, j.trek_name
    from public.trek_journeys j join public.profiles pr on pr.id = j.user_id
    where j.created_at > now() - interval '24 hours'
    union all
    select b.created_at, 'booking_confirmed', pr.display_name, coalesce(b.trek_name, d.trek_id)
    from public.expedition_bookings b
    join public.profiles pr on pr.id = b.user_id
    left join public.expedition_departures d on d.id = b.departure_id
    where b.created_at > now() - interval '24 hours' and b.status = 'confirmed'
    union all
    select a.created_at, 'admin_action', a.action, coalesce(a.details::text, '')
    from public.admin_audit_log a
    where a.created_at > now() - interval '24 hours'
    union all
    select ua.unlocked_at, 'achievement_unlocked', pr.display_name, ad.name
    from public.user_achievements ua
    join public.profiles pr on pr.id = ua.user_id
    join public.achievements_definitions ad on ad.id = ua.achievement_id
    where ua.unlocked_at > now() - interval '24 hours'
    union all
    select st.created_at, 'story_uploaded', pr.display_name, ''
    from public.stories st
    join public.profiles pr on pr.id = st.user_id
    where st.created_at > now() - interval '24 hours'
    union all
    select co.created_at, 'community_report', pr.display_name, co.description
    from public.community_reports co
    join public.profiles pr on pr.id = co.reporter_id
    where co.created_at > now() - interval '24 hours'
    union all
    select pl.created_at, 'passport_updated', pr.display_name, ''
    from public.passport_stamps pl
    join public.profiles pr on pr.id = pl.user_id
    where pl.created_at > now() - interval '24 hours'
    union all
    select ac.created_at, 'ai_planner', pr.display_name, ''
    from public.ai_conversations ac
    join public.profiles pr on pr.id = ac.user_id
    where ac.created_at > now() - interval '24 hours'
  )
  select jsonb_agg(jsonb_build_object(
    'timestamp', to_char(created_at, 'HH24:MI'),
    'type', type,
    'subject', subject,
    'detail', detail,
    'created_at', created_at
  ) order by created_at desc) into v_result
  from combined;

  return coalesce(v_result, '[]'::jsonb);
end;
$$ language plpgsql security definer;
