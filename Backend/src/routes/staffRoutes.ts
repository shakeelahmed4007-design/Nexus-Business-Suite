import { Router } from 'express';
import {
  createStaffUser,
  createStaffUserDedicated,
  createSalesUserDedicated,
  listStaffUsers,
  validateMemberDataHandler,
} from '../controllers/staffController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJWT, requireRoles(['super_admin', 'shop_admin']), listStaffUsers);
router.post('/create', authenticateJWT, requireRoles(['shop_admin']), createStaffUser);
router.post('/create-staff', createStaffUserDedicated);
router.post('/create-sales', createSalesUserDedicated);
router.post('/validate-member', validateMemberDataHandler);

export default router;

