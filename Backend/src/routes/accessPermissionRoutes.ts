import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import {
  grantAccess,
  revokeAccess,
  getAccessGrants,
} from '../controllers/accessPermissionController';

const router = Router();

router.use(authenticateJWT);

router.post('/grant', grantAccess);
router.post('/revoke', revokeAccess);
router.get('/:resourceType/:resourceId', getAccessGrants);

export default router;
