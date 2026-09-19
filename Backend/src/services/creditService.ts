import { supabaseAdmin } from '../config/supabaseAdmin';
import {
  CustomerCreditStatus,
  CreditSaleInput,
  CreditSaleRecord,
  CustomerPaymentInput,
  CustomerPaymentRecord,
  CustomerCreditLedgerEntry,
  VendorCreditStatus,
  CreditPurchaseInput,
  CreditPurchaseRecord,
  VendorPaymentInput,
  VendorPaymentRecord,
  VendorCreditLedgerEntry,
  CustomerCreditReportSummary,
  VendorCreditReportSummary,
  OverdueAgingItem,
  CreditStandingStatus,
  CreditBadgeColor,
} from '../models/creditModel';
import { toSafeUUID } from '../utils/uuidHelper';

// In-memory fallback stores for when Supabase tables have not been migrated yet
interface InMemoryCreditState {
  customerCreditLedger: CustomerCreditLedgerEntry[];
  creditSales: CreditSaleRecord[];
  customerPayments: CustomerPaymentRecord[];
  creditPurchases: CreditPurchaseRecord[];
  vendorCreditLedger: VendorCreditLedgerEntry[];
  vendorPayments: VendorPaymentRecord[];
  customerCreditLimits: Map<string, number>;
  vendorCreditLimits: Map<string, number>;
}

const memState: InMemoryCreditState = {
  customerCreditLedger: [],
  creditSales: [],
  customerPayments: [],
  creditPurchases: [],
  vendorCreditLedger: [],
  vendorPayments: [],
  customerCreditLimits: new Map(),
  vendorCreditLimits: new Map(),
};

export class CreditService {
  // ==========================================================================
  // CUSTOMER CREDIT MANAGEMENT
  // ==========================================================================

  /**
   * Retrieve real-time credit status, limit, outstanding balance, available credit,
   * and overdue status for a customer.
   */
  async getCustomerCreditStatus(shopId: string, customerId: string): Promise<CustomerCreditStatus> {
    const safeShopId = shopId || 'shop-001';

    // 1. Fetch customer details from Supabase (or fallback)
    let customer: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select('id, first_name, last_name, full_name, email, phone, credit_limit, created_at')
        .eq('shop_id', safeShopId)
        .eq('id', customerId)
        .maybeSingle();

      if (!error && data) {
        customer = data;
      }
    } catch (e) {
      // ignore
    }

    if (!customer) {
      // Check if ID is in memory or fallback
      const memName = `Customer ${customerId.slice(0, 8)}`;
      customer = {
        id: customerId,
        first_name: memName,
        last_name: '',
        full_name: memName,
        phone: '+923001234567',
        email: 'customer@demo.com',
        credit_limit: memState.customerCreditLimits.get(`${safeShopId}:${customerId}`) || 0,
        created_at: new Date().toISOString(),
      };
    }

    const customerName =
      customer.full_name ||
      `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
      'Customer';

    // In-memory override for credit limit if updated in session
    const memLimit = memState.customerCreditLimits.get(`${safeShopId}:${customerId}`);
    const creditLimit =
      memLimit !== undefined ? memLimit : Number(customer.credit_limit || 0);

    // 2. Fetch latest customer credit ledger entry to get accurate running balance
    let currentOutstanding = 0;
    let lastTransactionDate: string | undefined = undefined;

    let useDbLedger = false;
    try {
      const { data: latestLedger, error: ledgerErr } = await supabaseAdmin
        .from('customer_credit_ledger')
        .select('outstanding_balance_after, transaction_date, transaction_type')
        .eq('shop_id', safeShopId)
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ledgerErr && latestLedger) {
        useDbLedger = true;
        currentOutstanding = Math.max(0, Number(latestLedger.outstanding_balance_after || 0));
        lastTransactionDate = latestLedger.transaction_date;
      } else if (!ledgerErr) {
        useDbLedger = true;
      }
    } catch (e) {
      useDbLedger = false;
    }

    if (!useDbLedger) {
      // Query in-memory ledger
      const custEntries = memState.customerCreditLedger
        .filter((e) => e.shopId === safeShopId && e.customerId === customerId)
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

      if (custEntries.length > 0) {
        currentOutstanding = Math.max(0, custEntries[0].outstandingBalanceAfter);
        lastTransactionDate = custEntries[0].transactionDate;
      }
    }

    // 3. Available Credit Calculation: Total Credit Limit - Current Outstanding Credit
    const availableCredit = Math.max(0, creditLimit - currentOutstanding);

    // 4. Percentage Used Calculation
    let percentageUsed = 0;
    if (creditLimit > 0) {
      percentageUsed = Math.round((currentOutstanding / creditLimit) * 10000) / 100;
    } else if (currentOutstanding > 0) {
      percentageUsed = 100;
    }

    // 5. Fetch last payment date
    let lastPaymentDate: string | undefined = undefined;
    try {
      const { data: lastPayment } = await supabaseAdmin
        .from('customer_payments')
        .select('payment_date')
        .eq('shop_id', safeShopId)
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastPayment?.payment_date) {
        lastPaymentDate = lastPayment.payment_date;
      }
    } catch (e) {
      // ignore
    }

    if (!lastPaymentDate) {
      const memPayments = memState.customerPayments
        .filter((p) => p.shopId === safeShopId && p.customerId === customerId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      if (memPayments.length > 0) {
        lastPaymentDate = memPayments[0].paymentDate;
      }
    }

    // 6. Overdue Evaluation (e.g. unpaid balance > 30 days)
    let isOverdue = false;
    let overdueDays = 0;

    if (currentOutstanding > 0) {
      const referenceDate = lastPaymentDate
        ? new Date(lastPaymentDate)
        : lastTransactionDate
        ? new Date(lastTransactionDate)
        : new Date(customer.created_at || Date.now());
      const diffMs = Date.now() - referenceDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        isOverdue = true;
        overdueDays = diffDays;
      }
    }

    // 7. Status & Color Coding
    // Green: < 50%
    // Yellow: 50% - 80%
    // Red: > 80%
    // Black: Exceeded or blocked (>= 100% or limit reached)
    let status: CreditStandingStatus = 'Good Standing';
    let badgeColor: CreditBadgeColor = 'Green';

    if (currentOutstanding >= creditLimit && creditLimit > 0) {
      status = 'Blocked';
      badgeColor = 'Black';
    } else if (percentageUsed >= 80) {
      status = 'Critical';
      badgeColor = 'Red';
    } else if (percentageUsed >= 50) {
      status = 'Warning';
      badgeColor = 'Yellow';
    } else {
      status = 'Good Standing';
      badgeColor = 'Green';
    }

    if (isOverdue && status !== 'Blocked') {
      status = 'Overdue';
    }

    return {
      customerId: customer.id,
      customerName,
      phone: customer.phone,
      email: customer.email,
      creditLimit,
      currentOutstanding,
      availableCredit,
      percentageUsed,
      status,
      badgeColor,
      lastTransactionDate,
      lastPaymentDate,
      isOverdue,
      overdueDays,
    };
  }

  /**
   * Record a customer credit sale.
   * Validates credit limit beforehand and blocks if required credit exceeds available credit.
   */
  async recordCreditSale(
    shopId: string,
    staffId: string,
    input: CreditSaleInput
  ): Promise<{
    sale: CreditSaleRecord;
    creditStatus: CustomerCreditStatus;
    ledgerEntry: CustomerCreditLedgerEntry;
  }> {
    const safeShopId = shopId || 'shop-001';
    const saleAmount = Number(input.saleAmount || 0);
    const paymentReceivedToday = Math.max(0, Number(input.paymentReceivedToday || 0));

    if (saleAmount <= 0) {
      throw new Error('Sale amount must be greater than zero');
    }

    if (paymentReceivedToday > saleAmount) {
      throw new Error('Payment received today cannot exceed total sale amount');
    }

    // Calculate credit needed: Sale Amount - Cash Payment Today = Credit Given
    const creditGiven = saleAmount - paymentReceivedToday;

    // 1. Fetch current credit status
    const currentStatus = await this.getCustomerCreditStatus(safeShopId, input.customerId);

    // 2. Enforcement: Check if credit given exceeds available credit (unless authorized admin override provided)
    if (creditGiven > currentStatus.availableCredit && !input.adminOverrideReason?.trim()) {
      const err = new Error(
        `Customer has reached credit limit. Outstanding: ${currentStatus.currentOutstanding.toLocaleString()} PKR, Limit: ${currentStatus.creditLimit.toLocaleString()} PKR, Available: ${currentStatus.availableCredit.toLocaleString()} PKR. Sale cannot be processed on credit. (Credit requested: ${creditGiven.toLocaleString()} PKR).`
      );
      (err as any).statusCode = 400;
      (err as any).code = 'CREDIT_LIMIT_EXCEEDED';
      (err as any).data = {
        outstanding: currentStatus.currentOutstanding,
        limit: currentStatus.creditLimit,
        available: currentStatus.availableCredit,
        requestedCredit: creditGiven,
      };
      throw err;
    }

    const txDate = new Date().toISOString();
    const newOutstanding = currentStatus.currentOutstanding + creditGiven;
    const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ledgerId = `led-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    let savedSale: CreditSaleRecord = {
      saleId,
      shopId: safeShopId,
      customerId: input.customerId,
      customerName: currentStatus.customerName,
      saleAmount,
      paymentReceivedToday,
      creditGiven,
      transactionDate: txDate,
      itemsSoldJson: input.items || [],
      staffMemberId: staffId || input.staffMemberId || 'staff-pos',
      notes: input.notes || 'POS Credit Sale',
      createdAt: txDate,
    };

    let savedLedger: CustomerCreditLedgerEntry = {
      ledgerId,
      shopId: safeShopId,
      customerId: input.customerId,
      transactionType: 'CREDIT_SALE',
      amount: creditGiven,
      transactionDate: txDate,
      outstandingBalanceAfter: newOutstanding,
      referencedTransactionId: saleId,
      notes: input.notes || `Credit Sale (Paid: ${paymentReceivedToday}, Credit: ${creditGiven})`,
      createdAt: txDate,
    };

    // 3. Try DB insert for credit_sales
    try {
      const { data: dbSale, error: sErr } = await supabaseAdmin
        .from('credit_sales')
        .insert({
          shop_id: safeShopId,
          customer_id: input.customerId,
          sale_amount: saleAmount,
          payment_received_today: paymentReceivedToday,
          credit_given: creditGiven,
          transaction_date: txDate,
          items_sold_json: input.items || [],
          staff_member_id: staffId || input.staffMemberId || 'staff-pos',
          notes: input.notes || 'POS Credit Sale',
          created_at: txDate,
        })
        .select()
        .single();

      if (!sErr && dbSale) {
        savedSale.saleId = dbSale.sale_id;
        savedLedger.referencedTransactionId = dbSale.sale_id;
      }
    } catch (e) {
      // fallback to memory
    }

    // 4. Try DB insert for customer_credit_ledger
    try {
      const { data: dbLedger, error: lErr } = await supabaseAdmin
        .from('customer_credit_ledger')
        .insert({
          shop_id: safeShopId,
          customer_id: input.customerId,
          transaction_type: 'CREDIT_SALE',
          amount: creditGiven,
          transaction_date: txDate,
          outstanding_balance_after: newOutstanding,
          referenced_transaction_id: savedSale.saleId,
          notes: savedLedger.notes,
          created_at: txDate,
        })
        .select()
        .single();

      if (!lErr && dbLedger) {
        savedLedger.ledgerId = dbLedger.ledger_id;
      }
    } catch (e) {
      // fallback to memory
    }

    // Always keep in-memory cache synchronized
    memState.creditSales.unshift(savedSale);
    memState.customerCreditLedger.unshift(savedLedger);

    // 5. If down payment was made, record in customer_payments table as well
    if (paymentReceivedToday > 0) {
      const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const downPayment: CustomerPaymentRecord = {
        paymentId,
        shopId: safeShopId,
        customerId: input.customerId,
        customerName: currentStatus.customerName,
        amountPaid: paymentReceivedToday,
        paymentMethod: 'Cash',
        paymentDate: txDate,
        recordedByUserId: staffId || 'staff-pos',
        notes: `Down payment for Credit Sale #${savedSale.saleId}`,
        createdAt: txDate,
      };
      try {
        await supabaseAdmin.from('customer_payments').insert({
          shop_id: safeShopId,
          customer_id: input.customerId,
          amount_paid: paymentReceivedToday,
          payment_method: 'Cash',
          payment_date: txDate,
          recorded_by_user_id: staffId || 'staff-pos',
          notes: downPayment.notes,
          created_at: txDate,
        });
      } catch (e) {
        // ignore
      }
      memState.customerPayments.unshift(downPayment);
    }

    // 6. Recalculate updated status
    const updatedStatus = await this.getCustomerCreditStatus(safeShopId, input.customerId);

    return {
      sale: savedSale,
      creditStatus: updatedStatus,
      ledgerEntry: savedLedger,
    };
  }

  /**
   * Record a customer payment to pay down credit.
   * Reduces outstanding balance and immediately increases available credit.
   */
  async recordCustomerPayment(
    shopId: string,
    userId: string,
    input: CustomerPaymentInput
  ): Promise<{
    payment: CustomerPaymentRecord;
    creditStatus: CustomerCreditStatus;
    ledgerEntry: CustomerCreditLedgerEntry;
  }> {
    const safeShopId = shopId || 'shop-001';
    const amountPaid = Number(input.amountPaid || 0);

    if (amountPaid <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // 1. Fetch current credit status
    const currentStatus = await this.getCustomerCreditStatus(safeShopId, input.customerId);

    const txDate = input.paymentDate || new Date().toISOString();
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ledgerId = `led-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 2. Calculate new outstanding balance (cannot go below 0)
    const newOutstanding = Math.max(0, currentStatus.currentOutstanding - amountPaid);

    let savedPayment: CustomerPaymentRecord = {
      paymentId,
      shopId: safeShopId,
      customerId: input.customerId,
      customerName: currentStatus.customerName,
      amountPaid,
      paymentMethod: input.paymentMethod || 'Cash',
      paymentDate: txDate,
      recordedByUserId: userId || 'staff',
      notes: input.notes || 'Credit repayment',
      createdAt: txDate,
    };

    let savedLedger: CustomerCreditLedgerEntry = {
      ledgerId,
      shopId: safeShopId,
      customerId: input.customerId,
      transactionType: 'PAYMENT',
      amount: amountPaid,
      transactionDate: txDate,
      outstandingBalanceAfter: newOutstanding,
      referencedTransactionId: paymentId,
      notes: input.notes || `Credit payment received via ${input.paymentMethod || 'Cash'}`,
      createdAt: txDate,
    };

    // Try DB insert for customer_payments
    try {
      const { data: dbPay, error: pErr } = await supabaseAdmin
        .from('customer_payments')
        .insert({
          shop_id: safeShopId,
          customer_id: input.customerId,
          amount_paid: amountPaid,
          payment_method: input.paymentMethod || 'Cash',
          payment_date: txDate,
          recorded_by_user_id: userId || 'staff',
          notes: input.notes || 'Credit repayment',
          created_at: txDate,
        })
        .select()
        .single();

      if (!pErr && dbPay) {
        savedPayment.paymentId = dbPay.payment_id;
        savedLedger.referencedTransactionId = dbPay.payment_id;
      }
    } catch (e) {
      // fallback
    }

    // Try DB insert for customer_credit_ledger
    try {
      const { data: dbLedger, error: lErr } = await supabaseAdmin
        .from('customer_credit_ledger')
        .insert({
          shop_id: safeShopId,
          customer_id: input.customerId,
          transaction_type: 'PAYMENT',
          amount: amountPaid,
          transaction_date: txDate,
          outstanding_balance_after: newOutstanding,
          referenced_transaction_id: savedPayment.paymentId,
          notes: savedLedger.notes,
          created_at: txDate,
        })
        .select()
        .single();

      if (!lErr && dbLedger) {
        savedLedger.ledgerId = dbLedger.ledger_id;
      }
    } catch (e) {
      // fallback
    }

    memState.customerPayments.unshift(savedPayment);
    memState.customerCreditLedger.unshift(savedLedger);

    const updatedStatus = await this.getCustomerCreditStatus(safeShopId, input.customerId);

    return {
      payment: savedPayment,
      creditStatus: updatedStatus,
      ledgerEntry: savedLedger,
    };
  }

  /**
   * Get complete customer credit ledger history.
   */
  async getCustomerCreditLedger(
    shopId: string,
    customerId: string
  ): Promise<{
    customerStatus: CustomerCreditStatus;
    entries: CustomerCreditLedgerEntry[];
  }> {
    const safeShopId = shopId || 'shop-001';
    const status = await this.getCustomerCreditStatus(safeShopId, customerId);

    let entries: CustomerCreditLedgerEntry[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_credit_ledger')
        .select('*')
        .eq('shop_id', safeShopId)
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        entries = data.map((e) => ({
          ledgerId: e.ledger_id,
          shopId: e.shop_id,
          customerId: e.customer_id,
          transactionType: e.transaction_type,
          amount: Number(e.amount),
          transactionDate: e.transaction_date,
          outstandingBalanceAfter: Number(e.outstanding_balance_after),
          referencedTransactionId: e.referenced_transaction_id,
          notes: e.notes,
          createdAt: e.created_at,
        }));
      }
    } catch (e) {
      // fallback
    }

    if (entries.length === 0) {
      entries = memState.customerCreditLedger
        .filter((e) => e.shopId === safeShopId && e.customerId === customerId)
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    }

    return {
      customerStatus: status,
      entries,
    };
  }

  /**
   * Update customer credit limit.
   */
  async updateCustomerCreditLimit(
    shopId: string,
    customerId: string,
    creditLimit: number
  ): Promise<CustomerCreditStatus> {
    const safeShopId = shopId || 'shop-001';
    const cleanLimit = Math.max(0, Number(creditLimit || 0));

    // Save in memory
    memState.customerCreditLimits.set(`${safeShopId}:${customerId}`, cleanLimit);

    try {
      await supabaseAdmin
        .from('customers')
        .update({
          credit_limit: cleanLimit,
          updated_at: new Date().toISOString(),
        })
        .eq('shop_id', safeShopId)
        .eq('id', customerId);
    } catch (e) {
      // ignore
    }

    return this.getCustomerCreditStatus(safeShopId, customerId);
  }

  // ==========================================================================
  // VENDOR CREDIT MANAGEMENT
  // ==========================================================================

  /**
   * Get vendor credit status, limit, outstanding payable, and available credit.
   */
  async getVendorCreditStatus(shopId: string, vendorId: string): Promise<VendorCreditStatus> {
    const safeShopId = shopId || 'shop-001';
    const safeVendorId = toSafeUUID(vendorId);

    let vendor: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('vendors')
        .select('vendor_id, vendor_name, contact_number, email, credit_limit, created_at')
        .eq('shop_id', safeShopId)
        .eq('vendor_id', safeVendorId)
        .maybeSingle();

      if (!error && data) {
        vendor = data;
      }
    } catch (e) {
      // ignore
    }

    if (!vendor) {
      const memVendorLimit =
        memState.vendorCreditLimits.get(`${safeShopId}:${vendorId}`) ||
        memState.vendorCreditLimits.get(`${safeShopId}:${safeVendorId}`) ||
        0;
      vendor = {
        vendor_id: safeVendorId,
        vendor_name: `Vendor ${vendorId.slice(0, 8)}`,
        contact_number: '+923009876543',
        email: 'vendor@supplier.com',
        credit_limit: memVendorLimit,
        created_at: new Date().toISOString(),
      };
    }

    const memLimit =
      memState.vendorCreditLimits.get(`${safeShopId}:${vendorId}`) ||
      memState.vendorCreditLimits.get(`${safeShopId}:${safeVendorId}`);
    const creditLimit = memLimit !== undefined ? memLimit : Number(vendor.credit_limit || 0);

    // Fetch latest ledger
    let currentOutstanding = 0;
    let lastTransactionDate: string | undefined = undefined;

    let useDbLedger = false;
    try {
      const { data: latestLedger, error: lErr } = await supabaseAdmin
        .from('vendor_credit_ledger')
        .select('outstanding_balance_after, transaction_date')
        .eq('shop_id', safeShopId)
        .eq('vendor_id', safeVendorId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lErr && latestLedger) {
        useDbLedger = true;
        currentOutstanding = Math.max(0, Number(latestLedger.outstanding_balance_after || 0));
        lastTransactionDate = latestLedger.transaction_date;
      } else if (!lErr) {
        useDbLedger = true;
      }
    } catch (e) {
      useDbLedger = false;
    }

    if (!useDbLedger) {
      const vEntries = memState.vendorCreditLedger
        .filter(
          (e) =>
            e.shopId === safeShopId &&
            (e.vendorId === vendorId || e.vendorId === safeVendorId)
        )
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

      if (vEntries.length > 0) {
        currentOutstanding = Math.max(0, vEntries[0].outstandingBalanceAfter);
        lastTransactionDate = vEntries[0].transactionDate;
      }
    }

    const availableCredit = Math.max(0, creditLimit - currentOutstanding);
    let percentageUsed = 0;
    if (creditLimit > 0) {
      percentageUsed = Math.round((currentOutstanding / creditLimit) * 10000) / 100;
    } else if (currentOutstanding > 0) {
      percentageUsed = 100;
    }

    let status: CreditStandingStatus = 'Good Standing';
    let badgeColor: CreditBadgeColor = 'Green';

    if (currentOutstanding >= creditLimit && creditLimit > 0) {
      status = 'Blocked';
      badgeColor = 'Black';
    } else if (percentageUsed >= 80) {
      status = 'Critical';
      badgeColor = 'Red';
    } else if (percentageUsed >= 50) {
      status = 'Warning';
      badgeColor = 'Yellow';
    } else {
      status = 'Good Standing';
      badgeColor = 'Green';
    }

    return {
      vendorId: vendor.vendor_id,
      vendorName: vendor.vendor_name || 'Vendor',
      contactNumber: vendor.contact_number,
      email: vendor.email,
      creditLimit,
      currentOutstanding,
      availableCredit,
      percentageUsed,
      status,
      badgeColor,
      lastTransactionDate,
      lastPaymentDate: undefined,
    };
  }

  /**
   * Record a vendor credit purchase.
   * Checks limit, allows admin override with warning if requested.
   */
  async recordCreditPurchase(
    shopId: string,
    userId: string,
    input: CreditPurchaseInput
  ): Promise<{
    purchase: CreditPurchaseRecord;
    vendorStatus: VendorCreditStatus;
    ledgerEntry: VendorCreditLedgerEntry;
    overrideApplied: boolean;
  }> {
    const safeShopId = shopId || 'shop-001';
    const safeVendorId = toSafeUUID(input.vendorId);
    const purchaseAmount = Number(input.purchaseAmount || 0);
    const paymentPaidToday = Math.max(0, Number(input.paymentPaidToday || 0));

    if (purchaseAmount <= 0) {
      throw new Error('Purchase amount must be greater than zero');
    }

    const creditTaken = purchaseAmount - paymentPaidToday;
    const currentStatus = await this.getVendorCreditStatus(safeShopId, safeVendorId);

    const projectedOutstanding = currentStatus.currentOutstanding + creditTaken;
    let overrideApplied = false;

    // Check limit enforcement
    if (projectedOutstanding > currentStatus.creditLimit && currentStatus.creditLimit > 0) {
      if (!input.allowOverride) {
        const err = new Error(
          `This purchase of ${creditTaken.toLocaleString()} PKR would bring total owing to vendor to ${projectedOutstanding.toLocaleString()} PKR, exceeding their credit limit of ${currentStatus.creditLimit.toLocaleString()} PKR.`
        );
        (err as any).statusCode = 400;
        (err as any).code = 'VENDOR_CREDIT_LIMIT_EXCEEDED';
        (err as any).data = {
          currentOutstanding: currentStatus.currentOutstanding,
          creditTaken,
          projectedOutstanding,
          creditLimit: currentStatus.creditLimit,
        };
        throw err;
      }
      overrideApplied = true;
    }

    const txDate = new Date().toISOString();
    const purchaseId = `pur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ledgerId = `vled-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newOutstanding = currentStatus.currentOutstanding + creditTaken;

    let savedPurchase: CreditPurchaseRecord = {
      purchaseId,
      shopId: safeShopId,
      vendorId: safeVendorId,
      vendorName: currentStatus.vendorName,
      purchaseAmount,
      paymentPaidToday,
      creditTaken,
      transactionDate: txDate,
      itemsPurchasedJson: input.items || [],
      recordedByUserId: userId || 'admin',
      overrideApplied,
      notes: input.notes || 'Vendor Credit Purchase',
      createdAt: txDate,
    };

    let savedLedger: VendorCreditLedgerEntry = {
      ledgerId,
      shopId: safeShopId,
      vendorId: safeVendorId,
      transactionType: 'CREDIT_PURCHASE',
      amount: creditTaken,
      transactionDate: txDate,
      outstandingBalanceAfter: newOutstanding,
      referencedTransactionId: purchaseId,
      notes: input.notes || `Credit Purchase #${purchaseId}`,
      createdAt: txDate,
    };

    try {
      const { data: pData, error: pErr } = await supabaseAdmin
        .from('credit_purchases')
        .insert({
          shop_id: safeShopId,
          vendor_id: safeVendorId,
          purchase_amount: purchaseAmount,
          payment_paid_today: paymentPaidToday,
          credit_taken: creditTaken,
          transaction_date: txDate,
          items_purchased_json: input.items || [],
          recorded_by_user_id: userId || 'admin',
          override_applied: overrideApplied,
          notes: savedPurchase.notes,
          created_at: txDate,
        })
        .select()
        .single();

      if (!pErr && pData) {
        savedPurchase.purchaseId = pData.purchase_id;
        savedLedger.referencedTransactionId = pData.purchase_id;
      }
    } catch (e) {
      // fallback
    }

    try {
      const { data: lData, error: lErr } = await supabaseAdmin
        .from('vendor_credit_ledger')
        .insert({
          shop_id: safeShopId,
          vendor_id: safeVendorId,
          transaction_type: 'CREDIT_PURCHASE',
          amount: creditTaken,
          transaction_date: txDate,
          outstanding_balance_after: newOutstanding,
          referenced_transaction_id: savedPurchase.purchaseId,
          notes: savedLedger.notes,
          created_at: txDate,
        })
        .select()
        .single();

      if (!lErr && lData) {
        savedLedger.ledgerId = lData.ledger_id;
      }
    } catch (e) {
      // fallback
    }

    memState.creditPurchases.unshift(savedPurchase);
    memState.vendorCreditLedger.unshift(savedLedger);

    const updatedStatus = await this.getVendorCreditStatus(safeShopId, safeVendorId);

    return {
      purchase: savedPurchase,
      vendorStatus: updatedStatus,
      ledgerEntry: savedLedger,
      overrideApplied,
    };
  }

  /**
   * Record payment to vendor.
   * Reduces shop's liability and restores available vendor credit limit.
   */
  async recordVendorPayment(
    shopId: string,
    userId: string,
    input: VendorPaymentInput
  ): Promise<{
    payment: VendorPaymentRecord;
    vendorStatus: VendorCreditStatus;
    ledgerEntry: VendorCreditLedgerEntry;
  }> {
    const safeShopId = shopId || 'shop-001';
    const safeVendorId = toSafeUUID(input.vendorId);
    const amountPaid = Number(input.amountPaid || 0);

    if (amountPaid <= 0) {
      throw new Error('Vendor payment amount must be greater than zero');
    }

    const currentStatus = await this.getVendorCreditStatus(safeShopId, safeVendorId);
    const txDate = input.paymentDate || new Date().toISOString();
    const paymentId = `vpay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ledgerId = `vled-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newOutstanding = Math.max(0, currentStatus.currentOutstanding - amountPaid);

    let savedPayment: VendorPaymentRecord = {
      paymentId,
      shopId: safeShopId,
      vendorId: safeVendorId,
      vendorName: currentStatus.vendorName,
      amountPaid,
      paymentMethod: input.paymentMethod || 'Cash',
      paymentDate: txDate,
      recordedByUserId: userId || 'admin',
      notes: input.notes || 'Vendor credit payment',
      createdAt: txDate,
    };

    let savedLedger: VendorCreditLedgerEntry = {
      ledgerId,
      shopId: safeShopId,
      vendorId: safeVendorId,
      transactionType: 'PAYMENT',
      amount: amountPaid,
      transactionDate: txDate,
      outstandingBalanceAfter: newOutstanding,
      referencedTransactionId: paymentId,
      notes: input.notes || `Vendor payment via ${input.paymentMethod || 'Cash'}`,
      createdAt: txDate,
    };

    try {
      const { data: pData, error: pErr } = await supabaseAdmin
        .from('vendor_credit_payments')
        .insert({
          shop_id: safeShopId,
          vendor_id: safeVendorId,
          amount_paid: amountPaid,
          payment_method: input.paymentMethod || 'Cash',
          payment_date: txDate,
          recorded_by_user_id: userId || 'admin',
          notes: savedPayment.notes,
          created_at: txDate,
        })
        .select()
        .single();

      if (!pErr && pData) {
        savedPayment.paymentId = pData.payment_id;
        savedLedger.referencedTransactionId = pData.payment_id;
      }
    } catch (e) {
      // fallback
    }

    try {
      const { data: lData, error: lErr } = await supabaseAdmin
        .from('vendor_credit_ledger')
        .insert({
          shop_id: safeShopId,
          vendor_id: safeVendorId,
          transaction_type: 'PAYMENT',
          amount: amountPaid,
          transaction_date: txDate,
          outstanding_balance_after: newOutstanding,
          referenced_transaction_id: savedPayment.paymentId,
          notes: savedLedger.notes,
          created_at: txDate,
        })
        .select()
        .single();

      if (!lErr && lData) {
        savedLedger.ledgerId = lData.ledger_id;
      }
    } catch (e) {
      // fallback
    }

    memState.vendorPayments.unshift(savedPayment);
    memState.vendorCreditLedger.unshift(savedLedger);

    const updatedStatus = await this.getVendorCreditStatus(safeShopId, safeVendorId);

    return {
      payment: savedPayment,
      vendorStatus: updatedStatus,
      ledgerEntry: savedLedger,
    };
  }

  /**
   * Get vendor credit ledger.
   */
  async getVendorCreditLedger(
    shopId: string,
    vendorId: string
  ): Promise<{
    vendorStatus: VendorCreditStatus;
    entries: VendorCreditLedgerEntry[];
  }> {
    const safeShopId = shopId || 'shop-001';
    const safeVendorId = toSafeUUID(vendorId);
    const status = await this.getVendorCreditStatus(safeShopId, safeVendorId);

    let entries: VendorCreditLedgerEntry[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('vendor_credit_ledger')
        .select('*')
        .eq('shop_id', safeShopId)
        .eq('vendor_id', safeVendorId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        entries = data.map((e) => ({
          ledgerId: e.ledger_id,
          shopId: e.shop_id,
          vendorId: e.vendor_id,
          transactionType: e.transaction_type,
          amount: Number(e.amount),
          transactionDate: e.transaction_date,
          outstandingBalanceAfter: Number(e.outstanding_balance_after),
          referencedTransactionId: e.referenced_transaction_id,
          notes: e.notes,
          createdAt: e.created_at,
        }));
      }
    } catch (e) {
      // fallback
    }

    if (entries.length === 0) {
      entries = memState.vendorCreditLedger
        .filter(
          (e) =>
            e.shopId === safeShopId &&
            (e.vendorId === vendorId || e.vendorId === safeVendorId)
        )
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    }

    return {
      vendorStatus: status,
      entries,
    };
  }

  /**
   * Update vendor credit limit.
   */
  async updateVendorCreditLimit(
    shopId: string,
    vendorId: string,
    creditLimit: number
  ): Promise<VendorCreditStatus> {
    const safeShopId = shopId || 'shop-001';
    const safeVendorId = toSafeUUID(vendorId);
    const cleanLimit = Math.max(0, Number(creditLimit || 0));

    memState.vendorCreditLimits.set(`${safeShopId}:${vendorId}`, cleanLimit);
    memState.vendorCreditLimits.set(`${safeShopId}:${safeVendorId}`, cleanLimit);

    try {
      await supabaseAdmin
        .from('vendors')
        .update({
          credit_limit: cleanLimit,
          updated_at: new Date().toISOString(),
        })
        .eq('shop_id', safeShopId)
        .eq('vendor_id', safeVendorId);
    } catch (e) {
      // ignore
    }

    return this.getVendorCreditStatus(safeShopId, safeVendorId);
  }

  // ==========================================================================
  // REPORTS & ANALYTICS
  // ==========================================================================

  /**
   * Get Customer Credit Report with color coding, sorting, and aggregate KPIs.
   */
  async getCustomerCreditReport(
    shopId: string,
    options?: {
      sortBy?: 'outstanding' | 'limit' | 'percentage' | 'name' | 'overdue';
      order?: 'asc' | 'desc';
      search?: string;
      status?: string;
    }
  ): Promise<{
    summary: CustomerCreditReportSummary;
    customers: CustomerCreditStatus[];
  }> {
    const safeShopId = shopId || 'shop-001';

    let customerIds: string[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select('id');

      if (!error && Array.isArray(data) && data.length > 0) {
        customerIds = data.map((c) => c.id);
      }
    } catch (e) {
      // fallback
    }

    // Add any customer IDs in memState
    for (const key of memState.customerCreditLimits.keys()) {
      const [sId, cId] = key.split(':');
      if (!customerIds.includes(cId)) {
        customerIds.push(cId);
      }
    }
    for (const entry of memState.customerCreditLedger) {
      if (!customerIds.includes(entry.customerId)) {
        customerIds.push(entry.customerId);
      }
    }

    // If empty, return empty list without injecting dummy customers
    const statuses: CustomerCreditStatus[] = [];
    for (const cId of customerIds) {
      try {
        const st = await this.getCustomerCreditStatus(safeShopId, cId);
        statuses.push(st);
      } catch (e) {
        // ignore
      }
    }

    // Sorting
    const sortBy = options?.sortBy || 'outstanding';
    const isAsc = options?.order === 'asc';

    statuses.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'outstanding') diff = a.currentOutstanding - b.currentOutstanding;
      else if (sortBy === 'limit') diff = a.creditLimit - b.creditLimit;
      else if (sortBy === 'percentage') diff = a.percentageUsed - b.percentageUsed;
      else if (sortBy === 'overdue') diff = (a.isOverdue ? 1 : 0) - (b.isOverdue ? 1 : 0);
      else if (sortBy === 'name') diff = a.customerName.localeCompare(b.customerName);
      return isAsc ? diff : -diff;
    });

    const filtered = options?.status
      ? statuses.filter((s) => s.status.toLowerCase() === options.status?.toLowerCase())
      : statuses;

    const summary: CustomerCreditReportSummary = {
      totalCustomers: statuses.length,
      totalCreditLimitExtended: statuses.reduce((acc, c) => acc + c.creditLimit, 0),
      totalOutstandingReceivable: statuses.reduce((acc, c) => acc + c.currentOutstanding, 0),
      totalAvailableCredit: statuses.reduce((acc, c) => acc + c.availableCredit, 0),
      customersInWarning: statuses.filter((c) => c.status === 'Warning' || c.status === 'Critical').length,
      customersBlocked: statuses.filter((c) => c.status === 'Blocked').length,
      customersOverdue: statuses.filter((c) => c.isOverdue).length,
      totalOverdueAmount: statuses.filter((c) => c.isOverdue).reduce((acc, c) => acc + c.currentOutstanding, 0),
    };

    return { summary, customers: filtered };
  }

  /**
   * Get Vendor Credit Report with liabilities and risk indicators.
   */
  async getVendorCreditReport(
    shopId: string,
    options?: {
      sortBy?: 'outstanding' | 'limit' | 'percentage' | 'name';
      order?: 'asc' | 'desc';
    }
  ): Promise<{
    summary: VendorCreditReportSummary;
    vendors: VendorCreditStatus[];
  }> {
    const safeShopId = shopId || 'shop-001';

    let vendorIds: string[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('vendors')
        .select('vendor_id')
        .eq('shop_id', safeShopId);

      if (!error && Array.isArray(data)) {
        vendorIds = data.map((v) => v.vendor_id);
      }
    } catch (e) {
      // ignore
    }

    for (const key of memState.vendorCreditLimits.keys()) {
      const [sId, vId] = key.split(':');
      if (sId === safeShopId && !vendorIds.includes(vId)) {
        vendorIds.push(vId);
      }
    }
    for (const entry of memState.vendorCreditLedger) {
      if (entry.shopId === safeShopId && !vendorIds.includes(entry.vendorId)) {
        vendorIds.push(entry.vendorId);
      }
    }

    const statuses: VendorCreditStatus[] = [];
    for (const vId of vendorIds) {
      try {
        const st = await this.getVendorCreditStatus(safeShopId, vId);
        statuses.push(st);
      } catch (e) {
        // ignore
      }
    }

    const sortBy = options?.sortBy || 'outstanding';
    const isAsc = options?.order === 'asc';

    statuses.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'outstanding') diff = a.currentOutstanding - b.currentOutstanding;
      else if (sortBy === 'limit') diff = a.creditLimit - b.creditLimit;
      else if (sortBy === 'percentage') diff = a.percentageUsed - b.percentageUsed;
      else if (sortBy === 'name') diff = a.vendorName.localeCompare(b.vendorName);
      return isAsc ? diff : -diff;
    });

    const summary: VendorCreditReportSummary = {
      totalVendors: statuses.length,
      totalCreditLimitExtended: statuses.reduce((acc, v) => acc + v.creditLimit, 0),
      totalOutstandingPayable: statuses.reduce((acc, v) => acc + v.currentOutstanding, 0),
      totalAvailableCredit: statuses.reduce((acc, v) => acc + v.availableCredit, 0),
      vendorsInWarning: statuses.filter((v) => v.status === 'Warning' || v.status === 'Critical').length,
      vendorsExceeded: statuses.filter((v) => v.status === 'Blocked').length,
    };

    return { summary, vendors: statuses };
  }

  /**
   * Overdue aging analysis.
   */
  async getOverdueReport(shopId: string, thresholdDays = 30): Promise<{
    thresholdDays: number;
    totalOverdueCustomers: number;
    totalOverdueAmount: number;
    agingBuckets: Record<string, { count: number; amount: number }>;
    items: OverdueAgingItem[];
  }> {
    const safeShopId = shopId || 'shop-001';
    const report = await this.getCustomerCreditReport(safeShopId);

    const items: OverdueAgingItem[] = [];
    const agingBuckets = {
      '1-30 Days': { count: 0, amount: 0 },
      '31-60 Days': { count: 0, amount: 0 },
      '61-90 Days': { count: 0, amount: 0 },
      '90+ Days': { count: 0, amount: 0 },
    };

    for (const cust of report.customers) {
      if (cust.currentOutstanding > 0 && cust.overdueDays >= thresholdDays) {
        let bucket: '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days' = '31-60 Days';
        if (cust.overdueDays <= 30) bucket = '1-30 Days';
        else if (cust.overdueDays <= 60) bucket = '31-60 Days';
        else if (cust.overdueDays <= 90) bucket = '61-90 Days';
        else bucket = '90+ Days';

        agingBuckets[bucket].count += 1;
        agingBuckets[bucket].amount += cust.currentOutstanding;

        items.push({
          customerId: cust.customerId,
          customerName: cust.customerName,
          phone: cust.phone,
          creditLimit: cust.creditLimit,
          currentOutstanding: cust.currentOutstanding,
          overdueAmount: cust.currentOutstanding,
          daysPastDue: cust.overdueDays,
          lastPaymentDate: cust.lastPaymentDate,
          oldestUnpaidTransactionDate: cust.lastTransactionDate,
          bucket,
        });
      }
    }

    return {
      thresholdDays,
      totalOverdueCustomers: items.length,
      totalOverdueAmount: items.reduce((acc, i) => acc + i.overdueAmount, 0),
      agingBuckets,
      items,
    };
  }

  /**
   * Running sales history (cash/immediate transactions separated from credit sales).
   */
  async getRunningSalesHistory(
    shopId: string,
    options?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string }
  ) {
    const safeShopId = shopId || 'shop-001';
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));

    try {
      let dbQuery = supabaseAdmin
        .from('orders')
        .select('*, order_items(*)', { count: 'exact' })
        .eq('shop_id', safeShopId)
        .eq('order_type', 'POS')
        .eq('payment_status', 'Paid');

      if (options?.dateFrom) dbQuery = dbQuery.gte('order_date', options.dateFrom);
      if (options?.dateTo) dbQuery = dbQuery.lte('order_date', options.dateTo);

      dbQuery = dbQuery.order('order_date', { ascending: false }).range((page - 1) * limit, page * limit - 1);

      const { data, count, error } = await dbQuery;
      if (!error && data) {
        return {
          runningSales: data,
          total: count || 0,
          page,
          pages: Math.ceil((count || 0) / limit) || 1,
        };
      }
    } catch (e) {
      // fallback
    }

    return {
      runningSales: [],
      total: 0,
      page,
      pages: 1,
    };
  }
}
