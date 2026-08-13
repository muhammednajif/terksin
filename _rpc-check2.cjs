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
  const rpcs = [
    { name: 'get_command_center_kpis' },
    { name: 'get_moderation_and_safety_summary' },
    { name: 'get_daily_activity_feed_v2' },
  ];

  console.log('Testing ALL 3 RPCs called by useCommunityDashboard Promise.all:\n');

  for (const rpc of rpcs) {
    console.log('=======================================');
    console.log(`RPC: ${rpc.name}`);
    console.log('---------------------------------------');

    const result = await testRpc(rpc.name, rpc.params || {});

    console.log(`Duration: ${result.duration}ms`);
    console.log(`Success: ${result.success}`);

    if (result.error) {
      console.log(`Error message: ${result.error.message}`);
      console.log(`Error code: ${result.error.code || '(none)'}`);
    } else {
      const preview = typeof result.data === 'object'
        ? JSON.stringify(result.data, null, 2).slice(0, 500)
        : String(result.data);
      console.log(`Data: ${preview}`);
    }
    console.log('');
  }
}

run().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
