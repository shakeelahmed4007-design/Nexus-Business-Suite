export type TaskType =
  | 'Customer Follow-up'
  | 'Meeting'
  | 'Support'
  | 'Internal Work'
  | 'Follow-up'
  | 'Call'
  | 'Email'
  | 'Reminder'
  | 'Other';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskStatus =
  | 'Open'
  | 'Not Started'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Cancelled'
  | 'Overdue';

export type LinkedEntity = 'lead' | 'customer';

export interface TaskAssignment {
  id: string;
  taskId: string;
  assignedToUserId: string;
  assignedByUserId?: string;
  assignedAt: Date;
  unassignedAt?: Date;
  assignedUser?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface TaskComment {
  id: string;
  taskId: string;
  commentedByUserId: string;
  commentText: string;
  createdAt: Date;
  commenter?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface TaskStatusHistory {
  id: string;
  taskId: string;
  oldStatus?: string;
  newStatus: string;
  changedByUserId: string;
  changedAt: Date;
  reason?: string;
  changedByUser?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface TaskTemplate {
  id: string;
  shopId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  priority: TaskPriority;
  defaultAssignedUserIds: string[];
  createdById: string;
  createdAt: Date;
}

export interface TaskNotification {
  id: string;
  shopId: string;
  userId: string;
  taskId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Task {
  id: string;
  shopId: string;
  createdById: string;
  title: string;
  description?: string;
  taskType: TaskType;
  relatedCustomerId?: string;
  relatedLeadId?: string;
  linkedEntity?: LinkedEntity;
  linkedEntityValue?: string;
  assignedToUserId?: string;
  assignedUserIds?: string[];
  assignments?: TaskAssignment[];
  priority: TaskPriority;
  status: TaskStatus;
  statusChangedAt?: Date;
  dueDate?: Date;
  completionDate?: Date;
  completionNotes?: string;
  holdReason?: string;
  cancellationReason?: string;
  remindBeforeMinutes?: number;
  commentsCount?: number;
  comments?: TaskComment[];
  statusHistory?: TaskStatusHistory[];
  relatedCustomer?: any;
  relatedLead?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  taskType?: TaskType;
  relatedCustomerId?: string;
  relatedLeadId?: string;
  linkedEntity?: LinkedEntity;
  linkedEntityValue?: string;
  assignedToUserId?: string;
  assignedToUserIds?: string[];
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | Date;
  remindBeforeMinutes?: number;
  notes?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
  completionNotes?: string;
  holdReason?: string;
  cancellationReason?: string;
}

export interface TaskFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  taskType?: TaskType;
  dueFrom?: string;
  dueTo?: string;
  linkedEntity?: LinkedEntity;
  customerId?: string;
  leadId?: string;
  isOverdue?: boolean;
}

export interface TaskMetricsSummary {
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  onHoldTasks: number;
  completedTasks: number;
  overdueTasks: number;
}
