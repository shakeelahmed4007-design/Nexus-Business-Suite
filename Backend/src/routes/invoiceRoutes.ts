import { Router } from 'express';
import { getInvoices, getInvoiceById, generateInvoicePdf } from '../controllers/invoiceController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJWT, getInvoices);
router.get('/:invoice_id', authenticateJWT, getInvoiceById);
router.post('/:invoice_id/pdf', authenticateJWT, generateInvoicePdf);

export default router;
