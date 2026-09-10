import { Router } from 'express';
import { createOrder, getOrders, getOrderById, updateOrderStatus } from '../controllers/orderController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateJWT, createOrder);
router.get('/', authenticateJWT, getOrders);
router.get('/:order_id', authenticateJWT, getOrderById);
router.put('/:order_id/status', authenticateJWT, updateOrderStatus);

export default router;
