import { Router } from 'express';
import {
  checkCreditAvailability,
  advancedSaleCheckout,
  reserveInventory,
  releaseInventory,
  processReturn,
  reconcileStock,
  recordPayment,
  generateCustomerStatement,
  sendCustomerStatement,
  getCustomerStatementHistory,
  getShopSettings,
  updateShopSettings,
} from '../controllers/posAdvancedController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Module 1: Credit Limit Validation & Real-time availability
router.get('/customers/:customer_id/credit-availability', checkCreditAvailability);

// Module 2 & 3: Advanced Sale Checkout (Bulk & Running, Credit & Cash)
router.post('/sales/credit-sale', advancedSaleCheckout);
router.post('/checkout-advanced', advancedSaleCheckout);

// Module 3: Inventory Reservation & Synchronization
router.post('/inventory/reserve', reserveInventory);
router.delete('/inventory/reserve/:reservation_id', releaseInventory);
router.post('/sales/return', processReturn);
router.post('/inventory/reconcile', reconcileStock);

// Module 4: Detailed Payment Records & Statements
router.post('/payments/record', recordPayment);
router.get('/customers/:customer_id/statement/:period', generateCustomerStatement);
router.post('/statements/send/:statement_id', sendCustomerStatement);
router.get('/statements/history/:customer_id', getCustomerStatementHistory);

// POS Shop Settings (Hard block toggle, Bulk discount %, Tax rates)
router.get('/pos/settings', getShopSettings);
router.put('/pos/settings', updateShopSettings);

export default router;
