import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AccessPermissionService } from '../services/accessPermissionService';

const permissionService = new AccessPermissionService();

export const grantAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const userRole = req.user?.role || 'staff';
    const shopId = req.user?.shop_id || '';

    const { resourceType, resourceId, grantedToUserId, grantedToRole, permissionLevel } = req.body;

    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        error: 'resourceType and resourceId are required',
        code: 'BAD_REQUEST',
      });
    }

    const permission = await permissionService.grantAccess(userId, userRole, shopId, {
      resourceType,
      resourceId,
      grantedToUserId,
      grantedToRole,
      permissionLevel,
    });

    return res.status(201).json({
      success: true,
      data: permission,
      message: `Access granted successfully for ${resourceType}`,
    });
  } catch (err) {
    next(err);
  }
};

export const revokeAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const { resourceType, resourceId, grantedToUserId, grantedToRole } = req.body;

    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        error: 'resourceType and resourceId are required',
        code: 'BAD_REQUEST',
      });
    }

    await permissionService.revokeAccess(userId, shopId, {
      resourceType,
      resourceId,
      grantedToUserId,
      grantedToRole,
    });

    return res.json({
      success: true,
      message: `Access revoked successfully for ${resourceType}`,
    });
  } catch (err) {
    next(err);
  }
};

export const getAccessGrants = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user?.shop_id || '';
    const { resourceType, resourceId } = req.params;

    const grants = await permissionService.getAccessGrants(
      shopId,
      resourceType as any,
      resourceId
    );

    return res.json({
      success: true,
      data: grants,
    });
  } catch (err) {
    next(err);
  }
};
