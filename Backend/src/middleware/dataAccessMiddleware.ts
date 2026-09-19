import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { AccessPermissionService } from '../services/accessPermissionService';
import { ResourceType } from '../models/accessPermissionModel';

const accessService = new AccessPermissionService();

/**
 * Apply Data Privacy Visibility Filter for Supabase queries.
 * Evaluates access rules:
 * - Return records where created_by_id = userId
 * - OR records where resource_id IN (grantedIds)
 */
export async function applyDataPrivacyFilter(
  query: any,
  userId: string,
  userRole: 'super_admin' | 'shop_admin' | 'staff',
  shopId: string,
  resourceType: ResourceType
): Promise<{ query: any; grantedIds: string[] }> {
  const grantedIds = await accessService.getAccessibleResourceIds(
    userId,
    userRole,
    shopId,
    resourceType
  );

  if (grantedIds && grantedIds.length > 0) {
    // Return records created by user OR explicitly granted to user
    const filterStr = `created_by_id.eq.${userId},id.in.(${grantedIds.join(',')})`;
    return { query: query.or(filterStr), grantedIds };
  } else {
    // Default privacy isolation: only records created by this exact user
    return { query: query.eq('created_by_id', userId), grantedIds: [] };
  }
}

/**
 * Check if the user has permission to read or mutate a single specific resource
 */
export async function verifyResourceAccess(
  userId: string,
  userRole: 'super_admin' | 'shop_admin' | 'staff',
  shopId: string,
  resourceType: ResourceType,
  resourceId: string,
  ownerId?: string
): Promise<boolean> {
  return await accessService.hasAccess(userId, userRole, shopId, resourceType, resourceId, ownerId);
}

/**
 * Express Middleware to enforce single-resource access check
 */
export const requireResourceAccess = (resourceType: ResourceType, idParamName = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || '';
      const userRole = req.user?.role || 'staff';
      const shopId = req.user?.shop_id || '';
      const resourceId = req.params[idParamName];

      if (!resourceId) {
        return res.status(400).json({ success: false, error: 'Resource ID missing in parameters' });
      }

      const hasAccess = await verifyResourceAccess(
        userId,
        userRole,
        shopId,
        resourceType,
        resourceId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: You do not have permission to access this ${resourceType}. Access must be granted by the data owner.`,
          code: 'DATA_PRIVACY_RESTRICTED',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
