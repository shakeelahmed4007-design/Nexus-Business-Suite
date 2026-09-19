import { supabaseAdmin } from '../config/supabaseAdmin';

export interface InternalMessage {
  id: string;
  shop_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'super_admin' | 'shop_admin' | 'staff';
  receiver_id?: string | null;
  receiver_role?: string | null;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const inMemoryMessages: InternalMessage[] = [];

export class MessageService {
  async sendMessage(
    senderId: string,
    senderRole: 'super_admin' | 'shop_admin' | 'staff',
    senderName: string,
    shopId: string,
    data: { receiverId?: string; receiverRole?: string; subject: string; content: string }
  ): Promise<InternalMessage> {
    const message: InternalMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      shop_id: shopId,
      sender_id: senderId,
      sender_name: senderName || 'User',
      sender_role: senderRole,
      receiver_id: data.receiverId || null,
      receiver_role: data.receiverRole || null,
      subject: data.subject,
      content: data.content,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    try {
      const { data: inserted, error } = await supabaseAdmin
        .from('messages')
        .insert(message)
        .select()
        .single();
      if (!error && inserted) return inserted as InternalMessage;
    } catch {
      // Fallback
    }

    inMemoryMessages.push(message);
    return message;
  }

  async getMyMessages(
    userId: string,
    userRole: 'super_admin' | 'shop_admin' | 'staff',
    shopId: string
  ): Promise<InternalMessage[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('shop_id', shopId)
        .or(`receiver_id.eq.${userId},receiver_role.eq.${userRole},sender_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (!error && data) return data as InternalMessage[];
    } catch {
      // Fallback
    }

    return inMemoryMessages.filter(
      (m) =>
        m.shop_id === shopId &&
        (m.receiver_id === userId || m.receiver_role === userRole || m.sender_id === userId)
    );
  }

  async markAsRead(userId: string, messageId: string): Promise<void> {
    try {
      await supabaseAdmin.from('messages').update({ is_read: true }).eq('id', messageId);
    } catch {
      // Fallback
    }

    const msg = inMemoryMessages.find((m) => m.id === messageId);
    if (msg) msg.is_read = true;
  }
}
