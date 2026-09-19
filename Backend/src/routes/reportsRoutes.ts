import { Router } from 'express';
import { getInventoryDashboard, getSalesDashboard, getFinancialDashboard } from '../controllers/reportsController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.get('/inventory', authenticateJWT, getInventoryDashboard);
router.get('/sales', authenticateJWT, getSalesDashboard);
router.get('/financial', authenticateJWT, getFinancialDashboard);

export default router;
