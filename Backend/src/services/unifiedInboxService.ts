import { supabaseAdmin } from '../config/supabaseAdmin';

export interface InboxQueryFilters {
  provider?: string;
  is_read?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Global shared fallback memory store for messages
export const fallbackMessagesStore: any[] = [
  {
    id: 'msg-demo-001',
    shop_id: 'shop-001',
    provider: 'whatsapp',
    direction: 'incoming',
    sender_identifier: '+923001234567',
    recipient_identifier: '+15559876543',
    customer_id: null,
    lead_id: 'lead-demo-001',
    thread_id: 'lead_lead-demo-001',
    external_message_id: 'wa_msg_1001',
    subject: null,
    message_text: 'Do you have Dell Core i7 laptops in stock?',
    message_type: 'text',
    attachments: [],
    status: 'delivered',
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    customers: null,
    leads: { id: 'lead-demo-001', customer_name: 'Usman Ali', phone: '+923001234567', email: 'usman@gmail.com' },
  },
  {
    id: 'msg-demo-002',
    shop_id: 'shop-001',
    provider: 'email',
    direction: 'incoming',
    sender_identifier: 'sarah.connor@cyberdyne.com',
    recipient_identifier: 'support@nexus-suite.com',
    customer_id: null,
    lead_id: 'lead-demo-002',
    thread_id: 'lead_lead-demo-002',
    external_message_id: 'em_msg_2002',
    subject: 'Request for Wholesale Pricing Catalog',
    message_text: 'Hello, please send over the latest Q3 price sheet for hardware inventory.',
    message_type: 'text',
    attachments: [],
    status: 'delivered',
    is_read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    customers: null,
    leads: { id: 'lead-demo-002', customer_name: 'Sarah Connor', email: 'sarah.connor@cyberdyne.com' },
  },
];

export class UnifiedInboxService {
  /**
   * Fetch conversation threads for a shop unified inbox
   */
  public async getThreads(shopId: string, filters: InboxQueryFilters = {}) {
    const { provider, is_read, search, limit = 50, offset = 0 } = filters;
    let messages: any[] = [];

    try {
      let query = supabaseAdmin
        .from('integration_messages')
        .select(`
          *,
          customers:customer_id (id, full_name, email, phone, company_name),
          leads:lead_id (id, customer_name, email, phone, company_name, lead_source)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (provider && provider !== 'all') {
        query = query.eq('provider', provider);
      }

      if (typeof is_read === 'boolean') {
        query = query.eq('is_read', is_read);
      }

      const { data, error } = await query;
      if (error) throw error;
      messages = data || [];
    } catch (err: any) {
      console.warn('⚠️ Supabase getThreads fallback active:', err.message);
      messages = fallbackMessagesStore.filter((m) => m.shop_id === shopId);
      if (provider && provider !== 'all') {
        messages = messages.filter((m) => m.provider === provider);
      }
      if (typeof is_read === 'boolean') {
        messages = messages.filter((m) => m.is_read === is_read);
      }
    }

    // Group messages into unified threads by thread_id
    const threadMap = new Map<string, any>();

    messages.forEach((msg) => {
      const threadId = msg.thread_id;
      if (!threadMap.has(threadId)) {
        const contactName =
          msg.customers?.full_name ||
          msg.leads?.customer_name ||
          msg.sender_identifier;

        const contactEmail = msg.customers?.email || msg.leads?.email;
        const contactPhone = msg.customers?.phone || msg.leads?.phone;

        threadMap.set(threadId, {
          thread_id: threadId,
          shop_id: shopId,
          provider: msg.provider,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          customer: msg.customers,
          lead: msg.leads,
          last_message: msg.message_text,
          last_message_at: msg.created_at,
          unread_count: !msg.is_read && msg.direction === 'incoming' ? 1 : 0,
          messages: [msg],
        });
      } else {
        const existing = threadMap.get(threadId);
        existing.messages.push(msg);
        if (!msg.is_read && msg.direction === 'incoming') {
          existing.unread_count += 1;
        }
      }
    });

    let threads = Array.from(threadMap.values());

    if (search && search.trim()) {
      const term = search.toLowerCase();
      threads = threads.filter(
        (t) =>
          t.contact_name.toLowerCase().includes(term) ||
          (t.contact_email && t.contact_email.toLowerCase().includes(term)) ||
          (t.contact_phone && t.contact_phone.includes(term)) ||
          t.messages.some((m: any) => m.message_text.toLowerCase().includes(term))
      );
    }

    const paginated = threads.slice(offset, offset + limit);

    return {
      threads: paginated,
      total_threads: threads.length,
      limit,
      offset,
    };
  }

  /**
   * Get complete message timeline history for a thread ID
   */
  public async getThreadMessages(shopId: string, threadId: string) {
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('integration_messages')
        .select(`
          *,
          customers:customer_id (id, full_name, email, phone),
          leads:lead_id (id, customer_name, email, phone)
        `)
        .eq('shop_id', shopId)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      await supabaseAdmin
        .from('integration_messages')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('shop_id', shopId)
        .eq('thread_id', threadId)
        .eq('direction', 'incoming')
        .eq('is_read', false);

      return messages || [];
    } catch (err: any) {
      console.warn('⚠️ Supabase getThreadMessages fallback active:', err.message);
      const threadMsgs = fallbackMessagesStore
        .filter((m) => m.shop_id === shopId && m.thread_id === threadId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      threadMsgs.forEach((m) => {
        if (m.direction === 'incoming') m.is_read = true;
      });

      return threadMsgs;
    }
  }

  /**
   * Get unread message counts broken down by platform
   */
  public async getUnreadCounts(shopId: string) {
    const counts: Record<string, number> = {
      whatsapp: 0,
      email: 0,
      facebook: 0,
      instagram: 0,
      website: 0,
      total: 0,
    };

    try {
      const { data, error } = await supabaseAdmin
        .from('integration_messages')
        .select('provider')
        .eq('shop_id', shopId)
        .eq('direction', 'incoming')
        .eq('is_read', false);

      if (error) throw error;

      (data || []).forEach((row) => {
        if (counts[row.provider] !== undefined) {
          counts[row.provider] += 1;
        }
        counts.total += 1;
      });
    } catch (err: any) {
      const unreadList = fallbackMessagesStore.filter((m) => m.shop_id === shopId && m.direction === 'incoming' && !m.is_read);
      unreadList.forEach((row) => {
        if (counts[row.provider] !== undefined) {
          counts[row.provider] += 1;
        }
        counts.total += 1;
      });
    }

    return counts;
  }

  /**
   * Mark message as read
   */
  public async markAsRead(shopId: string, messageId: string) {
    try {
      await supabaseAdmin
        .from('integration_messages')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('shop_id', shopId);
    } catch (err: any) {
      const msg = fallbackMessagesStore.find((m) => m.id === messageId);
      if (msg) msg.is_read = true;
    }
    return true;
  }
}

export const unifiedInboxService = new UnifiedInboxService();
