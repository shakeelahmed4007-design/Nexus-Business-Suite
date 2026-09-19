import { supabaseAdmin } from '../config/supabaseAdmin';
import { AccessPermission, GrantAccessRequest, ResourceType, RevokeAccessRequest, UserRole } from '../models/accessPermissionModel';

// In-memory permission cache for environments without access_permissions database table created yet
const inMemoryPermissions: AccessPermission[] = [];

export class AccessPermissionService {
  /**
   * Check if a user has access to a specific resource.
   * Access rule:
   * 1. User is the creator/owner (ownerId === userId)
   * 2. User ID is explicitly granted access
   * 3. User Role is explicitly granted access
   */
  async hasAccess(
    userId: string,
    userRole: UserRole,
    shopId: string,
    resourceType: ResourceType,
    resourceId: string,
    ownerId?: string
  ): Promise<boolean> {
    // Rule 1: Owner always has full access to their own data
    if (ownerId && ownerId === userId) {
      return true;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('access_permissions')
        .select('*')
        .eq('shop_id', shopId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (!error && data && data.length > 0) {
        const hasDirectUserGrant = data.some((p: any) => p.granted_to_user_id === userId);
        const hasRoleGrant = data.some((p: any) => p.granted_to_role === userRole);
        return hasDirectUserGrant || hasRoleGrant;
      }
    } catch {
      // Fallback to in-memory store
    }

    // Check in-memory store
    const memMatch = inMemoryPermissions.some(
      (p) =>
        p.shop_id === shopId &&
        p.resource_type === resourceType &&
        p.resource_id === resourceId &&
        (p.granted_to_user_id === userId || p.granted_to_role === userRole)
    );

    return memMatch;
  }

  /**
   * Filter accessible IDs for a resource list query
   */
  async getAccessibleResourceIds(
    userId: string,
    userRole: UserRole,
    shopId: string,
    resourceType: ResourceType
  ): Promise<string[] | null> {
    // Returns array of explicit resource_ids granted to this user/role
    try {
      const { data, error } = await supabaseAdmin
        .from('access_permissions')
        .select('resource_id')
        .eq('shop_id', shopId)
        .eq('resource_type', resourceType);

      if (!error && data) {
        const grantedIds = data
          .filter((p: any) => p.granted_to_user_id === userId || p.granted_to_role === userRole)
          .map((p: any) => p.resource_id);
        return grantedIds;
      }
    } catch {
      // Fallback to memory
    }

    return inMemoryPermissions
      .filter(
        (p) =>
          p.shop_id === shopId &&
          p.resource_type === resourceType &&
          (p.granted_to_user_id === userId || p.granted_to_role === userRole)
      )
      .map((p) => p.resource_id);
  }

  /**
   * Grant access to a user or role for a resource
   */
  async grantAccess(
    userId: string,
    userRole: UserRole,
    shopId: string,
    request: GrantAccessRequest
  ): Promise<AccessPermission> {
    if (!request.grantedToUserId && !request.grantedToRole) {
      throw new Error('Must specify either grantedToUserId or grantedToRole');
    }

    const permissionLevel = request.permissionLevel || 'read';
    const now = new Date().toISOString();

    const newGrant: AccessPermission = {
      id: `perm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      shop_id: shopId,
      resource_type: request.resourceType,
      resource_id: request.resourceId,
      owner_id: userId,
      owner_role: userRole,
      granted_to_user_id: request.grantedToUserId || null,
      granted_to_role: request.grantedToRole || null,
      permission_level: permissionLevel,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabaseAdmin
        .from('access_permissions')
        .insert({
          shop_id: shopId,
          resource_type: request.resourceType,
          resource_id: request.resourceId,
          owner_id: userId,
          owner_role: userRole,
          granted_to_user_id: request.grantedToUserId || null,
          granted_to_role: request.grantedToRole || null,
          permission_level: permissionLevel,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        return data as AccessPermission;
      }
    } catch {
      // Fallback
    }

    inMemoryPermissions.push(newGrant);
    return newGrant;
  }

  /**
   * Revoke access for a user or role from a resource
   */
  async revokeAccess(
    userId: string,
    shopId: string,
    request: RevokeAccessRequest
  ): Promise<void> {
    try {
      let query = supabaseAdmin
        .from('access_permissions')
        .delete()
        .eq('shop_id', shopId)
        .eq('resource_type', request.resourceType)
        .eq('resource_id', request.resourceId)
        .eq('owner_id', userId);

      if (request.grantedToUserId) {
        query = query.eq('granted_to_user_id', request.grantedToUserId);
      }
      if (request.grantedToRole) {
        query = query.eq('granted_to_role', request.grantedToRole);
      }

      await query;
    } catch {
      // Ignore DB errors
    }

    // Remove from in-memory cache as well
    for (let i = inMemoryPermissions.length - 1; i >= 0; i--) {
      const p = inMemoryPermissions[i];
      if (
        p.shop_id === shopId &&
        p.resource_type === request.resourceType &&
        p.resource_id === request.resourceId &&
        p.owner_id === userId &&
        ((request.grantedToUserId && p.granted_to_user_id === request.grantedToUserId) ||
          (request.grantedToRole && p.granted_to_role === request.grantedToRole))
      ) {
        inMemoryPermissions.splice(i, 1);
      }
    }
  }

  /**
   * List all access grants for a resource
   */
  async getAccessGrants(
    shopId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<AccessPermission[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('access_permissions')
        .select('*')
        .eq('shop_id', shopId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (!error && data) {
        return data as AccessPermission[];
      }
    } catch {
      // Fallback
    }

    return inMemoryPermissions.filter(
      (p) => p.shop_id === shopId && p.resource_type === resourceType && p.resource_id === resourceId
    );
  }
}
