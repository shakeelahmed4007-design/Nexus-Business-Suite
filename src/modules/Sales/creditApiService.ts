const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
const V1_URL = `${API_BASE}/api/v1`;

function getHeaders(shopId: string = 'shop-001') {
  // Retrieve token or mock session if available
  const mockUser = {
    id: 'super-admin-01',
    email: 'admin@nexus.com',
    role: 'super_admin',
    shop_id: shopId,
  };
  const mockSession = btoa(JSON.stringify(mockUser));

  return {
    'Content-Type': 'application/json',
    'x-shop-id': shopId,
    'X-Mock-Session': mockSession,
  };
}

export interface CustomerCreditStatus {
  customerId: string;
  customerName: string;
  phone?: string;
  email?: string;
  creditLimit: number;
  currentOutstanding: number;
  availableCredit: number;
  percentageUsed: number;
  status: 'Good Standing' | 'Warning' | 'Critical' | 'Blocked' | 'Overdue';
  badgeColor: 'Green' | 'Yellow' | 'Red' | 'Black';
  lastTransactionDate?: string;
  lastPaymentDate?: string;
  isOverdue: boolean;
  overdueDays: number;
}

export interface CustomerCreditLedgerEntry {
  ledgerId: string;
  shopId: string;
  customerId: string;
  transactionType: 'CREDIT_SALE' | 'PAYMENT' | 'ADJUSTMENT';
  amount: number;
  transactionDate: string;
  outstandingBalanceAfter: number;
  referencedTransactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface VendorCreditStatus {
  vendorId: string;
  vendorName: string;
  contactNumber?: string;
  email?: string;
  creditLimit: number;
  currentOutstanding: number;
  availableCredit: number;
  percentageUsed: number;
  status: 'Good Standing' | 'Warning' | 'Critical' | 'Blocked';
  badgeColor: 'Green' | 'Yellow' | 'Red' | 'Black';
  lastTransactionDate?: string;
  lastPaymentDate?: string;
}

export interface VendorCreditLedgerEntry {
  ledgerId: string;
  shopId: string;
  vendorId: string;
  transactionType: 'CREDIT_PURCHASE' | 'PAYMENT' | 'ADJUSTMENT';
  amount: number;
  transactionDate: string;
  outstandingBalanceAfter: number;
  referencedTransactionId?: string;
  notes?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// API CALLS
// ----------------------------------------------------------------------------

export async function fetchCustomerCreditStatusApi(customerId: string, shopId: string = 'shop-001'): Promise<CustomerCreditStatus> {
  const res = await fetch(`${V1_URL}/customers/${customerId}/credit-status`, {
    headers: getHeaders(shopId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch customer credit status');
  return data.data;
}

export async function recordCreditSaleApi(payload: {
  customer_id: string;
  sale_amount: number;
  payment_received_today?: number;
  items?: any[];
  notes?: string;
  shop_id?: string;
}) {
  const shopId = payload.shop_id || 'shop-001';
  const res = await fetch(`${V1_URL}/credit-sales`, {
    method: 'POST',
    headers: getHeaders(shopId),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.error || 'Failed to process credit sale');
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data.data;
}

export async function recordCustomerPaymentApi(payload: {
  customer_id: string;
  amount_paid: number;
  payment_method?: string;
  notes?: string;
  shop_id?: string;
}) {
  const shopId = payload.shop_id || 'shop-001';
  const res = await fetch(`${V1_URL}/customer-payments`, {
    method: 'POST',
    headers: getHeaders(shopId),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record customer payment');
  return data.data;
}

export async function fetchCustomerCreditLedgerApi(customerId: string, shopId: string = 'shop-001'): Promise<{
  customerStatus: CustomerCreditStatus;
  entries: CustomerCreditLedgerEntry[];
}> {
  const res = await fetch(`${V1_URL}/customers/${customerId}/credit-ledger`, {
    headers: getHeaders(shopId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch credit ledger');
  return data.data;
}

export async function updateCustomerCreditLimitApi(customerId: string, creditLimit: number, shopId: string = 'shop-001') {
  const res = await fetch(`${V1_URL}/customers/${customerId}/credit-limit`, {
    method: 'PUT',
    headers: getHeaders(shopId),
    body: JSON.stringify({ credit_limit: creditLimit }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update credit limit');
  return data.data;
}

export async function fetchCustomerCreditReportApi(shopId: string = 'shop-001', options?: {
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.order) params.append('order', options.order);
  if (options?.search) params.append('search', options.search);
  if (options?.status) params.append('status', options.status);

  const res = await fetch(`${V1_URL}/credit-reports/customers?${params.toString()}`, {
    headers: getHeaders(shopId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch customer credit report');
  return { summary: data.summary, customers: data.customers };
}

export async function fetchVendorCreditReportApi(shopId: string = 'shop-001') {
  const res = await fetch(`${V1_URL}/credit-reports/vendors`, {
    headers: getHeaders(shopId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch vendor credit report');
  return { summary: data.summary, vendors: data.vendors };
}

export async function fetchVendorCreditLedgerApi(vendorId: string, shopId: string = 'shop-001'): Promise<{
  vendorStatus: VendorCreditStatus;
  entries: VendorCreditLedgerEntry[];
}> {
  const res = await fetch(`${V1_URL}/vendors/${vendorId}/credit-ledger`, {
    headers: getHeaders(shopId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch vendor credit ledger');
  return data.data;
}

export async function recordCreditPurchaseApi(payload: {
  vendor_id: string;
  purchase_amount: number;
  payment_paid_today?: number;
  items?: any[];
  allow_override?: boolean;
  notes?: string;
  shop_id?: string;
}) {
  const shopId = payload.shop_id || 'shop-001';
  const res = await fetch(`${V1_URL}/credit-purchases`, {
    method: 'POST',
    headers: getHeaders(shopId),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.error || 'Failed to record credit purchase');
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data.data;
}

export async function recordVendorPaymentApi(payload: {
  vendor_id: string;
  amount_paid: number;
  payment_method?: string;
  notes?: string;
  shop_id?: string;
}) {
  const shopId = payload.shop_id || 'shop-001';
  const res = await fetch(`${V1_URL}/vendor-payments`, {
    method: 'POST',
    headers: getHeaders(shopId),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record vendor payment');
  return data.data;
}

export async function updateVendorCreditLimitApi(vendorId: string, creditLimit: number, shopId: string = 'shop-001') {
  const res = await fetch(`${V1_URL}/vendors/${vendorId}/credit-limit`, {
    method: 'PUT',
    headers: getHeaders(shopId),
    body: JSON.stringify({ credit_limit: creditLimit }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update vendor credit limit');
  return data.data;
}

export async function fetchOverdueReportApi(thresholdDays: number = 30, shopId: string = 'shop-001') {
  const res = await fetch(`${V1_URL}/credit-reports/customers/overdue?thresholdDays=${thresholdDays}`, {
    headers: getHeaders(shopId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch overdue report');
  return data.data;
}

export async function fetchRunningSalesHistoryApi(shopId: string = 'shop-001') {
  const res = await fetch(`${V1_URL}/running-sales`, {
    headers: getHeaders(shopId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch running sales');
  return data.data;
}
