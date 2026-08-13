import { useMemo } from 'react';
import { useAuth } from './useAuth';

type UserRole = 'user' | 'moderator' | 'admin';

export function useAdmin() {
  const { profile, user } = useAuth();

  const role = (profile?.role as UserRole) || 'user';

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator' || isAdmin;
  const isAuthenticated = !!user;

  return useMemo(() => ({
    isAdmin,
    isModerator,
    isAuthenticated,
    role,
    profile,
    user,
  }), [isAdmin, isModerator, isAuthenticated, role, profile, user]);
}
