import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';
import {
  getCustomerCreditStatus,
  recordCreditSale,
  getCustomerCreditLedger,
  recordCustomerPayment,
  updateCustomerCreditLimit,
  getCustomerCreditReport,
  getCustomerOverdueReport,
  getVendorCreditStatus,
  recordCreditPurchase,
  getVendorCreditLedger,
  recordVendorPayment,
  updateVendorCreditLimit,
  getVendorCreditReport,
  getRunningSalesHistory,
} from '../controllers/creditController';

const router = Router();

// Global Auth for all Credit routes
router.use(authenticateJWT);

// ==========================================
// 1. CUSTOMER CREDIT OPERATIONS
// ==========================================
// Specific reports first to avoid param collision
router.get(
  '/credit-reports/customers',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getCustomerCreditReport
);
router.get(
  '/credit-reports/customers/overdue',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getCustomerOverdueReport
);

router.get(
  '/customers/:customer_id/credit-status',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getCustomerCreditStatus
);
router.get(
  '/customers/:customer_id/credit-ledger',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getCustomerCreditLedger
);
router.put(
  '/customers/:customer_id/credit-limit',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager']),
  updateCustomerCreditLimit
);

router.post(
  '/credit-sales',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  recordCreditSale
);
router.post(
  '/customer-payments',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  recordCustomerPayment
);

// ==========================================
// 2. VENDOR CREDIT OPERATIONS
// ==========================================
router.get(
  '/credit-reports/vendors',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getVendorCreditReport
);

router.get(
  '/vendors/:vendor_id/credit-status',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getVendorCreditStatus
);
router.get(
  '/vendors/:vendor_id/credit-ledger',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getVendorCreditLedger
);
router.put(
  '/vendors/:vendor_id/credit-limit',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager']),
  updateVendorCreditLimit
);

router.post(
  '/credit-purchases',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager']),
  recordCreditPurchase
);
router.post(
  '/vendor-payments',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager']),
  recordVendorPayment
);

// ==========================================
// 3. RUNNING SALE HISTORY (CASH SALES)
// ==========================================
router.get(
  '/running-sales',
  rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']),
  getRunningSalesHistory
);

export default router;
