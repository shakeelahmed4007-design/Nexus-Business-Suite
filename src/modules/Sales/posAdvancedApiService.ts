const API_BASE = 'http://localhost:5000/api/v1';

export type PaymentMethod = 'Cash' | 'Check' | 'Bank Transfer' | 'Card' | 'Mobile Wallet' | 'Advance';

export interface CreditAvailability {
  customer_id: string;
  customer_name: string;
  credit_limit: number;
  current_outstanding: number;
  available_credit: number;
  can_buy_amount: number;
  is_at_limit: boolean;
  hard_blocks_enforced: boolean;
  warnings: string[];
}

export interface PosShopSettings {
  shop_id: string;
  enforce_hard_blocks: boolean;
  require_override_reason: boolean;
  default_bulk_discount_percent: number;
  bulk_tax_rate: number;
  retail_tax_rate: number;
  statement_frequency: 'weekly' | 'monthly';
}

export interface CustomerStatement {
  statement_id: string;
  shop_id: string;
  customer_id: string;
  customer_name?: string;
  statement_period: string;
  opening_balance: number;
  closing_balance: number;
  total_sales: number;
  total_payments: number;
  transactions: Array<{
    date: string;
    type: string;
    reference: string;
    amount: number;
    balance_after: number;
    notes?: string;
  }>;
  aging_summary: {
    current: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  payment_instructions?: {
    bank_name: string;
    account_title: string;
    account_number: string;
    iban: string;
  };
  pdf_generated: boolean;
  pdf_url?: string;
  email_sent: boolean;
  email_sent_at?: string;
}

export interface AdvancedSalePayload {
  shop_id?: string;
  staff_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  sale_type: 'RUNNING' | 'BULK';
  items: Array<{
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    regular_price?: number;
    tax_percentage?: number;
  }>;
  subtotal: number;
  discount_amount?: number;
  bulk_discount_percent?: number;
  bulk_discount_reason?: string;
  tax_rate_applied?: number;
  tax_amount: number;
  total_amount: number;
  cash_received: number;
  credit_given: number;
  payment_method?: PaymentMethod;
  reference_number?: string;
  check_number?: string;
  card_last4?: string;
  admin_override_reason?: string;
  admin_override_by?: string;
  reservation_ids?: string[];
}

export async function fetchCreditAvailabilityApi(
  customerId: string,
  attemptedCredit: number = 0,
): Promise<CreditAvailability> {
  const url = `${API_BASE}/customers/${customerId}/credit-availability?attempted_credit=${attemptedCredit}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch credit availability');
  return data.data;
}

export async function executeAdvancedSaleApi(payload: AdvancedSalePayload): Promise<any> {
  const res = await fetch(`${API_BASE}/sales/credit-sale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to complete sale');
  return data;
}

export async function reserveInventoryApi(productId: string, quantity: number): Promise<any> {
  const res = await fetch(`${API_BASE}/inventory/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reserve inventory');
  return data.reservation;
}

export async function releaseInventoryApi(reservationId: string): Promise<void> {
  await fetch(`${API_BASE}/inventory/reserve/${reservationId}`, { method: 'DELETE' });
}

export async function processSaleReturnApi(payload: {
  original_sale_id?: string;
  customer_id?: string;
  items: Array<{ product_id: string; quantity: number; refund_unit_price: number }>;
  return_reason: string;
  refund_type: 'Cash' | 'Credit_Adjustment';
}): Promise<any> {
  const res = await fetch(`${API_BASE}/sales/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to process return');
  return data;
}

export async function reconcileStockApi(payload: {
  product_id: string;
  physical_count: number;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/inventory/reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record reconciliation');
  return data;
}

export async function recordDetailedPaymentApi(payload: {
  customer_id: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  reference_number?: string;
  check_number?: string;
  card_last4?: string;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/payments/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record payment');
  return data.payment;
}

export async function fetchCustomerStatementApi(
  customerId: string,
  period?: string,
): Promise<CustomerStatement> {
  const p = period || new Date().toISOString().slice(0, 7);
  const res = await fetch(`${API_BASE}/customers/${customerId}/statement/${p}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch statement');
  return data.statement;
}

export async function sendCustomerStatementApi(statementId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/statements/send/${statementId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statement_id: statementId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send statement');
  return data;
}

export async function fetchStatementHistoryApi(customerId: string): Promise<CustomerStatement[]> {
  const res = await fetch(`${API_BASE}/statements/history/${customerId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch statement history');
  return data.statements || [];
}

export async function fetchPosShopSettingsApi(): Promise<PosShopSettings> {
  const res = await fetch(`${API_BASE}/pos/settings`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch shop settings');
  return data.settings;
}

export async function updatePosShopSettingsApi(
  settings: Partial<PosShopSettings>,
): Promise<PosShopSettings> {
  const res = await fetch(`${API_BASE}/pos/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update shop settings');
  return data.settings;
}
