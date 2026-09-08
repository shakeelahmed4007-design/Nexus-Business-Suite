import { Router } from 'express';
import { getMe, createShopAdminUser } from '../controllers/authController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/me', authenticateJWT, getMe);
router.post('/create-shop-admin', authenticateJWT, requireRoles(['super_admin']), createShopAdminUser);

export default router;
