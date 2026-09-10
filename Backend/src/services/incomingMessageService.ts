import { supabaseAdmin } from '../config/supabaseAdmin';
import { socketService } from './socketService';
import { integrationAccountService } from './integrationAccountService';
import { fallbackMessagesStore } from './unifiedInboxService';

export interface IncomingMessagePayload {
  shop_id: string;
  provider: 'whatsapp' | 'email' | 'facebook' | 'instagram' | 'website';
  integration_account_id?: string;
  sender_identifier: string; // phone, email, or FB/IG ID
  sender_name?: string;
  recipient_identifier?: string;
  external_message_id?: string;
  subject?: string;
  message_text: string;
  message_type?: 'text' | 'image' | 'document' | 'audio' | 'video' | 'form_submission';
  attachments?: any[];
  raw_payload?: any;
}

export class IncomingMessageService {
  /**
   * Main entry point to process an incoming message from Webhooks or Email Polling
   */
  public async processIncomingMessage(payload: IncomingMessagePayload) {
    const {
      shop_id,
      provider,
      sender_identifier,
      sender_name,
      recipient_identifier = 'shop_business_account',
      external_message_id,
      subject,
      message_text,
      message_type = 'text',
      attachments = [],
      raw_payload = {},
    } = payload;

    const normalizedSender = sender_identifier.trim().toLowerCase();

    // 1. Check if customer exists by phone or email
    let customerId: string | null = null;
    let leadId: string | null = null;
    let customerName = sender_name || sender_identifier;

    try {
      if (provider === 'whatsapp' || provider === 'email' || provider === 'website') {
        const isEmail = normalizedSender.includes('@');

        if (isEmail) {
          const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('id, full_name, first_name, last_name')
            .eq('shop_id', shop_id)
            .ilike('email', normalizedSender)
            .maybeSingle();

          if (customer) {
            customerId = customer.id;
            customerName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customerName;
          }
        } else {
          // Phone number matching (normalize non-digits)
          const cleanPhone = normalizedSender.replace(/[^\d+]/g, '');

          const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('id, full_name, first_name, last_name, phone')
            .eq('shop_id', shop_id)
            .ilike('phone', `%${cleanPhone.slice(-8)}%`)
            .maybeSingle();

          if (customer) {
            customerId = customer.id;
            customerName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customerName;
          }
        }
      }
    } catch (e) {
      // Non-fatal customer lookup
    }

    // 2. If no customer found, check existing leads table
    if (!customerId) {
      try {
        const isEmail = normalizedSender.includes('@');

        if (isEmail) {
          const { data: lead } = await supabaseAdmin
            .from('leads')
            .select('id, customer_name, first_name, last_name')
            .eq('shop_id', shop_id)
            .ilike('email', normalizedSender)
            .maybeSingle();

          if (lead) {
            leadId = lead.id;
            customerName = lead.customer_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || customerName;
          }
        } else {
          const cleanPhone = normalizedSender.replace(/[^\d+]/g, '');

          const { data: lead } = await supabaseAdmin
            .from('leads')
            .select('id, customer_name, first_name, last_name')
            .eq('shop_id', shop_id)
            .ilike('phone', `%${cleanPhone.slice(-8)}%`)
            .maybeSingle();

          if (lead) {
            leadId = lead.id;
            customerName = lead.customer_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || customerName;
          }
        }
      } catch (e) {
        // Non-fatal lead lookup
      }
    }

    // 3. If neither customer nor lead found -> Automatically create a new lead!
    if (!customerId && !leadId) {
      const leadSourceMap: Record<string, string> = {
        whatsapp: 'WhatsApp',
        email: 'Email',
        facebook: 'Facebook',
        instagram: 'Instagram',
        website: 'Website Form',
      };

      const sourceName = leadSourceMap[provider] || 'Integration';
      const isEmail = normalizedSender.includes('@');

      const newLeadData: any = {
        shop_id,
        customer_name: customerName,
        email: isEmail ? normalizedSender : null,
        phone: !isEmail ? sender_identifier : null,
        lead_source: sourceName,
        source: sourceName,
        lead_status: 'New',
        status: 'New',
        notes: `Auto-created lead from initial ${sourceName} inquiry: "${message_text.slice(0, 150)}"`,
      };

      try {
        const { data: newLead, error: leadErr } = await supabaseAdmin
          .from('leads')
          .insert(newLeadData)
          .select('id')
          .single();

        if (!leadErr && newLead) {
          leadId = newLead.id;
          console.log(`✨ [Incoming Message] Created new lead ${leadId} for shop ${shop_id} from ${provider}`);

          // Log lead creation in activity logs
          await supabaseAdmin.from('activity_logs').insert({
            shop_id,
            user_id: 'SYSTEM_INTEGRATION',
            action: 'LEAD_AUTO_CREATED',
            module: 'CRM',
            entity_id: leadId,
            details: { provider, sender: sender_identifier, source: sourceName },
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        leadId = `lead-auto-${Date.now()}`;
      }
    }

    // 4. Determine consistent thread ID
    const threadId = customerId
      ? `cust_${customerId}`
      : leadId
      ? `lead_${leadId}`
      : `ident_${provider}_${normalizedSender.replace(/[^a-zA-Z0-9]/g, '_')}`;

    let messageRecord: any;

    // 5. Store message in integration_messages table
    try {
      const { data, error: msgErr } = await supabaseAdmin
        .from('integration_messages')
        .insert({
          shop_id,
          integration_account_id: payload.integration_account_id || null,
          provider,
          direction: 'incoming',
          sender_identifier,
          recipient_identifier,
          customer_id: customerId,
          lead_id: leadId,
          thread_id: threadId,
          external_message_id: external_message_id || `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          subject: subject || null,
          message_text,
          message_type,
          attachments,
          status: 'delivered',
          is_read: false,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          raw_payload,
        })
        .select()
        .single();

      if (msgErr) throw msgErr;
      messageRecord = data;
    } catch (err: any) {
      console.warn('⚠️ Supabase incoming message insertion fallback active:', err.message);
      messageRecord = {
        id: `msg_inc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        shop_id,
        integration_account_id: payload.integration_account_id || null,
        provider,
        direction: 'incoming',
        sender_identifier,
        recipient_identifier,
        customer_id: customerId,
        lead_id: leadId,
        thread_id: threadId,
        external_message_id: external_message_id || `ext_${Date.now()}`,
        subject: subject || null,
        message_text,
        message_type,
        attachments,
        status: 'delivered',
        is_read: false,
        created_at: new Date().toISOString(),
        leads: { id: leadId, customer_name: customerName, email: normalizedSender.includes('@') ? normalizedSender : null, phone: !normalizedSender.includes('@') ? sender_identifier : null },
      };
      fallbackMessagesStore.unshift(messageRecord);
    }

    // 6. Broadcast real-time WebSocket notification to shop admins
    socketService.broadcastToShop(shop_id, 'NEW_MESSAGE', {
      message: messageRecord,
      customer_name: customerName,
      provider,
      thread_id: threadId,
      notification: {
        title: `New ${provider.toUpperCase()} Message`,
        body: `From ${customerName}: "${message_text.slice(0, 80)}"`,
      },
    });

    // Log activity
    await integrationAccountService.logActivity(shop_id, provider, 'INCOMING_MESSAGE_RECEIVED', {
      message_id: messageRecord.id,
      sender: sender_identifier,
      thread_id: threadId,
      customer_id: customerId,
      lead_id: leadId,
    });

    return messageRecord;
  }
}

export const incomingMessageService = new IncomingMessageService();
