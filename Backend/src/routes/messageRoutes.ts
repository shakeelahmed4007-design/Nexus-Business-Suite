import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { sendMessage, getMyMessages, markAsRead } from '../controllers/messageController';

const router = Router();
router.use(authenticateJWT);

router.post('/', sendMessage);
router.get('/', getMyMessages);
router.put('/:id/read', markAsRead);

export default router;
