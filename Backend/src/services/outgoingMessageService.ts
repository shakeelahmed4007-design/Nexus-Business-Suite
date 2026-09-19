import axios from 'axios';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { decryptToken } from '../utils/encryption';
import { socketService } from './socketService';
import { integrationAccountService } from './integrationAccountService';
import { fallbackMessagesStore } from './unifiedInboxService';

export interface SendMessageParams {
  shop_id: string;
  thread_id: string;
  provider: 'whatsapp' | 'email' | 'facebook' | 'instagram' | 'website';
  recipient_identifier: string; // phone number, email, or FB/IG ID
  message_text: string;
  subject?: string; // For Email
  attachments?: any[];
  integration_account_id?: string;
  user_id?: string;
}

export class OutgoingMessageService {
  /**
   * Send outgoing reply message via external channel API and store in database
   */
  public async sendMessage(params: SendMessageParams) {
    const {
      shop_id,
      thread_id,
      provider,
      recipient_identifier,
      message_text,
      subject,
      attachments = [],
      integration_account_id,
    } = params;

    let account: any = null;
    try {
      let accountQuery = supabaseAdmin
        .from('integration_accounts')
        .select('*')
        .eq('shop_id', shop_id)
        .eq('provider', provider)
        .eq('status', 'active');

      if (integration_account_id) {
        accountQuery = accountQuery.eq('id', integration_account_id);
      } else {
        accountQuery = accountQuery.order('is_primary', { ascending: false });
      }

      const { data: accounts } = await accountQuery;
      account = accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (e) {
      // Fallback
    }

    const senderIdentifier = account ? account.account_identifier : `system_${provider}`;
    const accessToken = account?.access_token_encrypted
      ? decryptToken(account.access_token_encrypted)
      : null;

    let customerId: string | null = null;
    let leadId: string | null = null;

    if (thread_id.startsWith('cust_')) {
      customerId = thread_id.replace('cust_', '');
    } else if (thread_id.startsWith('lead_')) {
      leadId = thread_id.replace('lead_', '');
    }

    let externalMessageId = `ext_out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | null = null;

    try {
      if (accessToken && !accessToken.startsWith('mock_')) {
        if (provider === 'whatsapp') {
          const wabaPhoneId = account.metadata?.phone_number_id || 'MOCK_PHONE_ID';
          const resp = await axios.post(
            `https://graph.facebook.com/v18.0/${wabaPhoneId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: recipient_identifier.replace(/[^\d+]/g, ''),
              type: 'text',
              text: { body: message_text },
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (resp.data?.messages?.[0]?.id) {
            externalMessageId = resp.data.messages[0].id;
          }
        } else if (provider === 'email') {
          const rawMessage = Buffer.from(
            `To: ${recipient_identifier}\r\nSubject: ${subject || 'Reply from CRM'}\r\n\r\n${message_text}`
          ).toString('base64url');

          const resp = await axios.post(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            { raw: rawMessage },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (resp.data?.id) {
            externalMessageId = resp.data.id;
          }
        }
      } else {
        console.log(`💬 [Outgoing Message] Mock dispatch via ${provider} to ${recipient_identifier}: "${message_text}"`);
      }
    } catch (err: any) {
      console.error(`❌ Error dispatching outgoing ${provider} message:`, err.response?.data || err.message);
      status = 'failed';
      errorMessage = err.response?.data?.error?.message || err.message;
    }

    let messageRecord: any;

    try {
      const { data, error } = await supabaseAdmin
        .from('integration_messages')
        .insert({
          shop_id,
          integration_account_id: account?.id || null,
          provider,
          direction: 'outgoing',
          sender_identifier: senderIdentifier,
          recipient_identifier,
          customer_id: customerId,
          lead_id: leadId,
          thread_id,
          external_message_id: externalMessageId,
          subject: subject || null,
          message_text,
          message_type: 'text',
          attachments,
          status,
          is_read: true,
          sent_at: new Date().toISOString(),
          raw_payload: { errorMessage },
        })
        .select()
        .single();

      if (error) throw error;
      messageRecord = data;
    } catch (err: any) {
      console.warn('⚠️ Supabase outgoing message insertion fallback active:', err.message);
      messageRecord = {
        id: `msg_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        shop_id,
        integration_account_id: account?.id || null,
        provider,
        direction: 'outgoing',
        sender_identifier: senderIdentifier,
        recipient_identifier,
        customer_id: customerId,
        lead_id: leadId,
        thread_id,
        external_message_id: externalMessageId,
        subject: subject || null,
        message_text,
        message_type: 'text',
        attachments,
        status,
        is_read: true,
        created_at: new Date().toISOString(),
      };
      fallbackMessagesStore.push(messageRecord);
    }

    // 5. Update account last_used_at timestamp
    if (account) {
      await supabaseAdmin
        .from('integration_accounts')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', account.id);
    }

    // 6. Broadcast real-time WebSocket event
    socketService.broadcastToShop(shop_id, 'MESSAGE_SENT', {
      message: messageRecord,
      thread_id,
    });

    await integrationAccountService.logActivity(shop_id, provider, 'OUTGOING_MESSAGE_SENT', {
      message_id: messageRecord.id,
      recipient: recipient_identifier,
      status,
    });

    return messageRecord;
  }

  /**
   * Process webhook message status update (e.g., delivered or read) from Meta/WhatsApp
   */
  public async updateMessageStatus(
    externalMessageId: string,
    status: 'delivered' | 'read' | 'failed',
    timestampIso?: string
  ) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'delivered') updateData.delivered_at = timestampIso || new Date().toISOString();
    if (status === 'read') updateData.read_at = timestampIso || new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('integration_messages')
      .update(updateData)
      .eq('external_message_id', externalMessageId)
      .select('id, shop_id, thread_id, status, read_at, delivered_at')
      .maybeSingle();

    if (updated) {
      socketService.broadcastToShop(updated.shop_id, 'MESSAGE_STATUS_UPDATE', {
        message_id: updated.id,
        thread_id: updated.thread_id,
        status: updated.status,
        delivered_at: updated.delivered_at,
        read_at: updated.read_at,
      });
    }

    return updated;
  }
}

export const outgoingMessageService = new OutgoingMessageService();
