export type CustomerType = 'Individual' | 'Business' | 'Corporate' | 'VIP' | 'Regular' | 'Wholesale' | 'Retail' | string;
export type CustomerStatus = 'Active' | 'Inactive' | 'VIP' | 'At Risk' | 'Regular' | string;
export type PaymentTerms = 'Cash' | 'Credit' | 'Installment' | string;

export interface Customer {
  id: string;
  shopId: string;
  createdById: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  customerType: CustomerType;
  address?: string;
  city?: string;
  country?: string;
  totalOrderValue: number;
  totalOrders: number;
  lastOrderDate?: Date;
  customerStatus: CustomerStatus;
  creditLimit?: number;
  paymentTerms?: PaymentTerms;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  customerType: CustomerType;
  address?: string;
  city?: string;
  country?: string;
  creditLimit?: number;
  paymentTerms?: PaymentTerms;
  notes?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  customerStatus?: CustomerStatus;
}

export interface CustomerFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  paymentTerms?: PaymentTerms;
  dateFrom?: string;
  dateTo?: string;
}
