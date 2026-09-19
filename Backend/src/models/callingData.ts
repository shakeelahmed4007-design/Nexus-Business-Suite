export type CallingSource = 'Manual Entry' | 'Purchased List' | 'CSV Import';
export type CallingDataType = 'Raw Data' | 'Support Numbers';
export type CallingStatus = 'Available' | 'Assigned' | 'Used' | 'Expired' | 'Invalid';
export type CallStatus = 'Connected' | 'No Response' | 'Busy' | 'Invalid' | 'Interested' | 'Not Interested';

export interface CallingData {
  id: string;
  shopId: string;
  createdById: string;
  phoneNumber: string;
  source: CallingSource;
  dataType: CallingDataType;
  assignedToUserId?: string;
  assignedDate?: Date;
  expiryDate?: Date;
  status: CallingStatus;
  usageCount: number;
  lastUsedDate?: Date;
  linkedLeadId?: string;
  linkedCustomerId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CallHistory {
  id: string;
  callingDataId: string;
  agentUserId: string;
  callDurationSeconds?: number;
  callStatus: CallStatus;
  callNotes?: string;
  linkedLeadId?: string;
  callTime: Date;
  createdAt: Date;
}

export interface CreateCallingDataRequest {
  phoneNumber: string;
  source: CallingSource;
  dataType: CallingDataType;
  notes?: string;
}

export interface AssignCallingDataRequest {
  assignToUserId: string;
  expiryDate: string | Date;
}

export interface LogCallRequest {
  callDuration?: number;
  callStatus: CallStatus;
  callNotes?: string;
  linkedLeadId?: string;
}

export interface CallingDataFilterQuery {
  page?: number;
  limit?: number;
  status?: CallingStatus;
  dataType?: CallingDataType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
