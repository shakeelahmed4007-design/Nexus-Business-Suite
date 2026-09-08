export type CRMModule = 'Leads' | 'Customers' | 'Tasks' | 'CallingData';

export interface ActivityLog {
  id: string;
  shopId: string;
  userId: string;
  action: string;
  module: CRMModule;
  entityId?: string | null;
  details?: Record<string, any>;
  timestamp: Date;
}
