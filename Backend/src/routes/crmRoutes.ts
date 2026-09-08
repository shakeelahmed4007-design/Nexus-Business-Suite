import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';

import {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  updateLeadStatus,
  bulkImportLeads,
} from '../controllers/leadController';

import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  convertLeadToCustomer,
  getCustomerOrderHistory,
  getCustomerPaymentHistory,
} from '../controllers/customerController';

import {
  createTask,
  getTasks,
  getMyTasks,
  getTask,
  updateTask,
  completeTask,
  markTaskOverdue,
  deleteTask,
  getOverdueTasks,
  getTasksByLead,
  getTasksByCustomer,
} from '../controllers/taskController';

import {
  addCallingNumber,
  bulkUploadCallingData,
  getCallingData,
  getAvailableNumbers,
  assignCallingData,
  logCall,
  reassignCallingData,
  deleteCallingData,
  getCallHistory,
  runExpiryChecker,
  getMyAssignedCallingData,
} from '../controllers/callingDataController';

const router = Router();

// Global Auth for all CRM routes
router.use(authenticateJWT);

// ==========================================
// 1. LEAD MANAGEMENT ENDPOINTS
// ==========================================
router.post('/leads', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), createLead);
router.post('/leads/bulk-import', rbacMiddleware(['super_admin', 'shop_admin']), bulkImportLeads);
router.get('/leads', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getLeads);
router.get('/leads/:id', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getLead);
router.put('/leads/:id', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), updateLead);
router.put('/leads/:id/status', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), updateLeadStatus);
router.delete('/leads/:id', rbacMiddleware(['super_admin', 'shop_admin']), deleteLead);

// ==========================================
// 2. CUSTOMER DATA ENDPOINTS
// ==========================================
router.post('/customers', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), createCustomer);
router.get('/customers', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getCustomers);
router.get('/customers/:id', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getCustomer);
router.put('/customers/:id', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), updateCustomer);
router.delete('/customers/:id', rbacMiddleware(['super_admin', 'shop_admin']), deleteCustomer);
router.put('/customers/:id/convert-from-lead/:leadId', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), convertLeadToCustomer);
router.get('/customers/:id/order-history', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getCustomerOrderHistory);
router.get('/customers/:id/payment-history', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getCustomerPaymentHistory);

// ==========================================
// 3. TASK & FOLLOW-UP ENDPOINTS
// ==========================================
router.post('/tasks', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), createTask);
router.get('/tasks', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getTasks);
router.get('/tasks/my-tasks', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getMyTasks);
router.get('/tasks/overdue', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getOverdueTasks);
router.get('/tasks/lead/:leadId', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getTasksByLead);
router.get('/tasks/customer/:customerId', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getTasksByCustomer);
router.get('/tasks/:id', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getTask);
router.put('/tasks/:id', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), updateTask);
router.put('/tasks/:id/complete', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), completeTask);
router.put('/tasks/:id/mark-overdue', rbacMiddleware(['super_admin', 'shop_admin']), markTaskOverdue);
router.delete('/tasks/:id', rbacMiddleware(['super_admin', 'shop_admin']), deleteTask);

// ==========================================
// 4. CALLING DATA ENDPOINTS
// ==========================================
router.post('/calling-data', rbacMiddleware(['super_admin', 'shop_admin']), addCallingNumber);
router.post('/calling-data/bulk-upload', rbacMiddleware(['super_admin', 'shop_admin']), bulkUploadCallingData);
router.get('/calling-data', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getCallingData);
router.get('/calling-data/available', rbacMiddleware(['super_admin', 'shop_admin']), getAvailableNumbers);
router.get('/calling-data/my-assigned', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getMyAssignedCallingData);
router.post('/calling-data/expiry-checker', rbacMiddleware(['super_admin', 'shop_admin']), runExpiryChecker);
router.post('/calling-data/:id/assign', rbacMiddleware(['super_admin', 'shop_admin']), assignCallingData);
router.post('/calling-data/:id/log-call', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), logCall);
router.put('/calling-data/:id/reassign', rbacMiddleware(['super_admin', 'shop_admin']), reassignCallingData);
router.delete('/calling-data/:id', rbacMiddleware(['super_admin', 'shop_admin']), deleteCallingData);
router.get('/calling-data/:id/call-history', rbacMiddleware(['super_admin', 'shop_admin', 'staff']), getCallHistory);

export default router;
