import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface ChannelConfig {
  table: string;
  event: RealtimeEvent;
  schema?: string;
  filter?: string;
}

export function createAnalyticsChannel(
  channelName: string,
  configs: ChannelConfig[],
  onEvent: (table: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
) {
  const channel = supabase.channel(channelName);

  for (const cfg of configs) {
    channel.on(
      'postgres_changes',
      {
        event: cfg.event,
        schema: cfg.schema || 'public',
        table: cfg.table,
        ...(cfg.filter ? { filter: cfg.filter } : {}),
      },
      (payload) => onEvent(cfg.table, payload),
    );
  }

  channel.subscribe();
  return channel;
}

export function removeAnalyticsChannel(channel: ReturnType<typeof supabase.channel>): void {
  supabase.removeChannel(channel);
}
