export type LeadSource = 'Website' | 'Cold Call' | 'Referral' | 'Social Media' | 'Manual Entry';
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Negotiating' | 'Lost' | 'Won';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Lead {
  id: string;
  shopId: string;
  createdById: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  leadSource: LeadSource;
  leadStatus: LeadStatus;
  leadValue?: number;
  priority: Priority;
  assignedToUserId?: string;
  notes?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateLeadRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  leadSource: LeadSource;
  leadStatus: LeadStatus;
  leadValue?: number;
  priority: Priority;
  assignedToUserId?: string;
  notes?: string;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  nextFollowUpDate?: Date;
}

export interface LeadFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus;
  priority?: Priority;
  source?: LeadSource;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
}
