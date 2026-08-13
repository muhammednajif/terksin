// Full diagnostics: test every RPC used by useCommunityDashboard
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc(name, params = {}) {
  const start = performance.now();
  try {
    const { data, error } = await supabase.rpc(name, params);
    const duration = Math.round(performance.now() - start);
    return { name, duration, data, error, success: !error };
  } catch (e) {
    const duration = Math.round(performance.now() - start);
    return { name, duration, data: null, error: { message: e.message, code: e.code }, success: false };
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('  useCommunityDashboard RPC DIAGNOSTICS');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Individual RPC tests
  const rpcs = [
    'get_command_center_kpis',
    'get_moderation_and_safety_summary',
    'get_daily_activity_feed_v2',
  ];

  const results = [];
  for (const name of rpcs) {
    console.log(`─── RPC: ${name} ───`);
    const r = await testRpc(name);
    console.log(`  Success:    ${r.success}`);
    console.log(`  Duration:   ${r.duration}ms`);
    if (r.error) {
      console.log(`  Error msg:  ${r.error.message}`);
      console.log(`  Error code: ${r.error.code}`);
      console.log(`  Error details: ${r.error.details || '(none)'}`);
    } else {
      const preview = typeof r.data === 'object' ? JSON.stringify(r.data, null, 2).slice(0, 300) : String(r.data);
      console.log(`  Data:       ${preview}`);
    }
    results.push(r);
    console.log('');
  }

  // 2. Simulate the Promise.all
  console.log('─── Promise.all simulation ───');
  const start = performance.now();
  try {
    const [kpis, moderation, activityFeed] = await Promise.all([
      testRpc('get_command_center_kpis'),
      testRpc('get_moderation_and_safety_summary'),
      testRpc('get_daily_activity_feed_v2'),
    ]);
    const duration = Math.round(performance.now() - start);
    console.log(`  Promise.all RESOLVED (${duration}ms)`);
    console.log(`  kpis:       ${kpis.success}`);
    console.log(`  moderation: ${moderation.success}`);
    console.log(`  activity:   ${activityFeed.success}`);
  } catch (e) {
    const duration = Math.round(performance.now() - start);
    console.log(`  Promise.all REJECTED (${duration}ms)`);
    console.log(`  Error: ${e?.message || e}`);
    // Identify which one caused it
    console.log(`\n  ── Identifying rejecting promise ──`);
    const individual = await Promise.allSettled([
      testRpc('get_command_center_kpis'),
      testRpc('get_moderation_and_safety_summary'),
      testRpc('get_daily_activity_feed_v2'),
    ]);
    const names = ['get_command_center_kpis', 'get_moderation_and_safety_summary', 'get_daily_activity_feed_v2'];
    individual.forEach((r, i) => {
      console.log(`  ${names[i]}: ${r.status}`);
      if (r.status === 'rejected') console.log(`    Reason: ${r.reason?.message || r.reason}`);
      if (r.status === 'fulfilled') {
        const v = r.value;
        if (v.success === false) console.log(`    RPC error: ${v.error?.message}`);
      }
    });
  }

  console.log('\n═══════════════════════════════════════════════');
}

run().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
