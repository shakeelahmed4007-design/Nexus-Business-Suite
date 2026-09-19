export type CreditTransactionType = 'CREDIT_SALE' | 'CREDIT_PURCHASE' | 'PAYMENT' | 'ADJUSTMENT';

export type CreditStandingStatus = 'Good Standing' | 'Warning' | 'Critical' | 'Blocked' | 'Overdue';

export type CreditBadgeColor = 'Green' | 'Yellow' | 'Red' | 'Black';

export interface CustomerCreditStatus {
  customerId: string;
  customerName: string;
  phone?: string;
  email?: string;
  creditLimit: number;
  currentOutstanding: number;
  availableCredit: number;
  percentageUsed: number;
  status: CreditStandingStatus;
  badgeColor: CreditBadgeColor;
  lastTransactionDate?: string;
  lastPaymentDate?: string;
  isOverdue: boolean;
  overdueDays: number;
}

export interface CreditSaleInput {
  customerId: string;
  saleAmount: number;
  paymentReceivedToday?: number; // Cash down payment
  items?: Array<{
    productId?: string;
    product_id?: string;
    productName?: string;
    product_name?: string;
    quantity: number;
    unitPrice?: number;
    unit_price?: number;
    tax_percentage?: number;
  }>;
  notes?: string;
  staffMemberId?: string;
  adminOverrideReason?: string;
  adminOverrideBy?: string;
}

export interface CreditSaleRecord {
  saleId: string;
  shopId: string;
  customerId: string;
  customerName?: string;
  saleAmount: number;
  paymentReceivedToday: number;
  creditGiven: number;
  transactionDate: string;
  itemsSoldJson: any[];
  staffMemberId?: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerPaymentInput {
  customerId: string;
  amountPaid: number;
  paymentMethod?: 'Cash' | 'Check' | 'Bank Transfer' | 'Card' | 'Online' | string;
  paymentDate?: string;
  notes?: string;
}

export interface CustomerPaymentRecord {
  paymentId: string;
  shopId: string;
  customerId: string;
  customerName?: string;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  recordedByUserId?: string;
  notes?: string;
  createdAt: string;
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
  status: CreditStandingStatus;
  badgeColor: CreditBadgeColor;
  lastTransactionDate?: string;
  lastPaymentDate?: string;
}

export interface CreditPurchaseInput {
  vendorId: string;
  purchaseAmount: number;
  paymentPaidToday?: number;
  items?: Array<{
    productId?: string;
    product_id?: string;
    productName?: string;
    product_name?: string;
    quantity: number;
    unitPrice?: number;
    unit_price?: number;
  }>;
  allowOverride?: boolean;
  notes?: string;
}

export interface CreditPurchaseRecord {
  purchaseId: string;
  shopId: string;
  vendorId: string;
  vendorName?: string;
  purchaseAmount: number;
  paymentPaidToday: number;
  creditTaken: number;
  transactionDate: string;
  itemsPurchasedJson: any[];
  recordedByUserId?: string;
  overrideApplied: boolean;
  notes?: string;
  createdAt: string;
}

export interface VendorPaymentInput {
  vendorId: string;
  amountPaid: number;
  paymentMethod?: 'Cash' | 'Check' | 'Bank Transfer' | 'Card' | 'Online' | string;
  paymentDate?: string;
  notes?: string;
}

export interface VendorPaymentRecord {
  paymentId: string;
  shopId: string;
  vendorId: string;
  vendorName?: string;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  recordedByUserId?: string;
  notes?: string;
  createdAt: string;
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

export interface CustomerCreditReportRow extends CustomerCreditStatus {}

export interface CustomerCreditReportSummary {
  totalCustomers: number;
  totalCreditLimitExtended: number;
  totalOutstandingReceivable: number;
  totalAvailableCredit: number;
  customersInWarning: number;
  customersBlocked: number;
  customersOverdue: number;
  totalOverdueAmount: number;
}

export interface VendorCreditReportRow extends VendorCreditStatus {}

export interface VendorCreditReportSummary {
  totalVendors: number;
  totalCreditLimitExtended: number;
  totalOutstandingPayable: number;
  totalAvailableCredit: number;
  vendorsInWarning: number;
  vendorsExceeded: number;
}

export interface OverdueAgingItem {
  customerId: string;
  customerName: string;
  phone?: string;
  creditLimit: number;
  currentOutstanding: number;
  overdueAmount: number;
  daysPastDue: number;
  lastPaymentDate?: string;
  oldestUnpaidTransactionDate?: string;
  bucket: '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
}
