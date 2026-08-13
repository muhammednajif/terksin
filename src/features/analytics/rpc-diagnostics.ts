import { supabase } from '@/lib/supabase';

interface RpcTestResult {
  name: string;
  params: Record<string, unknown> | null;
  status: 'ok' | 'fail' | 'missing';
  durationMs: number;
  dataPreview: unknown;
  error: {
    message: string;
    code: string;
    details: string;
    hint: string;
  } | null;
  rlsBlocked: boolean;
  permissionError: boolean;
  returnedNull: boolean;
}

async function testRpc(
  name: string,
  params?: Record<string, unknown>,
): Promise<RpcTestResult> {
  const start = performance.now();
  const entry: RpcTestResult = {
    name,
    params: params || null,
    status: 'ok',
    durationMs: 0,
    dataPreview: null,
    error: null,
    rlsBlocked: false,
    permissionError: false,
    returnedNull: false,
  };

  try {
    console.log(`[diag] >>> ${name}`, params || {});
    const { data, error } = await supabase.rpc(name, params || {});
    entry.durationMs = Math.round(performance.now() - start);
    console.log(`[diag] <<< ${name} (${entry.durationMs}ms)`, { data, error });

    if (error) {
      entry.status = 'fail';
      entry.error = {
        message: error.message,
        code: error.code || '',
        details: error.details || '',
        hint: error.hint || '',
      };
      entry.rlsBlocked = error.message?.toLowerCase().includes('new row violates') ||
        error.message?.toLowerCase().includes('permission denied') ||
        error.message?.toLowerCase().includes('policy') || false;
      entry.permissionError = error.message?.toLowerCase().includes('permission denied') ||
        error.code === '42501' || false;
      return entry;
    }

    if (data === null || data === undefined) {
      entry.returnedNull = true;
    }

    entry.dataPreview = data;
  } catch (e: unknown) {
    entry.durationMs = Math.round(performance.now() - start);
    entry.status = 'fail';
    const err = e as any;
    entry.error = {
      message: err?.message || String(e),
      code: err?.code || '',
      details: err?.details || '',
      hint: err?.hint || '',
    };
    entry.rlsBlocked = entry.error.message.toLowerCase().includes('permission');
    entry.permissionError = entry.error.code === '42501';
  }

  return entry;
}

export async function runAllRpcDiagnostics(): Promise<RpcTestResult[]> {
  const results: RpcTestResult[] = [];

  const tests = [
    { name: 'get_platform_health' },
    { name: 'get_infrastructure_metrics' },
    { name: 'get_command_center_kpis' },
    { name: 'get_moderation_and_safety_summary' },
    { name: 'get_daily_activity_feed_v2' },
    { name: 'get_command_center_trends', params: { p_days: 30 } },
    { name: 'get_journey_analytics' },
    { name: 'get_adventure_log_stats' },
    { name: 'get_trekpulse_analytics' },
    { name: 'get_expedition_insights_v2' },
    { name: 'get_user_insights_v2' },
    { name: 'get_xp_distribution' },
    { name: 'get_ai_command_insights' },
    { name: 'get_geo_heatmap_data' },
  ];

  for (const t of tests) {
    const result = await testRpc(t.name, t.params);
    results.push(result);
    const icon = result.status === 'ok' ? '✓' : '✗';
    console.log(`[diag] ${icon} ${result.name} (${result.durationMs}ms)${result.error ? ' — ' + result.error.message : ''}${result.returnedNull ? ' — returned null' : ''}`);
  }

  const failures = results.filter(r => r.status === 'fail');
  if (failures.length > 0) {
    console.log(`\n[diag] ⚠ ${failures.length}/${results.length} RPCs FAILED:`);
    for (const f of failures) {
      console.log(`  [${f.name}]`);
      console.log(`    Error: ${f.error?.message}`);
      console.log(`    Code: ${f.error?.code}`);
      console.log(`    Details: ${f.error?.details}`);
      console.log(`    RLS blocked: ${f.rlsBlocked}`);
      console.log(`    Permission error: ${f.permissionError}`);
    }
  } else {
    console.log(`\n[diag] ✓ All ${results.length} RPCs passed`);
  }

  return results;
}

export async function testSingleRpc(name: string, params?: Record<string, unknown>): Promise<RpcTestResult> {
  return testRpc(name, params);
}
