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
  getCustomerCreditStatus,
  getCustomerCreditLedger,
  updateCustomerCreditLimit,
} from '../controllers/creditController';

import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  completeTask,
  addTaskComment,
  getTaskComments,
  getTaskStatusHistory,
  getTaskMetrics,
  getTaskTemplates,
  createTaskTemplate,
  runDailyReminders,
  deleteTask,
  getTasksByCustomer,
  getTasksByLead,
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

import {
  getFollowupSuggestions,
  dismissFollowupSuggestion,
  restoreFollowupSuggestion,
} from '../controllers/smartFollowupController';

const router = Router();

// Global Auth for all CRM routes
router.use(authenticateJWT);

// ==========================================
// 1. LEAD MANAGEMENT ENDPOINTS
// ==========================================
router.post('/leads', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), createLead);
router.post('/leads/bulk-import', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), bulkImportLeads);
router.get('/leads', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getLeads);
router.get('/leads/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getLead);
router.put('/leads/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), updateLead);
router.put('/leads/:id/status', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), updateLeadStatus);
router.delete('/leads/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), deleteLead);

// ==========================================
// 2. CUSTOMER DATA ENDPOINTS
// ==========================================
router.post('/customers', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), createCustomer);
router.get('/customers', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCustomers);
router.get('/customers/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCustomer);
router.put('/customers/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), updateCustomer);
router.delete('/customers/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), deleteCustomer);
router.put('/customers/:id/convert-from-lead/:leadId', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), convertLeadToCustomer);
router.get('/customers/:id/order-history', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCustomerOrderHistory);
router.get('/customers/:id/payment-history', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCustomerPaymentHistory);
router.get('/customers/:id/credit-status', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCustomerCreditStatus);
router.get('/customers/:id/credit-ledger', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCustomerCreditLedger);
router.put('/customers/:id/credit-limit', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), updateCustomerCreditLimit);
router.get('/customers/:customerId/tasks', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTasksByCustomer);

// ==========================================
// 3. TASK & FOLLOW-UP ENDPOINTS
// ==========================================
// Specific routes first to avoid parameter collision
router.get('/tasks/summary/metrics', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTaskMetrics);
router.post('/tasks/run-daily-reminders', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), runDailyReminders);
router.get('/tasks/customer/:customerId', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTasksByCustomer);
router.get('/tasks/lead/:leadId', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTasksByLead);

// Task Templates
router.get('/task-templates', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTaskTemplates);
router.post('/task-templates', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), createTaskTemplate);

// General Task CRUD & Collaboration
router.post('/tasks', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), createTask);
router.get('/tasks', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTasks);
router.get('/tasks/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTask);
router.put('/tasks/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), updateTask);
router.put('/tasks/:id/status', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), updateTaskStatus);
router.put('/tasks/:id/complete', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), completeTask);
router.post('/tasks/:id/comments', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), addTaskComment);
router.get('/tasks/:id/comments', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTaskComments);
router.get('/tasks/:id/history', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getTaskStatusHistory);
router.delete('/tasks/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), deleteTask);

// ==========================================
// 4. CALLING DATA ENDPOINTS
// ==========================================
router.post('/calling-data', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), addCallingNumber);
router.post('/calling-data/bulk-upload', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), bulkUploadCallingData);
router.get('/calling-data', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCallingData);
router.get('/calling-data/available', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), getAvailableNumbers);
router.get('/calling-data/my-assigned', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getMyAssignedCallingData);
router.post('/calling-data/expiry-checker', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), runExpiryChecker);
router.post('/calling-data/:id/assign', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), assignCallingData);
router.post('/calling-data/:id/log-call', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), logCall);
router.put('/calling-data/:id/reassign', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), reassignCallingData);
router.delete('/calling-data/:id', rbacMiddleware(['super_admin', 'shop_admin', 'manager']), deleteCallingData);
router.get('/calling-data/:id/call-history', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getCallHistory);

// ==========================================
// 5. SMART FOLLOW-UP ASSISTANT ENDPOINTS
// ==========================================
router.get('/smart-followup', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), getFollowupSuggestions);
router.post('/smart-followup/:id/dismiss', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), dismissFollowupSuggestion);
router.post('/smart-followup/:id/restore', rbacMiddleware(['super_admin', 'shop_admin', 'manager', 'staff']), restoreFollowupSuggestion);

export default router;
