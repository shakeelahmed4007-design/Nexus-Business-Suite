import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/shared/context/AuthContext';

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function RequireRole({ children, allowedRoles }: RequireRoleProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const activeRole = role || (user.user_metadata?.role as UserRole);

  if (!activeRole) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    if (activeRole === 'admin' || activeRole === 'shop_admin') {
      return <Navigate to="/admin" replace />;
    } else if (activeRole === 'sales' || activeRole === 'staff') {
      return <Navigate to="/sales" replace />;
    } else if (activeRole === 'super_admin') {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
