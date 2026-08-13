import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PresenceState = Record<string, { user_id: string; online_at: string }[]>;

export function usePresence(userId: string | undefined) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        const ids = new Set(Object.values(state).flatMap((arr) => arr.map((p) => p.user_id)));
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  return onlineUserIds;
}
