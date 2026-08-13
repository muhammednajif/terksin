import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/community/BottomNav';

export const CommunityLayout = () => {
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-24">
      <Outlet />
      {!isChat && <BottomNav />}
    </div>
  );
};
