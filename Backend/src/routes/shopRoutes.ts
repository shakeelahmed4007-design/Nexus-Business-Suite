import { Router } from 'express';
import { listShops, updateModuleAccess } from '../controllers/shopController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJWT, listShops);
router.patch('/:shopId/module-access', authenticateJWT, requireRoles(['super_admin']), updateModuleAccess);

export default router;
