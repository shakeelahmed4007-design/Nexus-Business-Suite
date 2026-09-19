export type FollowupType = 'Lead' | 'Task' | 'Follow-up' | 'Invoice' | 'Inventory';
export type PriorityTier = 'Critical' | 'High' | 'Medium';

export interface SmartFollowupSuggestion {
  id: string;
  type: FollowupType;
  title: string;
  entity: string;
  entity_id?: string;
  customer_phone?: string;
  customer_name?: string;
  priority: PriorityTier;
  reason: string;
  score: number; // 0 to 100
  action: string;
  action_type: 'CALL' | 'PROPOSAL' | 'RESTOCK' | 'VIEW_INVOICE' | 'TASK_COMPLETE';
  action_data?: Record<string, any>;
  created_at: string;
  due_date?: string;
  is_dismissed?: boolean;
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

export interface SmartFollowupResponse {
  success: boolean;
  metrics: FollowupMetrics;
  suggestions: SmartFollowupSuggestion[];
  timestamp: string;
}
