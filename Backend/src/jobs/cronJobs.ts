import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { CallingDataService } from '../services/callingDataService';

const callingDataService = new CallingDataService();

export const initializeCronJobs = () => {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily CRM cron jobs (Overdue tasks & Calling data expiry)...');
    try {
      await markOverdueTasksAsync();
      const expiryResult = await callingDataService.checkAndExpireCallingData();
      console.log(`✅ Cron jobs finished: Expired ${expiryResult.expired} calling data records.`);
    } catch (err) {
      console.error('❌ Error executing daily CRM cron jobs:', err);
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

    // Insert activity log
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

async function runImmediateCronChecks() {
  try {
    await markOverdueTasksAsync();
    await callingDataService.checkAndExpireCallingData();
  } catch (err) {
    console.warn('Initial cron check notice:', err);
  }
}
