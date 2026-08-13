import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { FloatingDock } from '@/components/ui/FloatingDock';
import { IconHome, IconSearch, IconPlus, IconUser } from '@tabler/icons-react';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, setShowAuthModal } = useAuth();
  const iconClass = 'h-full w-full';

  const isActive = (path: string) => {
    if (path === '/community') return location.pathname === '/community' && !location.search;
    if (path === '/chat') return location.pathname === '/chat';
    if (path === '/community?create=true') return location.pathname === '/community' && location.search === '?create=true';
    if (path === '/community/profile') return location.pathname === '/community/profile';
    if (path === '/community/search') return location.pathname === '/community/search';
    return false;
  };

  const handlePress = (path: string) => {
    if (!user && path !== '/community') { setShowAuthModal(true); return; }
    if (path === '/community?create=true') { navigate('/community?create=true'); return; }
    navigate(path);
  };

  const links = [
    {
      title: 'Home',
      icon: <IconHome className={iconClass} />,
      href: '/community',
      active: isActive('/community'),
      onClick: () => handlePress('/community'),
    },
    {
      title: 'Search',
      icon: <IconSearch className={iconClass} />,
      href: '/community/search',
      active: isActive('/community/search'),
      onClick: () => handlePress('/community/search'),
    },
    {
      title: 'Post',
      icon: <IconPlus className={iconClass} />,
      href: '/community?create=true',
      active: isActive('/community?create=true'),
      onClick: () => handlePress('/community?create=true'),
    },
    {
      title: 'You',
      icon: profile?.avatar_url ? (
        <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
      ) : (
        <IconUser className={iconClass} />
      ),
      href: '/community/profile',
      active: isActive('/community/profile'),
      onClick: () => handlePress('/community/profile'),
    },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-3 safe-bottom pointer-events-none">
      <FloatingDock
        items={links}
        position="bottom"
        desktopClassName="pointer-events-auto shadow-lg shadow-black/10 border border-black/5"
      />
    </div>
  );
};
