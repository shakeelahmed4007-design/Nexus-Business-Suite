import { Router } from 'express';
import { createProduct, getProducts, getStock, importProducts } from '../controllers/productController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateJWT, createProduct);
router.get('/', authenticateJWT, getProducts);
router.post('/import', authenticateJWT, importProducts);
router.get('/stock/:product_id', authenticateJWT, getStock);

export default router;
