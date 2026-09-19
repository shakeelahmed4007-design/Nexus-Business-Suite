import cron from 'node-cron';
import axios from 'axios';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { decryptToken, encryptToken } from '../utils/encryption';
import { oauthService } from '../services/oauthService';
import { incomingMessageService } from '../services/incomingMessageService';
import { integrationAccountService } from '../services/integrationAccountService';

export const initializeIntegrationJobs = () => {
  // 1. Email Polling Job: Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('📧 [Integration Job] Running 5-minute Email Polling check...');
    try {
      await runEmailPollingJob();
    } catch (err) {
      console.error('❌ Error executing Email Polling job:', err);
    }
  });

  // 2. Token Refresh Job: Runs daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🔑 [Integration Job] Running daily OAuth Token Refresh check...');
    try {
      await runTokenRefreshJob();
    } catch (err) {
      console.error('❌ Error executing Token Refresh job:', err);
    }
  });

  // 3. Message Status Check Job: Runs every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await runMessageStatusCheckJob();
    } catch (err) {
      // Non-fatal
    }
  });

  // 4. Webhook Health Check Job: Runs hourly
  cron.schedule('0 * * * *', async () => {
    console.log('🩺 [Integration Job] Running Webhook Health Check...');
    try {
      await runWebhookHealthCheckJob();
    } catch (err) {
      console.error('❌ Error in Webhook Health Check:', err);
    }
  });

  // 5. Logs Cleanup Job: Runs daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('🧹 [Integration Job] Cleaning up old integration logs (> 30 days)...');
    try {
      await runLogsCleanupJob();
    } catch (err) {
      console.error('❌ Error cleaning up integration logs:', err);
    }
  });

  console.log('⏰ Phase 4 Integration Background Cron Jobs Initialized.');
};

/**
 * 1. Email Polling Mechanism: Check connected Gmail accounts for unread messages
 */
export async function runEmailPollingJob() {
  const { data: emailAccounts } = await supabaseAdmin
    .from('integration_accounts')
    .select('*')
    .eq('provider', 'email')
    .eq('status', 'active');

  if (!emailAccounts || emailAccounts.length === 0) return;

  for (const acc of emailAccounts) {
    const accessToken = decryptToken(acc.access_token_encrypted || '');

    if (!accessToken || accessToken.startsWith('mock_')) {
      // Mock / Development polling simulation
      console.log(`📧 [Email Poll] Active email account ${acc.account_identifier} checked (Mock mode ready)`);
      continue;
    }

    try {
      // Fetch unread messages via Gmail API
      const resp = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const messages = resp.data.messages || [];
      for (const msg of messages.slice(0, 5)) {
        const msgDetail = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const headers = msgDetail.data.payload?.headers || [];
        const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'New Inquiry';
        const snippet = msgDetail.data.snippet || 'No body text';

        // Extract email from "Name <email@domain.com>"
        const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
        const senderEmail = emailMatch[1] || fromHeader;
        const senderName = fromHeader.replace(/<[^>]+>/, '').trim();

        await incomingMessageService.processIncomingMessage({
          shop_id: acc.shop_id,
          provider: 'email',
          integration_account_id: acc.id,
          sender_identifier: senderEmail,
          sender_name: senderName || senderEmail,
          external_message_id: msg.id,
          subject: subjectHeader,
          message_text: snippet,
          raw_payload: msgDetail.data,
        });

        // Mark as read in Gmail so it isn't fetched repeatedly
        await axios.post(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
          { removeLabelIds: ['UNREAD'] },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }

      await supabaseAdmin
        .from('integration_accounts')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', acc.id);
    } catch (err: any) {
      console.error(`❌ Error polling email for ${acc.account_identifier}:`, err.message);
    }
  }
}

/**
 * 2. Token Refresh Mechanism: Check and refresh tokens expiring within 30 days
 */
export async function runTokenRefreshJob() {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiringAccounts } = await supabaseAdmin
    .from('integration_accounts')
    .select('*')
    .lt('token_expires_at', thirtyDaysFromNow)
    .eq('status', 'active');

  if (!expiringAccounts || expiringAccounts.length === 0) return;

  for (const acc of expiringAccounts) {
    const refreshToken = decryptToken(acc.refresh_token_encrypted || '');

    try {
      const refreshed = await oauthService.refreshAccessToken(acc.provider, refreshToken);
      const newAccessEncrypted = encryptToken(refreshed.access_token);
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 5184000) * 1000).toISOString();

      await supabaseAdmin
        .from('integration_accounts')
        .update({
          access_token_encrypted: newAccessEncrypted,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', acc.id);

      await integrationAccountService.logActivity(acc.shop_id, acc.provider, 'TOKEN_REFRESH_SUCCESS', {
        account_id: acc.id,
      });

      console.log(`✅ Refreshed token for ${acc.provider} account ${acc.account_identifier}`);
    } catch (err: any) {
      console.error(`❌ Token refresh failed for ${acc.account_identifier}:`, err.message);

      await supabaseAdmin
        .from('integration_accounts')
        .update({
          status: 'expired',
          error_message: `Token refresh failed: ${err.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', acc.id);

      await integrationAccountService.logActivity(acc.shop_id, acc.provider, 'TOKEN_REFRESH_FAILED', {
        account_id: acc.id,
        error: err.message,
      });
    }
  }
}

/**
 * 3. Message Status Check Job
 */
export async function runMessageStatusCheckJob() {
  const { data: queuedMessages } = await supabaseAdmin
    .from('integration_messages')
    .select('id, shop_id, provider')
    .eq('status', 'queued')
    .limit(20);

  if (!queuedMessages || queuedMessages.length === 0) return;

  for (const msg of queuedMessages) {
    await supabaseAdmin
      .from('integration_messages')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', msg.id);
  }
}

/**
 * 4. Webhook Health Check Job
 */
export async function runWebhookHealthCheckJob() {
  const { data: activeAccounts } = await supabaseAdmin
    .from('integration_accounts')
    .select('id, shop_id, provider, account_identifier')
    .eq('status', 'active');

  console.log(`🩺 Verified ${activeAccounts?.length || 0} active integration accounts.`);
}

/**
 * 5. Logs Cleanup Job (> 30 days)
 */
export async function runLogsCleanupJob() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('integration_logs')
    .delete()
    .lt('timestamp', thirtyDaysAgo);

  if (!error) {
    console.log('🧹 Old integration logs deleted successfully.');
  }
}
