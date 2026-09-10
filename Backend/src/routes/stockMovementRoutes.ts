import { Router } from 'express';
import { getStockMovements } from '../controllers/stockMovementController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJWT, getStockMovements);

export default router;
