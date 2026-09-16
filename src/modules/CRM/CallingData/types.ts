export type CallingNumberStatus = 'Available' | 'Allocated' | 'Used' | 'Expired' | 'Invalid';
export type AllocationStatus = 'Active' | 'Expired' | 'Returned';
export type CallStatus = 'Connected' | 'No Response' | 'Busy' | 'Invalid' | 'Interested' | 'Not Interested' | 'Callback Later' | 'Closed Sale' | 'Escalate to Admin';
export type LeadStatus = 'New' | 'Trial' | 'Sales' | 'Denied' | 'Lead' | 'Renewal';
export type LeadSource = 'Calling Data' | 'Website' | 'Facebook' | 'Instagram' | 'WhatsApp';
export type DenialReason = 'Budget' | 'Not Interested' | 'Wrong Number' | 'Competitor' | 'Other';
export type RenewalContactStatus = 'Not Contacted' | 'In Discussion' | 'Confirmed' | 'Lost';
export type RoleMode = 'Admin' | 'Agent';

export interface SalesAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor?: string;
}

export interface CallingNumber {
  id: string;
  phone: string;
  source: LeadSource | 'CSV Upload' | 'Manual';
  status: CallingNumberStatus;
  adminId: string;
  shopId?: string;
  agentId?: string;
  agentName?: string;
  allocatedDate?: string;
  expiryDate?: string;
  allocationStatus?: AllocationStatus;
  callCount: number;
  lastCallTimestamp?: string;
  lastCallNotes?: string;
  lastCallStatus?: CallStatus;
  linkedLeadId?: string;
  createdAt: string;
}

export interface CallLog {
  id: string;
  callingDataId: string;
  phone: string;
  shopId?: string;
  agentId: string;
  agentName: string;
  callStatus: CallStatus;
  duration: number; // in seconds
  customerName?: string;
  notes: string;
  nextCallbackDate?: string;
  timestamp: string;
}

export interface LeadFromCall {
  id: string;
  callLogId?: string;
  callingDataId?: string;
  phone: string;
  name: string;
  shopId?: string;
  agentId: string;
  agentName: string;
  status: LeadStatus;
  source: LeadSource;
  createdFromCall: boolean;
  createdDate: string;
  trialPeriod?: '6 months' | '12 months' | '18 months' | string;
  trialStartDate?: string;
  trialRemainingMonths?: number;
  saleAmount?: number;
  saleDate?: string;
  renewalDate?: string;
  denialReason?: DenialReason | string;
  denialDate?: string;
  contactStatus?: RenewalContactStatus;
  notes?: string;
}

export interface ImportedLead {
  id: string;
  shopId?: string;
  name: string;
  phone: string;
  email?: string;
  source: 'Website' | 'Facebook' | 'Instagram' | 'WhatsApp';
  message?: string;
  importedDate: string;
  status: 'Pending' | 'Assigned';
  assignedAgentId?: string;
  assignedAgentName?: string;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  allocated: number;
  callsMade: number;
  sales: number;
  trial: number;
  denied: number;
  renewal: number;
}
