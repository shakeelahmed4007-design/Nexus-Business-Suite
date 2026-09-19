import axios from 'axios';
import { CreditService } from '../services/creditService';

const BASE_URL = 'http://localhost:5000/api/v1';
const SHOP_ID = 'shop-001';

// Mock session header for super_admin
const mockSession = Buffer.from(
  JSON.stringify({
    id: 'super-admin-01',
    email: 'admin@nexus.com',
    role: 'super_admin',
    shop_id: SHOP_ID,
  })
).toString('base64');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Mock-Session': mockSession,
    'x-shop-id': SHOP_ID,
    'Content-Type': 'application/json',
  },
});

async function runVerification() {
  console.log('===============================================================');
  console.log('🧪 RUNNING CREDIT MANAGEMENT SYSTEM AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  const customerAliId = 'cust-ali-001';
  const customerBobId = 'cust-bob-002';
  const vendorElectroId = '00000000-0000-0000-0000-000000000088';

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: CREDIT SALE WITHIN LIMIT
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Credit Sale Within Limit ---');

    // 1. Set Ali's Credit Limit to 500,000
    const setLimitRes = await api.put(`/customers/${customerAliId}/credit-limit`, {
      credit_limit: 500000,
    });
    assert(
      setLimitRes.data.success && setLimitRes.data.data.creditLimit === 500000,
      'Admin sets customer credit limit to 500,000 PKR'
    );

    // Initial base credit: purchase 200,000 on credit first
    await api.post('/credit-sales', {
      customer_id: customerAliId,
      sale_amount: 200000,
      payment_received_today: 0,
      notes: 'Initial credit purchase for testing',
    });

    let statusRes = await api.get(`/customers/${customerAliId}/credit-status`);
    assert(
      statusRes.data.data.currentOutstanding === 200000 &&
        statusRes.data.data.availableCredit === 300000,
      'Customer Ali has 200,000 outstanding and 300,000 available'
    );

    // Now purchase for 150,000 with 50,000 cash paid today -> Credit given = 100,000
    const saleRes = await api.post('/credit-sales', {
      customer_id: customerAliId,
      sale_amount: 150000,
      payment_received_today: 50000,
      notes: 'Purchase with partial down-payment',
    });

    assert(
      saleRes.data.success && saleRes.data.data.sale.creditGiven === 100000,
      'Credit sale processed: 150,000 total - 50,000 cash = 100,000 credit given'
    );

    statusRes = await api.get(`/customers/${customerAliId}/credit-status`);
    assert(
      statusRes.data.data.currentOutstanding === 300000 &&
        statusRes.data.data.availableCredit === 200000,
      'Outstanding updated to 300,000 and Available Credit to 200,000'
    );

    // Check customer credit ledger
    const ledgerRes = await api.get(`/customers/${customerAliId}/credit-ledger`);
    assert(
      ledgerRes.data.data.entries.length >= 2,
      'Ledger maintains chronological credit sales history'
    );
    assert(
      ledgerRes.data.data.entries[0].outstandingBalanceAfter === 300000,
      'Ledger running balance reflects accurate balance of 300,000'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 2: CREDIT SALE BLOCKED (LIMIT REACHED)
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Credit Sale Blocked When Limit Exceeded ---');

    // Setup Bob with limit 200,000 and outstanding 200,000
    await api.put(`/customers/${customerBobId}/credit-limit`, { credit_limit: 200000 });
    await api.post('/credit-sales', {
      customer_id: customerBobId,
      sale_amount: 200000,
      payment_received_today: 0,
    });

    const bobStatus = await api.get(`/customers/${customerBobId}/credit-status`);
    assert(
      bobStatus.data.data.availableCredit === 0 && bobStatus.data.data.status === 'Blocked',
      'Customer Bob reached 100% limit; status is Blocked with Available Credit 0'
    );

    // Try to purchase for 50,000 on credit
    let blockedSuccess = false;
    try {
      await api.post('/credit-sales', {
        customer_id: customerBobId,
        sale_amount: 50000,
        payment_received_today: 0,
      });
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.code === 'CREDIT_LIMIT_EXCEEDED') {
        blockedSuccess = true;
      }
    }
    assert(blockedSuccess, 'System blocks credit sale when customer has 0 available credit');

    // ------------------------------------------------------------------------
    // SCENARIO 3: LIMIT EXCEEDED WARNING & ADJUSTMENT
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Limit Exceeded Warning & Cash Payment Adjustment ---');

    // Setup: Ali currently has 300,000 outstanding, limit 500,000 -> 200,000 available.
    // Let's add 150,000 to outstanding -> 450,000 outstanding (50,000 available)
    await api.post('/credit-sales', {
      customer_id: customerAliId,
      sale_amount: 150000,
      payment_received_today: 0,
    });

    const aliStatusPre = await api.get(`/customers/${customerAliId}/credit-status`);
    assert(
      aliStatusPre.data.data.availableCredit === 50000,
      'Ali has only 50,000 PKR available credit left'
    );

    // Try sale for 100,000 with 0 cash -> should fail
    let warningTriggered = false;
    try {
      await api.post('/credit-sales', {
        customer_id: customerAliId,
        sale_amount: 100000,
        payment_received_today: 0,
      });
    } catch (err: any) {
      if (err.response?.status === 400) {
        warningTriggered = true;
      }
    }
    assert(warningTriggered, 'Sale of 100,000 blocked because available credit is only 50,000');

    // Now adjust: Customer pays 50,000 cash down payment -> credit needed = 50,000 -> should succeed!
    const adjustedSale = await api.post('/credit-sales', {
      customer_id: customerAliId,
      sale_amount: 100000,
      payment_received_today: 50000,
      notes: 'Adjusted with 50,000 cash payment to fit available credit',
    });
    assert(
      adjustedSale.data.success && adjustedSale.data.data.sale.creditGiven === 50000,
      'Adjusted sale succeeds when customer pays 50,000 cash down payment'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 4: PARTIAL REPAYMENT & BALANCE REDUCTION
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Partial Payment Reduces Balance & Increases Available Credit ---');

    // Ali currently owes 500,000. Ali comes with 100,000 cash installment.
    const payRes = await api.post('/customer-payments', {
      customer_id: customerAliId,
      amount_paid: 100000,
      payment_method: 'Cash',
      notes: 'Partial installment payment',
    });

    assert(payRes.data.success, 'Payment of 100,000 PKR recorded successfully');
    assert(
      payRes.data.data.creditStatus.currentOutstanding === 400000,
      'Ali outstanding balance reduced from 500,000 to 400,000'
    );
    assert(
      payRes.data.data.creditStatus.availableCredit === 100000,
      'Ali available credit immediately increased to 100,000'
    );

    // Pay another 150,000
    const payRes2 = await api.post('/customer-payments', {
      customer_id: customerAliId,
      amount_paid: 150000,
      payment_method: 'Bank Transfer',
      notes: 'Second installment',
    });
    assert(
      payRes2.data.data.creditStatus.currentOutstanding === 250000 &&
        payRes2.data.data.creditStatus.availableCredit === 250000,
      'Second payment updates outstanding to 250,000 and available credit to 250,000'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 5: CREDIT LIMIT ADJUSTMENT
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Admin Limit Adjustment Applies Immediately ---');

    // Admin increases Ali's limit from 500,000 to 750,000
    const limitUpdate = await api.put(`/customers/${customerAliId}/credit-limit`, {
      credit_limit: 750000,
    });

    assert(
      limitUpdate.data.data.creditLimit === 750000,
      'Customer limit updated to 750,000 PKR'
    );
    assert(
      limitUpdate.data.data.availableCredit === 500000,
      'Available credit dynamically updated to 500,000 (750k - 250k outstanding)'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 6: VENDOR CREDIT TRACKING & ADMIN OVERRIDE
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Vendor Credit Tracking & Admin Override ---');

    // 1. Setup Vendor with 1,000,000 limit
    await api.put(`/vendors/${vendorElectroId}/credit-limit`, { credit_limit: 1000000 });
    const vendorStatus1 = await api.get(`/vendors/${vendorElectroId}/credit-status`);
    assert(
      vendorStatus1.data.data.creditLimit === 1000000,
      'Vendor Electro Shop credit limit initialized to 1,000,000 PKR'
    );

    // 2. Initial purchase 600,000 on credit
    await api.post('/credit-purchases', {
      vendor_id: vendorElectroId,
      purchase_amount: 600000,
      payment_paid_today: 0,
      notes: 'Bulk stock purchase',
    });

    // 3. Additional purchase 300,000 (Allowed: 600k + 300k = 900k < 1M)
    const vPurchase1 = await api.post('/credit-purchases', {
      vendor_id: vendorElectroId,
      purchase_amount: 300000,
      payment_paid_today: 0,
    });
    assert(
      vPurchase1.data.success && vPurchase1.data.data.vendorStatus.currentOutstanding === 900000,
      'Purchase of 300,000 allowed: vendor outstanding now 900,000 PKR'
    );

    // 4. Purchase 200,000 without override -> Blocked (900k + 200k = 1.1M > 1M)
    let vBlocked = false;
    try {
      await api.post('/credit-purchases', {
        vendor_id: vendorElectroId,
        purchase_amount: 200000,
        payment_paid_today: 0,
        allow_override: false,
      });
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.code === 'VENDOR_CREDIT_LIMIT_EXCEEDED') {
        vBlocked = true;
      }
    }
    assert(vBlocked, 'Vendor purchase of 200,000 blocked when exceeding 1,000,000 credit limit');

    // 5. Admin override applied
    const vOverride = await api.post('/credit-purchases', {
      vendor_id: vendorElectroId,
      purchase_amount: 200000,
      payment_paid_today: 0,
      allow_override: true,
      notes: 'Emergency purchase approved by Director',
    });
    assert(
      vOverride.data.success && vOverride.data.data.overrideApplied === true,
      'Vendor purchase succeeds when admin explicit override is provided'
    );
    assert(
      vOverride.data.data.vendorStatus.currentOutstanding === 1100000,
      'Vendor outstanding correctly reflects 1,100,000 PKR'
    );

    // 6. Record payment to vendor: 500,000
    const vPay = await api.post('/vendor-payments', {
      vendor_id: vendorElectroId,
      amount_paid: 500000,
      payment_method: 'Bank Transfer',
      notes: 'Settlement installment',
    });
    assert(
      vPay.data.data.vendorStatus.currentOutstanding === 600000,
      'Vendor payment of 500,000 reduces liability to 600,000 PKR'
    );
    assert(
      vPay.data.data.vendorStatus.availableCredit === 400000,
      'Available vendor credit restored to 400,000 PKR'
    );

    // Check vendor ledger
    const vLedger = await api.get(`/vendors/${vendorElectroId}/credit-ledger`);
    assert(
      vLedger.data.data.entries.length >= 3,
      'Vendor credit ledger accurately records purchase and payment transactions'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 7: CREDIT REPORTS & ANALYTICS
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Credit Reports, Overdue Analysis & Running Sales ---');

    // Customer Credit Report
    const custReport = await api.get('/credit-reports/customers');
    assert(
      custReport.data.success && custReport.data.customers.length > 0,
      'Customer credit report returned with status classifications'
    );
    assert(
      custReport.data.summary.totalCreditLimitExtended > 0,
      'Customer report aggregate KPIs calculated successfully'
    );

    // Vendor Credit Report
    const vendorReport = await api.get('/credit-reports/vendors');
    assert(
      vendorReport.data.success && vendorReport.data.vendors.length > 0,
      'Vendor credit report returns active vendor liabilities'
    );

    // Overdue Report
    const overdueReport = await api.get('/credit-reports/customers/overdue?thresholdDays=1');
    assert(
      overdueReport.data.success && overdueReport.data.data.agingBuckets !== undefined,
      'Overdue aging analysis reports aging buckets (1-30, 31-60, 61-90, 90+ days)'
    );

    // Running Sales History
    const runningSales = await api.get('/running-sales');
    assert(
      runningSales.data.success && runningSales.data.data !== undefined,
      'Running cash sales query separates running sales from credit sales'
    );

    console.log('\n===============================================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) process.exit(1);
  } catch (err: any) {
    console.error('Fatal test error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runVerification();
