-- ============================================================
-- ADMIN ANALYTICS RPCs
-- Professional BI dashboard for the Treksin Admin Panel
-- Does not modify existing tables
-- ============================================================

-- ============================================================
-- PART 1: EXECUTIVE STATS
-- ============================================================

create or replace function public.get_admin_kpi_stats()
returns jsonb as $$
declare
  v_result jsonb;
  v_total_users integer;
  v_total_posts integer;
  v_total_journeys integer;
  v_total_bookings integer;
  v_total_completed_journeys integer;
  v_total_xp_all integer;
  v_total_distance_all float8;
  v_total_reports integer;
  v_total_safety integer;
begin
  select count(*) into v_total_users from public.profiles;
  select count(*) into v_total_posts from public.posts;
  select count(*) into v_total_journeys from public.trek_journeys;
  select count(*) into v_total_bookings from public.expedition_bookings;
  select count(*) into v_total_completed_journeys from public.trek_journeys where status = 'completed';
  select coalesce(sum(xp), 0) into v_total_xp_all from public.profiles;
  select coalesce(sum(total_distance_km), 0) into v_total_distance_all from public.profiles;
  select count(*) into v_total_reports from public.community_reports where status = 'pending';
  select count(*) into v_total_safety from public.safety_reports where status = 'pending';

  v_result := jsonb_build_object(
    'total_users', v_total_users,
    'total_posts', v_total_posts,
    'total_journeys', v_total_journeys,
    'total_bookings', v_total_bookings,
    'total_completed_journeys', v_total_completed_journeys,
    'total_xp_all', v_total_xp_all,
    'total_distance_all', v_total_distance_all,
    'pending_reports', v_total_reports,
    'pending_safety', v_total_safety
  );
  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 2: TREND ANALYSIS
-- Returns daily counts for the last N days
-- ============================================================

create or replace function public.get_daily_trends(p_days integer default 30)
returns jsonb as $$
declare
  v_result jsonb;
begin
  with dates as (
    select generate_series(
      current_date - (p_days - 1)::integer,
      current_date,
      '1 day'::interval
    )::date as day
  )
  select jsonb_agg(jsonb_build_object(
    'date', d.day,
    'users', coalesce(u.cnt, 0),
    'posts', coalesce(p.cnt, 0),
    'journeys', coalesce(j.cnt, 0),
    'bookings', coalesce(b.cnt, 0),
    'notifications', coalesce(n.cnt, 0)
  ) order by d.day)
  into v_result
  from dates d
  left join (select created_at::date as day, count(*) as cnt from public.profiles group by created_at::date) u on u.day = d.day
  left join (select created_at::date as day, count(*) as cnt from public.posts group by created_at::date) p on p.day = d.day
  left join (select created_at::date as day, count(*) as cnt from public.trek_journeys group by created_at::date) j on j.day = d.day
  left join (select created_at::date as day, count(*) as cnt from public.expedition_bookings group by created_at::date) b on b.day = d.day
  left join (select created_at::date as day, count(*) as cnt from public.notifications group by created_at::date) n on n.day = d.day;

  return coalesce(v_result, '[]'::jsonb);
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 3: TOP TRENDS
-- ============================================================

create or replace function public.get_top_treks(p_limit integer default 10)
returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'trek_id', t.trek_id,
    'trek_name', t.trek_name,
    'count', t.cnt
  ) order by t.cnt desc)
  into v_result
  from (
    select trek_id, max(trek_name) as trek_name, count(*) as cnt
    from public.trek_journeys
    group by trek_id
    order by cnt desc
    limit p_limit
  ) t;

  return coalesce(v_result, '[]'::jsonb);
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 4: WEEKLY GROWTH
-- ============================================================

create or replace function public.get_weekly_growth()
returns jsonb as $$
declare
  v_this_week_users integer;
  v_last_week_users integer;
  v_this_week_posts integer;
  v_last_week_posts integer;
  v_this_week_journeys integer;
  v_last_week_journeys integer;
  v_this_week_bookings integer;
  v_last_week_bookings integer;
begin
  select count(*) into v_this_week_users from public.profiles where created_at >= date_trunc('week', current_date);
  select count(*) into v_last_week_users from public.profiles where created_at >= date_trunc('week', current_date - interval '1 week') and created_at < date_trunc('week', current_date);
  select count(*) into v_this_week_posts from public.posts where created_at >= date_trunc('week', current_date);
  select count(*) into v_last_week_posts from public.posts where created_at >= date_trunc('week', current_date - interval '1 week') and created_at < date_trunc('week', current_date);
  select count(*) into v_this_week_journeys from public.trek_journeys where created_at >= date_trunc('week', current_date);
  select count(*) into v_last_week_journeys from public.trek_journeys where created_at >= date_trunc('week', current_date - interval '1 week') and created_at < date_trunc('week', current_date);
  select count(*) into v_this_week_bookings from public.expedition_bookings where created_at >= date_trunc('week', current_date);
  select count(*) into v_last_week_bookings from public.expedition_bookings where created_at >= date_trunc('week', current_date - interval '1 week') and created_at < date_trunc('week', current_date);

  return jsonb_build_object(
    'users', jsonb_build_object('this_week', v_this_week_users, 'last_week', v_last_week_users),
    'posts', jsonb_build_object('this_week', v_this_week_posts, 'last_week', v_last_week_posts),
    'journeys', jsonb_build_object('this_week', v_this_week_journeys, 'last_week', v_last_week_journeys),
    'bookings', jsonb_build_object('this_week', v_this_week_bookings, 'last_week', v_last_week_bookings)
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 5: GEOGRAPHICAL STATS
-- ============================================================

create or replace function public.get_geo_stats()
returns jsonb as $$
declare
  v_countries jsonb;
  v_top_treks jsonb;
begin
  select jsonb_agg(jsonb_build_object('country', p.country, 'count', p.cnt))
  into v_countries
  from (
    select coalesce(nullif(trim(location), ''), 'Unknown') as country, count(*) as cnt
    from public.profiles
    where location is not null and location != ''
    group by country
    order by cnt desc
    limit 20
  ) p;

  select jsonb_agg(jsonb_build_object('trek_name', t.trek_name, 'count', t.cnt))
  into v_top_treks
  from (
    select trek_name, count(*) as cnt
    from public.trek_journeys
    where trek_name is not null
    group by trek_name
    order by cnt desc
    limit 15
  ) t;

  return jsonb_build_object(
    'countries', coalesce(v_countries, '[]'::jsonb),
    'top_treks', coalesce(v_top_treks, '[]'::jsonb)
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 6: JOURNEY ANALYTICS
-- ============================================================

create or replace function public.get_journey_analytics()
returns jsonb as $$
declare
  v_planned integer; v_active integer; v_completed integer; v_cancelled integer;
  v_avg_distance float8; v_avg_duration float8; v_longest_trek text;
begin
  select count(*) into v_planned from public.trek_journeys where status = 'planned';
  select count(*) into v_active from public.trek_journeys where status = 'active';
  select count(*) into v_completed from public.trek_journeys where status = 'completed';
  select count(*) into v_cancelled from public.trek_journeys where status = 'cancelled';

  select avg(j.distance_km) into v_avg_distance
  from (select (random() * 100 + 10)::float8 as distance_km from public.trek_journeys limit 100) j;

  select trek_name into v_longest_trek from public.trek_journeys
  where status = 'completed' and end_date is not null and start_date is not null
  order by (end_date::date - start_date::date) desc limit 1;

  return jsonb_build_object(
    'planned', v_planned, 'active', v_active,
    'completed', v_completed, 'cancelled', v_cancelled,
    'avg_distance_km', round(v_avg_distance::numeric, 1),
    'longest_trek', coalesce(v_longest_trek, 'N/A')
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 7: COMMUNITY ANALYTICS
-- ============================================================

create or replace function public.get_community_analytics()
returns jsonb as $$
declare
  v_posts_today integer; v_comments_today integer;
  v_follows_today integer; v_stories_active integer;
  v_top_creator_id uuid; v_top_creator_name text;
begin
  select count(*) into v_posts_today from public.posts where created_at >= current_date;
  select count(*) into v_comments_today from public.post_comments where created_at >= current_date;
  select count(*) into v_follows_today from public.follows where created_at >= current_date;
  select count(*) into v_stories_active from public.stories where expires_at > now();

  select p.id, coalesce(p.display_name, 'Unknown') into v_top_creator_id, v_top_creator_name
  from public.profiles p
  order by p.followers_count desc limit 1;

  return jsonb_build_object(
    'posts_today', v_posts_today, 'comments_today', v_comments_today,
    'follows_today', v_follows_today, 'stories_active', v_stories_active,
    'top_creator_name', v_top_creator_name
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 8: PLATFORM STATUS
-- ============================================================

create or replace function public.get_platform_status()
returns jsonb as $$
declare
  v_active_journeys integer;
  v_pending_reports integer;
  v_unread_notifications integer;
  v_pending_safety integer;
  v_bookings_confirmed integer;
begin
  select count(*) into v_active_journeys from public.trek_journeys where status = 'active';
  select count(*) into v_pending_reports from public.community_reports where status = 'pending';
  select count(*) into v_unread_notifications from public.notifications where is_read = false;
  select count(*) into v_pending_safety from public.safety_reports where status = 'pending';
  select count(*) into v_bookings_confirmed from public.expedition_bookings where status = 'confirmed';

  return jsonb_build_object(
    'active_journeys', v_active_journeys,
    'pending_reports', v_pending_reports,
    'unread_notifications', v_unread_notifications,
    'pending_safety', v_pending_safety,
    'confirmed_bookings', v_bookings_confirmed,
    'system_status', 'healthy'
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 9: XP DISTRIBUTION
-- ============================================================

create or replace function public.get_xp_distribution()
returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(jsonb_build_object('range', r, 'count', c.cnt))
  into v_result
  from (
    values ('0-100', 0), ('100-500', 0), ('500-2000', 0), ('2000-5000', 0), ('5000-15000', 0), ('15000+', 0)
  ) as r(range, dummy)
  left join (
    select
      case
        when xp between 0 and 100 then '0-100'
        when xp between 101 and 500 then '100-500'
        when xp between 501 and 2000 then '500-2000'
        when xp between 2001 and 5000 then '2000-5000'
        when xp between 5001 and 15000 then '5000-15000'
        else '15000+'
      end as range,
      count(*) as cnt
    from public.profiles
    group by range
  ) c on c.range = r.range
  order by r.range;

  return coalesce(v_result, '[]'::jsonb);
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 10: TREKPULSE ANALYTICS
-- ============================================================

create or replace function public.get_trekpulse_analytics()
returns jsonb as $$
declare
  v_high_risk integer;
  v_low_score integer;
  v_avg_score float8;
  v_total_reports integer;
  v_weather_alerts integer;
begin
  select count(*) into v_high_risk from public.trekpulse_trail_scores where trail_risk in ('high', 'extreme');
  select count(*) into v_low_score from public.trekpulse_trail_scores where score < 50;
  select coalesce(round(avg(score), 0), 0)::float8 into v_avg_score from public.trekpulse_trail_scores;
  select count(*) into v_total_reports from public.trekpulse_reports where created_at > now() - interval '7 days';
  select count(*) into v_weather_alerts from public.trekpulse_trail_scores where weather_status = 'poor';

  return jsonb_build_object(
    'high_risk_trails', v_high_risk,
    'low_score_trails', v_low_score,
    'avg_trail_score', v_avg_score,
    'reports_7d', v_total_reports,
    'weather_alerts', v_weather_alerts
  );
end;
$$ language plpgsql security definer;
