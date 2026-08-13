-- ============================================================
-- DEMO: Make next journey task due immediately
-- Used by the "Run Automation Demo" button in PlanTrekModal
-- Does NOT modify or replace the existing automation system.
-- ============================================================

create or replace function public.demo_make_task_due(p_journey_id uuid)
returns table (task_id uuid, task_type text, title text, message text) as $$
declare
  v_user_id uuid;
  v_task_id uuid;
  v_task_type text;
  v_title text;
  v_message text;
begin
  -- 1. Authenticate
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Verify journey ownership
  if not exists (select 1 from public.trek_journeys where id = p_journey_id and user_id = v_user_id) then
    raise exception 'Journey not found or access denied';
  end if;

  -- 3. Find the next pending task for this journey in priority order
  select id, task_type, title, message
  into v_task_id, v_task_type, v_title, v_message
  from public.journey_tasks
  where journey_id = p_journey_id
    and user_id = v_user_id
    and status = 'pending'
  order by case task_type
    when 'preparation_7_days' then 1
    when 'conditions_3_days' then 2
    when 'readiness_1_day' then 3
    when 'trek_start' then 4
    when 'expected_completion' then 5
    when 'share_experience' then 6
    else 99
  end
  limit 1;

  if v_task_id is null then
    raise exception 'No pending tasks available for this journey';
  end if;

  -- 4. Make the task due immediately (so process-journey-tasks picks it up)
  update public.journey_tasks
  set scheduled_for = now() - interval '1 minute'
  where id = v_task_id;

  -- 5. Return task info for the frontend
  return query
  select v_task_id, v_task_type, v_title, v_message;
end;
$$ language plpgsql security definer;
