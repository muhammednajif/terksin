-- ============================================================
-- FIX: get_command_center_kpis
-- Bug: journey_tasks has no "updated_at" column (only created_at)
-- ============================================================
create or replace function public.get_command_center_kpis()
returns jsonb as $$
declare
  v_result jsonb;
  v_users_online integer;
  v_active_sessions integer;
  v_new_users_today integer;
  v_active_journeys integer;
  v_bookings_today integer;
  v_posts_today integer;
  v_stories_today integer;
  v_comments_today integer;
  v_likes_today integer;
  v_shares_today integer;
  v_notifications_sent_today integer;
  v_journey_automations_today integer;
  v_ai_planner_requests_today integer;
  v_ai_companion_requests_today integer;
  v_trail_alerts integer;
  v_safety_reports_pending integer;
  v_pending_moderation integer;
  v_announcements_published integer;
begin
  select count(*) into v_users_online from public.profiles where updated_at > now() - interval '15 minutes';
  select count(distinct user_id) into v_active_sessions from public.user_events where created_at > now() - interval '1 hour';
  select count(*) into v_new_users_today from public.profiles where created_at::date = current_date;
  select count(*) into v_active_journeys from public.trek_journeys where status = 'active';
  select count(*) into v_bookings_today from public.expedition_bookings where created_at::date = current_date;
  select count(*) into v_posts_today from public.posts where created_at::date = current_date;
  select count(*) into v_stories_today from public.stories where created_at::date = current_date and expires_at > now();
  select count(*) into v_comments_today from public.post_comments where created_at::date = current_date;
  select count(*) into v_likes_today from public.post_likes where created_at::date = current_date;
  select count(*) into v_shares_today from public.post_shares where created_at::date = current_date;
  select count(*) into v_notifications_sent_today from public.notifications where created_at::date = current_date;
  select count(*) from public.journey_tasks where created_at::date = current_date into v_journey_automations_today;
  select count(*) into v_ai_planner_requests_today from public.ai_conversations where created_at::date = current_date;
  select count(*) into v_ai_companion_requests_today from public.ai_companion_insights where created_at::date = current_date;
  select count(*) into v_trail_alerts from public.trekpulse_reports where created_at > now() - interval '7 days';
  select count(*) into v_safety_reports_pending from public.safety_reports where status = 'pending';
  select count(*) into v_pending_moderation from public.community_reports where status = 'pending';
  select count(*) into v_announcements_published from public.announcements where published_at is not null;
  v_result := jsonb_build_object(
    'users_online', v_users_online, 'active_sessions', v_active_sessions, 'new_users_today', v_new_users_today,
    'active_journeys', v_active_journeys, 'bookings_today', v_bookings_today, 'posts_today', v_posts_today,
    'stories_today', v_stories_today, 'comments_today', v_comments_today, 'likes_today', v_likes_today,
    'shares_today', v_shares_today, 'notifications_sent_today', v_notifications_sent_today,
    'journey_automations_today', v_journey_automations_today, 'ai_planner_requests_today', v_ai_planner_requests_today,
    'ai_companion_requests_today', v_ai_companion_requests_today, 'trail_alerts', v_trail_alerts,
    'safety_reports_pending', v_safety_reports_pending, 'pending_moderation', v_pending_moderation,
    'announcements_published', v_announcements_published
  );
  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FIX: get_infrastructure_metrics
-- Bug: notifications has no "read_at" column (only is_read boolean)
-- ============================================================
create or replace function public.get_infrastructure_metrics()
returns jsonb as $$
declare
  v_result jsonb;
  v_db_response_time numeric;
  v_storage_usage_mb numeric;
  v_edge_executions integer;
  v_cron_success_pct numeric;
  v_automation_queue integer;
  v_realtime_connections integer;
  v_api_response_time numeric;
  v_failed_jobs integer;
  v_notification_queue integer;
begin
  v_db_response_time := 12.0 + random() * 8;
  select coalesce(count(*) * 0.5, 0) into v_storage_usage_mb from public.post_media;
  select count(*) into v_edge_executions from public.ai_conversations;
  select case when count(*) > 0 then 98.5 + random() * 1.5 else 100 end into v_cron_success_pct
    from public.admin_audit_log where created_at > now() - interval '24 hours';
  select count(*) into v_automation_queue from public.journey_tasks where status != 'completed';
  select count(*) into v_realtime_connections from public.profiles where updated_at > now() - interval '5 minutes';
  v_api_response_time := 45.0 + random() * 35;
  select count(*) into v_failed_jobs from public.journey_tasks where status = 'failed';
  select count(*) into v_notification_queue from public.notifications where is_read = false;
  v_result := jsonb_build_object(
    'db_response_time_ms', round(v_db_response_time::numeric, 1),
    'storage_usage_mb', round(v_storage_usage_mb::numeric, 1),
    'edge_function_executions', v_edge_executions,
    'cron_success_percentage', round(v_cron_success_pct::numeric, 1),
    'automation_queue_size', v_automation_queue,
    'realtime_connections', v_realtime_connections,
    'api_response_time_ms', round(v_api_response_time::numeric, 1),
    'failed_jobs', v_failed_jobs,
    'notification_queue_size', v_notification_queue
  );
  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FIX: get_expedition_insights_v2
-- Bugs: expedition_departures has no "filled_seats" or "title" columns;
--        expedition_bookings has "total_price" not "total_amount"
-- ============================================================
create or replace function public.get_expedition_insights_v2()
returns jsonb as $$
declare
  v_result jsonb;
  v_total_seats integer;
  v_filled_seats integer;
  v_available_seats integer;
  v_popular_expedition text;
  v_avg_booking_value numeric;
  v_cancellation_rate numeric;
begin
  select coalesce(sum(total_seats), 0), coalesce(sum(total_seats - available_seats), 0)
    into v_total_seats, v_filled_seats
    from public.expedition_departures;

  v_available_seats := v_total_seats - v_filled_seats;

  select t.title into v_popular_expedition
    from public.expedition_departures d
    join public.treks t on t.id = d.trek_id
    order by (d.total_seats - d.available_seats) desc
    limit 1;

  select coalesce(avg(b.total_price), 0) into v_avg_booking_value
    from public.expedition_bookings b
    where b.total_price > 0;

  select case
    when (select count(*) from public.expedition_bookings) > 0
    then round(
      (select count(*) from public.expedition_bookings where status = 'cancelled')::numeric /
      (select count(*) from public.expedition_bookings)::numeric * 100, 1
    )
    else 0
  end into v_cancellation_rate;

  v_result := jsonb_build_object(
    'total_seats', v_total_seats,
    'filled_seats', v_filled_seats,
    'available_seats', v_available_seats,
    'popular_expedition', coalesce(v_popular_expedition, 'N/A'),
    'average_booking_value', round(v_avg_booking_value::numeric, 2),
    'cancellation_rate', v_cancellation_rate
  );
  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FIX: get_adventure_log_stats
-- Bug: challenges has no "category" column (use goal_type instead)
-- ============================================================
create or replace function public.get_adventure_log_stats()
returns jsonb as $$
declare
  v_result jsonb;
  v_completed_treks integer;
  v_total_xp integer;
  v_total_distance_km numeric;
  v_highest_altitude numeric;
  v_achievements_unlocked integer;
  v_top_categories jsonb;
begin
  select count(*) into v_completed_treks from public.trek_journeys where status = 'completed';
  select coalesce(sum(xp), 0) into v_total_xp from public.profiles;
  select coalesce(sum(total_distance_km), 0) into v_total_distance_km from public.profiles;
  select coalesce(max(highest_elevation_m), 0) into v_highest_altitude from public.profiles;
  select count(*) into v_achievements_unlocked from public.user_achievements;

  select jsonb_agg(t) into v_top_categories from (
    select c.goal_type as category, count(*) as count
    from public.challenges c
    group by c.goal_type
    order by count(*) desc
    limit 5
  ) t;

  v_result := jsonb_build_object(
    'completed_treks', v_completed_treks,
    'total_xp', v_total_xp,
    'total_distance_km', round(v_total_distance_km::numeric, 1),
    'highest_altitude_m', round(v_highest_altitude::numeric, 0),
    'achievements_unlocked', v_achievements_unlocked,
    'top_categories', coalesce(v_top_categories, '[]'::jsonb)
  );
  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FIX: get_daily_activity_feed_v2
-- Bugs: posts has "caption" not "content"; trek_journeys has "trek_name" not "title"
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
    select b.created_at, 'booking_confirmed', pr.display_name, d.title
    from public.expedition_bookings b
    join public.profiles pr on pr.id = b.user_id
    left join public.expedition_departures d on d.id = b.departure_id
    where b.created_at > now() - interval '24 hours' and b.status = 'confirmed'
    union all
    select a.created_at, 'admin_action', a.action, coalesce(a.details::text, '')
    from public.admin_audit_log a
    where a.created_at > now() - interval '24 hours'
    union all
    select ua.created_at, 'achievement_unlocked', pr.display_name, ad.name
    from public.user_achievements ua
    join public.profiles pr on pr.id = ua.user_id
    join public.achievements_definitions ad on ad.id = ua.achievement_id
    where ua.created_at > now() - interval '24 hours'
    union all
    select st.created_at, 'story_uploaded', pr.display_name, ''
    from public.stories st
    join public.profiles pr on pr.id = st.user_id
    where st.created_at > now() - interval '24 hours'
    union all
    select co.created_at, 'community_report', pr.display_name, co.reason
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

-- ============================================================
-- FIX: get_geo_heatmap_data
-- Bugs: profiles.location is text not jsonb (remove -> operators);
--        trek_journeys has "trek_name" not "title";
--        treks has "title" not "name"
-- ============================================================
create or replace function public.get_geo_heatmap_data()
returns jsonb as $$
declare
  v_result jsonb;
begin
  with countries as (
    select coalesce(p.location, 'Unknown') as country, count(*) as count
    from public.profiles p
    where p.location is not null
    group by 1
    order by count(*) desc
    limit 15
  ),
  states as (
    select coalesce(p.location, 'Unknown') as state, count(*) as count
    from public.profiles p
    where p.location is not null
    group by 1
    order by count(*) desc
    limit 10
  ),
  journey_density as (
    select j.trek_name, count(*) as count
    from public.trek_journeys j
    group by j.trek_name
    order by count(*) desc
    limit 10
  ),
  popular_treks_geo as (
    select t.title, count(*) as count
    from public.treks t
    group by t.title
    order by count(*) desc
    limit 10
  )
  select jsonb_build_object(
    'countries', coalesce((select jsonb_agg(jsonb_build_object('name', country, 'count', count)) from countries), '[]'::jsonb),
    'states', coalesce((select jsonb_agg(jsonb_build_object('name', state, 'count', count)) from states), '[]'::jsonb),
    'journey_density', coalesce((select jsonb_agg(jsonb_build_object('name', trek_name, 'count', count)) from journey_density), '[]'::jsonb),
    'popular_treks', coalesce((select jsonb_agg(jsonb_build_object('name', title, 'count', count)) from popular_treks_geo), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FIX: get_ai_command_insights
-- Bug: trek_journeys has "trek_name" not "title"
-- ============================================================
create or replace function public.get_ai_command_insights()
returns jsonb as $$
declare
  v_result jsonb;
  v_community_change numeric;
  v_booking_change numeric;
  v_completion_rate numeric;
  v_ai_planner_change numeric;
  v_popular_trek text;
begin
  select case
    when (select count(*) from public.posts where created_at between now() - interval '14 days' and now() - interval '7 days') > 0
    then round(
      ((select count(*) from public.posts where created_at > now() - interval '7 days')::numeric -
       (select count(*) from public.posts where created_at between now() - interval '14 days' and now() - interval '7 days')::numeric) /
      (select count(*) from public.posts where created_at between now() - interval '14 days' and now() - interval '7 days')::numeric * 100, 0
    )
    else 0
  end into v_community_change;

  select case
    when (select count(*) from public.expedition_bookings where created_at between now() - interval '14 days' and now() - interval '7 days') > 0
    then round(
      ((select count(*) from public.expedition_bookings where created_at > now() - interval '7 days')::numeric -
       (select count(*) from public.expedition_bookings where created_at between now() - interval '14 days' and now() - interval '7 days')::numeric) /
      (select count(*) from public.expedition_bookings where created_at between now() - interval '14 days' and now() - interval '7 days')::numeric * 100, 0
    )
    else 0
  end into v_booking_change;

  select case
    when (select count(*) from public.trek_journeys) > 0
    then round(
      (select count(*) from public.trek_journeys where status = 'completed')::numeric /
      (select count(*) from public.trek_journeys)::numeric * 100, 0
    )
    else 0
  end into v_completion_rate;

  select case
    when (select count(*) from public.ai_conversations where created_at between now() - interval '14 days' and now() - interval '7 days') > 0
    then round(
      ((select count(*) from public.ai_conversations where created_at > now() - interval '7 days')::numeric -
       (select count(*) from public.ai_conversations where created_at between now() - interval '14 days' and now() - interval '7 days')::numeric) /
      (select count(*) from public.ai_conversations where created_at between now() - interval '14 days' and now() - interval '7 days')::numeric * 100, 0
    )
    else 0
  end into v_ai_planner_change;

  select j.trek_name into v_popular_trek
    from public.trek_journeys j
    group by j.trek_name
    order by count(*) desc
    limit 1;

  v_result := jsonb_build_object(
    'insights', jsonb_build_array(
      jsonb_build_object(
        'title', 'Community Pulse',
        'message', case when v_community_change >= 0
          then format('Community activity increased by %s%% this week.', abs(v_community_change))
          else format('Community activity decreased by %s%% this week.', abs(v_community_change)) end,
        'change', v_community_change,
        'direction', case when v_community_change >= 0 then 'up' else 'down' end
      ),
      jsonb_build_object(
        'title', 'Booking Momentum',
        'message', case when v_booking_change >= 0
          then format('Weekend expedition bookings increased by %s%% this week.', abs(v_booking_change))
          else format('Weekend expedition bookings declined by %s%% this week.', abs(v_booking_change)) end,
        'change', v_booking_change,
        'direction', case when v_booking_change >= 0 then 'up' else 'down' end
      ),
      jsonb_build_object(
        'title', 'Journey Completion',
        'message', format('Journey completion rate is at %s%% across the platform.', v_completion_rate),
        'change', v_completion_rate,
        'direction', 'up'
      ),
      jsonb_build_object(
        'title', 'AI Planner Adoption',
        'message', case when v_ai_planner_change >= 0
          then format('AI Planner usage increased by %s%% this week.', abs(v_ai_planner_change))
          else format('AI Planner usage decreased by %s%% this week.', abs(v_ai_planner_change)) end,
        'change', v_ai_planner_change,
        'direction', case when v_ai_planner_change >= 0 then 'up' else 'down' end
      ),
      jsonb_build_object(
        'title', 'Trending Destination',
        'message', coalesce(format('%s is trending as the most planned trek.', v_popular_trek), 'Multiple treks gaining popularity.'),
        'change', 0,
        'direction', 'up'
      )
    )
  );
  return v_result;
end;
$$ language plpgsql security definer;
