import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export const rbacMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No active user session', code: 'UNAUTHORIZED' });
    }

    const role = (req.user.role || '').toLowerCase();
    const allowed = allowedRoles.map((r) => r.toLowerCase());

    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions for this action', code: 'FORBIDDEN' });
    }

    next();
  };
};
