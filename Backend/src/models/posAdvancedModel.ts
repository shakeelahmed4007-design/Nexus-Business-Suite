// Models for Advanced POS & Credit Integration System

export type SaleType = 'RUNNING' | 'BULK';

export type PaymentMethod = 'Cash' | 'Check' | 'Bank Transfer' | 'Card' | 'Mobile Wallet' | 'Advance';

export interface BulkPricingTier {
  min_quantity: number;
  unit_price: number;
  tier_name?: string;
}

export interface PosShopSettings {
  shop_id: string;
  enforce_hard_blocks: boolean;
  require_override_reason: boolean;
  default_bulk_discount_percent: number;
  bulk_tax_rate: number;
  retail_tax_rate: number;
  statement_frequency: 'weekly' | 'monthly';
  updated_at?: string;
  created_at?: string;
}

export interface InventoryReservation {
  reservation_id: string;
  shop_id: string;
  product_id: string;
  quantity_reserved: number;
  reserved_by_user_id: string;
  sale_id?: string;
  status: 'ACTIVE' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  expires_at: string;
  created_at?: string;
}

export interface PaymentRecord {
  payment_id: string;
  shop_id: string;
  customer_id: string;
  amount_paid: number;
  payment_date?: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  check_number?: string;
  card_last4?: string;
  received_by_user_id: string;
  notes?: string;
  created_at?: string;
}

export interface CustomerStatement {
  statement_id: string;
  shop_id: string;
  customer_id: string;
  customer_name?: string;
  statement_period: string; // e.g. "2026-09"
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
    current: number; // 0-30 days
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  payment_instructions?: {
    bank_name: string;
    account_title: string;
    account_number: string;
    iban: string;
    swift_code?: string;
  };
  pdf_generated: boolean;
  pdf_url?: string;
  email_sent: boolean;
  email_sent_at?: string;
  created_at?: string;
}

export interface CreditAvailabilityResponse {
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

export interface PosAdvancedSaleItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  regular_price?: number;
  tax_percentage?: number;
}

export interface PosAdvancedSaleInput {
  shop_id: string;
  staff_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  sale_type: SaleType;
  items: PosAdvancedSaleItem[];
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
  session_id?: string;
  reservation_ids?: string[];
}

export interface PosSaleReturnInput {
  shop_id: string;
  staff_id: string;
  original_sale_id?: string;
  customer_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    refund_unit_price: number;
  }>;
  return_reason: string;
  refund_type: 'Cash' | 'Credit_Adjustment';
}

export interface StockReconciliationInput {
  shop_id: string;
  staff_id: string;
  product_id: string;
  physical_count: number;
  notes?: string;
}
