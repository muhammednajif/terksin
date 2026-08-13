import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/shared/Navbar';
import { Toast } from '@/components/ui/Toast';
import { AuthModal } from '@/components/community/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import ReactLenis, { type LenisRef } from 'lenis/react';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const MainLayout = () => {
  const lenisRef = useRef<LenisRef>(null);
  const { user, showAuthModal, setShowAuthModal } = useAuth();
  const location = useLocation();
  const setChatUnreadCount = useStore(s => s.setChatUnreadCount);
  const setOnlineUserIds = useStore(s => s.setOnlineUserIds);

  const onlineUserIds = usePresence(user?.id);
  useEffect(() => { setOnlineUserIds(onlineUserIds); }, [onlineUserIds, setOnlineUserIds]);

  // Global chat unread tracking + browser notifications
  useEffect(() => {
    if (!user) { setChatUnreadCount(0); return; }

    let userConvIds = new Set<string>();
    let cancelled = false;

    const loadUnread = async () => {
      const { data: convs } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (cancelled) return;
      if (!convs?.length) { setChatUnreadCount(0); return; }

      userConvIds = new Set(convs.map(c => c.conversation_id));

      let total = 0;
      for (const cp of convs) {
        if (!cp.last_read_at) { total++; continue; }
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', cp.conversation_id)
          .gt('created_at', cp.last_read_at)
          .neq('sender_id', user.id);
        total += count ?? 0;
      }
      if (!cancelled) setChatUnreadCount(total);
    };

    loadUnread();

    const channel = supabase.channel('global-chat-unread')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload: any) => {
          const msg = payload.new as any;
          if (!userConvIds.has(msg.conversation_id) || msg.sender_id === user.id) return;

          setChatUnreadCount(prev => prev + 1);

          if (location.pathname !== '/chat' && Notification.permission === 'granted') {
            const { data: sender } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', msg.sender_id)
              .single();
            const name = sender?.display_name || sender?.username || 'Someone';
            new Notification(`Message from ${name}`, {
              body: msg.content || `[${msg.message_type}]`,
              icon: '/favicon.ico',
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname, setChatUnreadCount]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }
    
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    
    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis root ref={lenisRef} autoRaf={false}>
      <div className="min-h-screen flex flex-col bg-brand-dark text-black selection:bg-brand-emerald/30">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Toast />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </ReactLenis>
  );
};
