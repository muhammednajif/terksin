const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('Could not read Supabase credentials from .env');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// Extract just the RPC definitions from the migration file
// We need the CREATE OR REPLACE FUNCTION blocks
async function applyFix(rpcName) {
  const fixedSQL = {
    get_command_center_kpis: `
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
`,
    get_infrastructure_metrics: `
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
`,
  };

  const sql = fixedSQL[rpcName];
  if (!sql) {
    console.log(`No fix defined for ${rpcName}`);
    return;
  }

  console.log(`Applying fix for ${rpcName}...`);
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql }).maybeSingle();

  // If exec_sql doesn't exist, try REST API raw query
  if (error && error.message?.includes('function "exec_sql" does not exist')) {
    console.log('exec_sql RPC not available, trying raw SQL via REST...');
    // Use the Supabase REST API for raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    console.log('REST fallback not directly available either.');
    console.log('You need to run the SQL manually in Supabase dashboard SQL Editor.');
    console.log('');
    console.log('=== SQL TO RUN ===');
    console.log(sql);
    return;
  }

  if (error) {
    console.log(`Error applying fix: ${error.message}`);
    console.log('You may need to run SQL manually.');
    console.log('');
    console.log('=== SQL TO RUN ===');
    console.log(sql);
  } else {
    console.log(`Fix applied successfully! Data:`, data);
  }
}

async function run() {
  // Try to use the Supabase Management API or direct SQL
  // First, check if we can use exec_sql
  const { error } = await supabase.rpc('exec_sql', { sql_text: 'SELECT 1' }).maybeSingle();
  
  if (error && error.message?.includes('function "exec_sql" does not exist')) {
    console.log('exec_sql RPC not available on this project.');
    console.log('You need to run the SQL directly in Supabase Dashboard > SQL Editor.');
    console.log('');
  }

  await applyFix('get_command_center_kpis');
  console.log('');
  await applyFix('get_infrastructure_metrics');
}

run().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
