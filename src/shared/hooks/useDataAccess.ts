import { useAuth } from '@/shared/context/AuthContext';
import {
  getAdminByEmail,
  getNestedCrudPermissions,
  getCrudFlags,
  countAllowedPermissions,
} from '@/shared/lib/adminStore';

export function useDataAccess(moduleKey?: string) {
  const { user, profile, role } = useAuth();

  const email = (user?.email || profile?.email || '').toLowerCase().trim();
  const cleanRole = (role || (user?.user_metadata?.role as string) || '').toLowerCase().trim();
  const isSuper = cleanRole === 'super_admin' || email === 'admin@nexus.com' || email === 'superadmin@nexus.com';

  // Super admin always has full CRUD access to all modules
  if (isSuper) {
    return {
      hasAccess: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      isSuperAdmin: true,
      permissions: getNestedCrudPermissions(true),
    };
  }

  // Look up admin profile or store entry by email
  if (email) {
    const admin = getAdminByEmail(email);
    if (admin) {
      const perms = admin.permissions || getNestedCrudPermissions(false);
      const crud = getCrudFlags(perms, moduleKey);

      return {
        hasAccess: crud.access,
        canCreate: crud.can_create,
        canEdit: crud.can_edit,
        canDelete: crud.can_delete,
        isSuperAdmin: false,
        permissions: perms,
        allowedCount: countAllowedPermissions(perms),
      };
    }
  }

  // Non-superadmin without explicit permission defaults to FALSE (Restricted)
  return {
    hasAccess: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    isSuperAdmin: false,
    permissions: getNestedCrudPermissions(false),
    allowedCount: 0,
  };
}
