import { Router } from 'express';
import { createVendor, getVendors, updateVendor, approveVendor } from '../controllers/vendorController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateJWT, createVendor);
router.get('/', authenticateJWT, getVendors);
router.put('/:vendor_id', authenticateJWT, updateVendor);
router.put('/:vendor_id/approve', authenticateJWT, approveVendor);

export default router;
