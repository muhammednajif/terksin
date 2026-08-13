// Treksin Smart Journey Automation Worker
// Supabase Edge Function — processes due journey tasks
//
// Deploy: supabase functions deploy process-journey-tasks --no-verify-jwt
// Schedule: Every 15 minutes via pg_cron or Supabase Cron

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface JourneyTask {
  id: string;
  journey_id: string;
  user_id: string;
  task_type: string;
  title: string;
  message: string | null;
  scheduled_for: string;
  status: string;
  metadata: Record<string, unknown>;
  retry_count: number;
  journey_status?: string;
  trek_id?: string;
}

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch due pending tasks with journey info
    const { data: tasks, error: fetchError } = await supabase
      .from('journey_tasks')
      .select(`
        *,
        trek_journeys!inner(
          status,
          trek_id,
          trek_name
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    const rawTasks = (tasks || []) as unknown as (JourneyTask & { trek_journeys: { status: string; trek_id: string; trek_name: string } })[];

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const task of rawTasks) {
      const journeyStatus = task.trek_journeys.status;

      // Skip tasks for cancelled/completed journeys
      if (journeyStatus === 'cancelled' || journeyStatus === 'completed') {
        await supabase
          .from('journey_tasks')
          .update({ status: 'cancelled' })
          .eq('id', task.id);
        skipped++;
        continue;
      }

      try {
        // Attempt to claim the task (idempotent — update where status is still 'pending')
        const { data: claimed, error: claimError } = await supabase
          .from('journey_tasks')
          .update({ status: 'processing' })
          .eq('id', task.id)
          .eq('status', 'pending')
          .select()
          .single();

        if (claimError || !claimed) {
          // Another worker already claimed this task
          skipped++;
          continue;
        }

        // Build notification based on task type
        const notification = buildNotification(task);

        // Create notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: task.user_id,
            type: 'journey_reminder',
            title: notification.title,
            body: notification.body,
            reference_id: task.journey_id,
            reference_type: 'journey',
          });

        if (notifError) {
          throw new Error(`Notification insert failed: ${notifError.message}`);
        }

        // Handle journey status transitions
        if (task.task_type === 'trek_start' && journeyStatus === 'planned') {
          await supabase
            .from('trek_journeys')
            .update({ status: 'active' })
            .eq('id', task.journey_id);
        } else if (task.task_type === 'expected_completion' && (journeyStatus === 'active' || journeyStatus === 'planned')) {
          await supabase
            .from('trek_journeys')
            .update({ status: 'awaiting_completion' })
            .eq('id', task.journey_id);
        }

        // Mark task as sent
        await supabase
          .from('journey_tasks')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        processed++;

      } catch (err) {
        console.error(`Task ${task.id} failed:`, err);
        // Increment retry count, mark as failed if exceeded
        await supabase
          .from('journey_tasks')
          .update({
            retry_count: task.retry_count + 1,
            last_error: String(err),
            status: task.retry_count >= 3 ? 'failed' : 'pending',
          })
          .eq('id', task.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: rawTasks.length,
        processed,
        failed,
        skipped,
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Worker error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function buildNotification(task: JourneyTask): { title: string; body: string } {
  const trekName = (task as any).trek_journeys?.trek_name || 'your trek';

  switch (task.task_type) {
    case 'preparation_7_days':
      return {
        title: `Start Preparing for ${trekName}`,
        body: 'Your trek starts in 7 days. Review your fitness preparation and gear checklist.',
      };
    case 'conditions_3_days':
      return {
        title: `Final Gear & Conditions Check`,
        body: `Your trek starts in 3 days. Review the weather, trail conditions, and your gear checklist.`,
      };
    case 'readiness_1_day':
      return {
        title: `Ready for Tomorrow?`,
        body: 'Complete your final readiness check, review your emergency contact, and save essential route information.',
      };
    case 'trek_start':
      return {
        title: `Your Adventure Starts Today`,
        body: `Your ${trekName} journey begins today. Open your journey dashboard for important information.`,
      };
    case 'expected_completion':
      return {
        title: `How Was Your Trek?`,
        body: `Did you complete your ${trekName} journey? Let us know how it went.`,
      };
    case 'share_experience':
      return {
        title: `Share Your ${trekName} Journey`,
        body: 'Congratulations! Share your trek experience with the community.',
      };
    default:
      return {
        title: `Journey Update`,
        body: task.message || 'You have a pending journey reminder.',
      };
  }
}
