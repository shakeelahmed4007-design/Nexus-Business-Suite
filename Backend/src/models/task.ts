export type TaskType = 'Follow-up' | 'Call' | 'Meeting' | 'Email' | 'Reminder' | 'Other';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled';
export type LinkedEntity = 'lead' | 'customer';

export interface Task {
  id: string;
  shopId: string;
  createdById: string;
  title: string;
  description?: string;
  taskType: TaskType;
  linkedEntity?: LinkedEntity;
  linkedEntityValue?: string;
  assignedToUserId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  completionDate?: Date;
  completionNotes?: string;
  remindBeforeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  taskType: TaskType;
  linkedEntity?: LinkedEntity;
  linkedEntityValue?: string;
  assignedToUserId: string;
  priority: TaskPriority;
  dueDate: string | Date;
  remindBeforeMinutes?: number;
  notes?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
  completionNotes?: string;
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
}
