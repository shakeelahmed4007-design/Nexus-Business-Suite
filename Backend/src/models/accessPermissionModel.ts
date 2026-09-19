export type ResourceType = 
  | 'lead' 
  | 'customer' 
  | 'task' 
  | 'calling_data' 
  | 'product' 
  | 'order' 
  | 'invoice' 
  | 'report'
  | 'message';

export type UserRole = 'super_admin' | 'shop_admin' | 'staff';

export interface AccessPermission {
  id: string;
  shop_id: string;
  resource_type: ResourceType;
  resource_id: string;
  owner_id: string;
  owner_role: UserRole;
  granted_to_user_id?: string | null;
  granted_to_role?: UserRole | null;
  permission_level: 'read' | 'write' | 'full';
  created_at: string;
  updated_at: string;
}

export interface GrantAccessRequest {
  resourceType: ResourceType;
  resourceId: string;
  grantedToUserId?: string;
  grantedToRole?: UserRole;
  permissionLevel?: 'read' | 'write' | 'full';
}

export interface RevokeAccessRequest {
  resourceType: ResourceType;
  resourceId: string;
  grantedToUserId?: string;
  grantedToRole?: UserRole;
}
