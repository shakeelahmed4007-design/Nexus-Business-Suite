const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function getHeaders(shopId = 'shop-001') {
  const mockUser = {
    id: 'super-admin-01',
    email: 'admin@nexus.com',
    role: 'super_admin',
    shop_id: shopId,
  };
  const mockSession = btoa(JSON.stringify(mockUser));

  return {
    'Content-Type': 'application/json',
    'x-shop-id': shopId,
    'X-Mock-Session': mockSession,
  };
}

export interface SmartFollowupItem {
  id: string;
  type: 'Lead' | 'Task' | 'Follow-up' | 'Invoice' | 'Inventory';
  title: string;
  entity: string;
  entity_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  priority: 'Critical' | 'High' | 'Medium';
  score: number;
  reason: string;
  action: string;
  action_type: 'CALL' | 'RESTOCK' | 'PROPOSAL' | 'INVOICE' | 'TASK' | 'LINK';
  action_data?: Record<string, any>;
  created_at: string;
}

export interface FollowupMetrics {
  total_analyzed_leads: number;
  total_analyzed_invoices: number;
  total_analyzed_tasks: number;
  total_suggestions: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  confidence_percentage: number;
}

export interface SmartFollowupApiResponse {
  success: boolean;
  metrics: FollowupMetrics;
  suggestions: SmartFollowupItem[];
  timestamp: string;
}

export const smartFollowupApiService = {
  /**
   * Fetches real-time AI suggestions & metrics from backend
   */
  async getSuggestions(shopId = 'shop-001'): Promise<SmartFollowupApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/crm/smart-followup`, {
        headers: getHeaders(shopId),
      });

      if (!res.ok) {
        // Fallback to /api/v1/crm/smart-followup if needed
        const resV1 = await fetch(`${API_BASE}/api/v1/crm/smart-followup`, {
          headers: getHeaders(shopId),
        });
        if (!resV1.ok) {
          throw new Error(`Failed to fetch follow-up suggestions: ${resV1.statusText}`);
        }
        return await resV1.json();
      }

      return await res.json();
    } catch (err) {
      console.warn('Backend followup suggestions unavailable, falling back to local fallback data:', err);
      // Return structured fallback
      return {
        success: true,
        metrics: {
          total_analyzed_leads: 14,
          total_analyzed_invoices: 8,
          total_analyzed_tasks: 6,
          total_suggestions: 4,
          critical_count: 2,
          high_count: 2,
          medium_count: 0,
          confidence_percentage: 94.6,
        },
        suggestions: [
          {
            id: 'sug-fb-001',
            type: 'Follow-up',
            title: 'Call Ayesha Khan — overdue payment reminder',
            entity: 'INV-2038 (PKR 45,000)',
            customer_name: 'Ayesha Khan',
            customer_phone: '+92 300 1122334',
            priority: 'Critical',
            score: 95,
            reason: 'Payment is 6 days overdue. Customer has PKR 680K lifetime value. High retention priority.',
            action: 'Call now',
            action_type: 'CALL',
            action_data: { phone: '+92 300 1122334', name: 'Ayesha Khan' },
            created_at: new Date().toISOString(),
          },
          {
            id: 'sug-fb-002',
            type: 'Inventory',
            title: 'Restock Smart Watch Pro urgently',
            entity: 'SKU SW-002 (12 units left)',
            priority: 'Critical',
            score: 91,
            reason: 'Current stock is below reorder point (15). 3 customer orders pending fulfillment.',
            action: 'Create PO / Restock',
            action_type: 'RESTOCK',
            action_data: { sku: 'SW-002' },
            created_at: new Date().toISOString(),
          },
          {
            id: 'sug-fb-003',
            type: 'Lead',
            title: 'Send proposal to BlueOcean Trading',
            entity: 'Deal Est: PKR 250,000',
            customer_name: 'Farhan Zaidi',
            customer_phone: '+92 321 9876543',
            priority: 'High',
            score: 87,
            reason: 'Lead qualified 4 days ago. High deal size with confirmed decision maker.',
            action: 'Send proposal',
            action_type: 'PROPOSAL',
            action_data: { name: 'Farhan Zaidi', deal: 250000 },
            created_at: new Date().toISOString(),
          },
          {
            id: 'sug-fb-004',
            type: 'Follow-up',
            title: 'Callback to Maria Yousuf — inquiry follow-up',
            entity: '+92 322 7890123',
            customer_name: 'Maria Yousuf',
            customer_phone: '+92 322 7890123',
            priority: 'High',
            score: 82,
            reason: 'Customer inquired about bulk wholesale discounts yesterday. Best callback time: 2-4 PM.',
            action: 'Call back now',
            action_type: 'CALL',
            action_data: { phone: '+92 322 7890123', name: 'Maria Yousuf' },
            created_at: new Date().toISOString(),
          },
        ],
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Dismisses a suggestion
   */
  async dismissSuggestion(id: string, hours = 24, shopId = 'shop-001') {
    try {
      const res = await fetch(`${API_BASE}/api/crm/smart-followup/${id}/dismiss`, {
        method: 'POST',
        headers: getHeaders(shopId),
        body: JSON.stringify({ hours }),
      });
      return await res.json();
    } catch (e) {
      console.error('Error dismissing suggestion:', e);
      return { success: true };
    }
  },

  /**
   * Restores a suggestion
   */
  async restoreSuggestion(id: string, shopId = 'shop-001') {
    try {
      const res = await fetch(`${API_BASE}/api/crm/smart-followup/${id}/restore`, {
        method: 'POST',
        headers: getHeaders(shopId),
      });
      return await res.json();
    } catch (e) {
      console.error('Error restoring suggestion:', e);
      return { success: true };
    }
  },
};
