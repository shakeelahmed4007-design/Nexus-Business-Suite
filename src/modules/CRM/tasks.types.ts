export type TaskType =
  | 'callback'
  | 'call'
  | 'email'
  | 'demo'
  | 'quote'
  | 'payment'
  | 'renewal'
  | 'custom'
  | 'send_details'
  | 'schedule_demo'
  | 'satisfaction_followup'
  | 'inventory_alert';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TaskStatus =
  | 'To Do'
  | 'In Progress'
  | 'In Review'
  | 'Done'
  | 'Blocked'
  | 'Cancelled';

export type LinkedToType =
  | 'customer'
  | 'lead'
  | 'deal'
  | 'invoice'
  | 'calling_data'
  | 'inventory';

export type CustomerBoughtOption = 'Yes' | 'No' | 'Maybe';
export type CompletionOutcomeType = 'Successful' | 'Partial' | 'Unsuccessful';

export interface TaskAttachment {
  id?: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface Task {
  id: string;
  shop_id?: string;
  shopId?: string;
  title: string;
  description?: string;
  type: TaskType;
  task_type?: TaskType;
  taskType?: TaskType;
  created_by_user_id?: string;
  created_by_id?: string;
  createdById?: string;
  assigned_to_user_id?: string;
  assignedToUserId?: string;
  assigned_agent_name?: string;
  assignedAgentName?: string;
  created_date?: string;
  createdAt?: string | Date;
  due_date: string;
  dueDate?: string | Date;
  due_time?: string;
  dueTime?: string;
  completed_date?: string;
  completionDate?: string | Date;
  status: TaskStatus;
  taskStatus?: TaskStatus;
  priority: TaskPriority;
  is_overdue?: boolean;
  isOverdue?: boolean;
  days_overdue?: number;
  daysOverdue?: number;
  linked_to_type?: LinkedToType;
  linked_entity?: LinkedToType;
  linkedEntity?: LinkedToType;
  linked_to_id?: string;
  linked_entity_value?: string;
  linkedEntityValue?: string;
  linked_entity_name?: string;
  linkedEntityName?: string;
  customer_phone?: string;
  deal_value?: number;
  call_log_id?: string;
  callLogId?: string;
  notes?: string;
  completion_notes?: string;
  completionNotes?: string;
  completion_outcome?: CompletionOutcomeType;
  completionOutcome?: CompletionOutcomeType;
  customer_bought?: CustomerBoughtOption;
  customerBought?: CustomerBoughtOption;
  next_action_type?: string;
  nextActionType?: string;
  attachments?: TaskAttachment[];
  ai_priority_score?: number;
  aiPriorityScore?: number;
  ai_reason?: string;
  aiReason?: string;
  ai_suggested?: boolean;
  aiSuggested?: boolean;
  reminder_sent?: boolean;
  reminderSent?: boolean;
  reminder_time?: string;
  reminderTime?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  ownerAdminEmail?: string;
  createdByEmail?: string;
  tags?: string[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  type: TaskType;
  assigned_to_user_id?: string;
  assignedToUserId?: string;
  assignedAgentName?: string;
  due_date: string;
  dueDate?: string;
  due_time?: string;
  dueTime?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  taskStatus?: TaskStatus;
  linked_to_type?: LinkedToType;
  linked_entity?: LinkedToType;
  linkedEntity?: LinkedToType;
  linked_to_id?: string;
  linked_entity_value?: string;
  linkedEntityValue?: string;
  linkedEntityName?: string;
  call_log_id?: string;
  callLogId?: string;
  notes?: string;
  attachments?: TaskAttachment[];
  ai_priority_score?: number;
  ai_reason?: string;
  ai_suggested?: boolean;
  tags?: string[];
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
  taskStatus?: TaskStatus;
  completed_date?: string;
  completion_notes?: string;
  completionNotes?: string;
  completion_outcome?: CompletionOutcomeType;
  completionOutcome?: CompletionOutcomeType;
  customer_bought?: CustomerBoughtOption;
  customerBought?: CustomerBoughtOption;
  next_action_type?: string;
  nextActionType?: string;
  is_overdue?: boolean;
  days_overdue?: number;
}

export interface TaskFilterState {
  timeRange: 'all' | 'today' | 'this_week' | 'overdue';
  priority: 'All' | TaskPriority;
  taskType: 'All' | TaskType;
  status: 'All' | TaskStatus;
  assignedAgent: string; // 'All' or specific ID
  search: string;
}

export interface AITaskSuggestion {
  task: Task;
  aiScore: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  reasons: string[];
  humanReadableSuggestion: string;
  recommendedAction: string;
}

export interface TaskWithAIScore extends Task {
  ai_priority_score: number;
  ai_reason: string;
  ai_suggested: boolean;
  urgencyLevel: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface CompletionOutcome {
  outcome: CompletionOutcomeType;
  notes: string;
  customerBought?: CustomerBoughtOption;
  nextActionType?: string;
  dealAmount?: number;
  followUpDueDate?: string;
}

export interface TasksPageProps {
  tasks?: Task[];
  filters?: TaskFilterState;
  sortingPreferences?: string;
}

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, status: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onCompleteClick?: (task: Task) => void;
  onEditClick?: (task: Task) => void;
  onDeleteClick?: (taskId: string) => void;
}

export interface TaskCardProps {
  task: Task;
  delay?: number;
  isDragging?: boolean;
  canDelete?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onComplete?: (task: Task) => void;
  onActionClick?: (task: Task, action: string) => void;
}

export interface AISuggestionProps {
  suggestions: AITaskSuggestion[];
  loading?: boolean;
  onActionClick?: (task: Task, action: string) => void;
  onCompleteClick?: (task: Task) => void;
  onSnoozeClick?: (taskId: string) => void;
}

export interface TaskStatsData {
  totalTasks: number;
  completedToday: number;
  overdueCount: number;
  hasOverdueEscalation: boolean;
  completionRate: number; // 0-100
  avgCompletionHours: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  byType: Record<string, number>;
  agentRankings: Array<{
    agentId: string;
    agentName: string;
    completedCount: number;
    overdueCount: number;
    totalAssigned: number;
    completionRate: number;
  }>;
  completionTrend: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
}
