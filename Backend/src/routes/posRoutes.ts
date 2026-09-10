import { Router } from 'express';
import { openSession, closeSession, checkout } from '../controllers/posController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/session/open', authenticateJWT, openSession);
router.post('/session/close', authenticateJWT, closeSession);
router.post('/checkout', authenticateJWT, checkout);

export default router;
