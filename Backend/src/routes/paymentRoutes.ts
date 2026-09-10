import { Router } from 'express';
import { recordPayment, getPayments, getOutstanding } from '../controllers/paymentController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateJWT, recordPayment);
router.get('/', authenticateJWT, getPayments);
router.get('/outstanding', authenticateJWT, getOutstanding);

export default router;
