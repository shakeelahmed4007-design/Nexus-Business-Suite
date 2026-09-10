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
      <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-ink-600 dark:text-ink-300">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // Check if session exists in localStorage as a fallback during refresh
  const storedLocal = localStorage.getItem('nexus_current_session');
  if (!user && !storedLocal) {
    return <Navigate to="/login" replace />;
  }

  const activeRole = role || (user?.user_metadata?.role as UserRole) || 'super_admin';

  if (allowedRoles && allowedRoles.length > 0) {
    const adminTier = ['super_admin', 'admin', 'shop_admin'];
    const staffTier = ['sales', 'staff'];

    const isAdminRole = adminTier.includes(activeRole);
    const isStaffRole = staffTier.includes(activeRole);

    const isAllowedAdmin = allowedRoles.some((r) => adminTier.includes(r));
    const isAllowedStaff = allowedRoles.some((r) => staffTier.includes(r));

    if (isAdminRole && isAllowedAdmin) {
      return <>{children}</>;
    }

    if (isStaffRole && isAllowedStaff) {
      return <>{children}</>;
    }

    // Role mismatch fallbacks
    if (isAdminRole) {
      return <Navigate to="/" replace />;
    } else if (isStaffRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
