import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  children: React.ReactNode;
  requireModerator?: boolean;
}

export function AdminRouteGuard({ children, requireModerator }: Props) {
  const { loading } = useAuth();
  const { isAdmin, isModerator, isAuthenticated } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-emerald" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;

  const authorized = requireModerator ? isModerator : isAdmin;
  if (!authorized) return <Navigate to="/" replace />;

  return <>{children}</>;
}
