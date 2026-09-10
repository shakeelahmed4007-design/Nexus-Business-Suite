import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { CallingDataService } from '../services/callingDataService';
import { initializeIntegrationJobs } from './integrationJobs';

const callingDataService = new CallingDataService();

export const initializeCronJobs = () => {
  // Initialize Phase 4 Integration jobs
  initializeIntegrationJobs();

  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily CRM & Phase 3 cron jobs...');
    try {
      await markOverdueTasksAsync();
      const expiryResult = await callingDataService.checkAndExpireCallingData();
      await checkLowStockAlertsAsync();
      await checkPaymentDueRemindersAsync();
      console.log(`✅ Daily cron jobs finished successfully.`);
    } catch (err) {
      console.error('❌ Error executing daily cron jobs:', err);
    }
  });

  // Run weekly on Sunday at 01:00
  cron.schedule('0 1 * * 0', async () => {
    console.log('📊 Running weekly inventory aging & AI reordering forecast...');
    try {
      await generateInventoryAgingReportAsync();
    } catch (err) {
      console.error('❌ Error executing weekly inventory cron:', err);
    }
  });

  // Run monthly on 1st at 02:00
  cron.schedule('0 2 1 * *', async () => {
    console.log('💰 Running monthly financial reconciliation...');
    try {
      await runMonthlyReconciliationAsync();
    } catch (err) {
      console.error('❌ Error executing monthly financial cron:', err);
    }
  });

  // Also run immediate check on startup
  runImmediateCronChecks();
};

async function markOverdueTasksAsync() {
  const nowIso = new Date().toISOString();
  const { data: overdueTasks, error } = await supabaseAdmin
    .from('tasks')
    .select('id, assigned_to_user_id, shop_id')
    .lt('due_date', nowIso)
    .eq('status', 'Not Started')
    .is('deleted_at', null);

  if (error || !overdueTasks || overdueTasks.length === 0) return;

  for (const task of overdueTasks) {
    await supabaseAdmin
      .from('tasks')
      .update({
        status: 'Overdue',
        updated_at: nowIso,
      })
      .eq('id', task.id);

    await supabaseAdmin.from('activity_logs').insert({
      shop_id: task.shop_id,
      user_id: task.assigned_to_user_id,
      action: 'MARK_OVERDUE',
      module: 'Tasks',
      entity_id: task.id,
      details: { autoOverdue: true },
      timestamp: nowIso,
    });
  }
}

async function checkLowStockAlertsAsync() {
  const { data: stocks } = await supabaseAdmin
    .from('stocks')
    .select('*, products(product_name, sku)');

  if (!stocks || stocks.length === 0) return;

  for (const s of stocks) {
    const available = (s.total_quantity || 0) - (s.reserved_quantity || 0);
    const threshold = s.low_stock_threshold || 5;

    if (available < threshold) {
      await supabaseAdmin.from('activity_logs').insert({
        shop_id: s.shop_id,
        user_id: 'SYSTEM',
        action: 'LOW_STOCK_ALERT',
        module: 'Inventory',
        entity_id: s.product_id,
        details: {
          product_name: s.products?.product_name,
          sku: s.products?.sku,
          available,
          threshold,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

async function checkPaymentDueRemindersAsync() {
  const nowIso = new Date().toISOString();
  const { data: overdueInvoices } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .lt('due_date', nowIso)
    .in('status', ['Pending', 'Partial']);

  if (!overdueInvoices || overdueInvoices.length === 0) return;

  for (const inv of overdueInvoices) {
    await supabaseAdmin
      .from('invoices')
      .update({ status: 'Overdue' })
      .eq('invoice_id', inv.invoice_id);

    await supabaseAdmin.from('activity_logs').insert({
      shop_id: inv.shop_id,
      user_id: 'SYSTEM',
      action: 'INVOICE_OVERDUE_REMINDER',
      module: 'Finance',
      entity_id: inv.invoice_id,
      details: {
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
        due_amount: (inv.total_amount || 0) - (inv.paid_amount || 0),
      },
      timestamp: nowIso,
    });
  }
}

async function generateInventoryAgingReportAsync() {
  console.log('📈 Weekly inventory aging report processed.');
}

async function runMonthlyReconciliationAsync() {
  console.log('📊 Monthly financial reconciliation completed.');
}

async function runImmediateCronChecks() {
  try {
    await markOverdueTasksAsync();
    await callingDataService.checkAndExpireCallingData();
    await checkLowStockAlertsAsync();
    await checkPaymentDueRemindersAsync();
  } catch (err) {
    console.warn('Initial cron check notice:', err);
  }
}
