import { PosAdvancedService } from '../services/posAdvancedService';
import { CreditService } from '../services/creditService';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING POS SYSTEM ENHANCEMENT & ADVANCED FEATURES');
  console.log('====================================================\n');

  const posService = new PosAdvancedService();
  const creditService = new CreditService();

  const shopId = `test-pos-${Date.now()}`;
  const staffId = 'staff-chief-001';
  const customerId = `cust-${Date.now()}`;

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- 1. Initial Setup & Credit Limit
  console.log('--- TEST 1: Customer Credit Setup ---');
  await creditService.updateCustomerCreditLimit(shopId, customerId, 500000); // 500,000 PKR
  const initCredit = await posService.getCreditAvailability(shopId, customerId);
  assert(initCredit.credit_limit === 500000, 'Initial credit limit is 500,000 PKR');
  assert(initCredit.available_credit === 500000, 'Available credit is 500,000 PKR');
  assert(initCredit.is_at_limit === false, 'Customer is not at limit');

  // --- 2. Inventory Reservation
  console.log('\n--- TEST 2: Real-time Inventory Reservation ---');
  const res1 = await posService.reserveInventory(shopId, staffId, 'prod-laptop-001', 5);
  assert(res1.status === 'ACTIVE', 'Reservation status is ACTIVE');
  assert(res1.quantity_reserved === 5, 'Reserved quantity is 5 units');

  await posService.releaseReservation(shopId, res1.reservation_id);
  assert(res1.status === 'CANCELLED', 'Reservation cancelled successfully on release');

  // New reservation to commit with sale
  const activeRes = await posService.reserveInventory(shopId, staffId, 'prod-laptop-001', 10);
  assert(activeRes.status === 'ACTIVE', 'Active reservation created for 10 units');

  // --- 3. Scenario: Bulk Sale on Credit with Partial Cash Payment
  console.log('\n--- TEST 3: Bulk Sale with Tiered Pricing & Wholesale Tax Exemption ---');
  // 10 units @ 85,000 each = 850,000. 5% bulk discount = 42,500. Subtotal = 807,500. Tax = 0% (wholesale).
  // Customer pays 407,500 cash, 400,000 on credit.
  const bulkSale = await posService.executeAdvancedSale({
    shop_id: shopId,
    staff_id: staffId,
    customer_id: customerId,
    sale_type: 'BULK',
    items: [
      {
        product_id: 'prod-laptop-001',
        quantity: 10,
        unit_price: 85000,
        tax_percentage: 0,
      },
    ],
    subtotal: 850000,
    discount_amount: 42500,
    bulk_discount_percent: 5,
    tax_rate_applied: 0,
    tax_amount: 0,
    total_amount: 807500,
    cash_received: 407500,
    credit_given: 400000,
    payment_method: 'Bank Transfer',
    reference_number: 'HBL-TX-99881',
    reservation_ids: [activeRes.reservation_id],
  });

  assert(bulkSale.success === true, 'Bulk sale executed successfully');
  assert(bulkSale.sale_type === 'BULK', 'Sale type is BULK');
  assert(bulkSale.credit_given === 400000, 'Credit given is 400,000 PKR');
  assert(activeRes.status === 'CONFIRMED', 'Inventory reservation was confirmed on sale completion');

  const afterBulk = await posService.getCreditAvailability(shopId, customerId);
  assert(afterBulk.current_outstanding === 400000, 'Customer outstanding balance is now 400,000 PKR');
  assert(afterBulk.available_credit === 100000, 'Available credit reduced to 100,000 PKR');

  // --- 4. Scenario: Attempt Sale Exceeding Limit with Hard Block Enforced
  console.log('\n--- TEST 4: Credit Limit Hard Block Enforcement ---');
  await posService.updateShopSettings(shopId, { enforce_hard_blocks: true });
  const checkSettings = await posService.getShopSettings(shopId);
  assert(checkSettings.enforce_hard_blocks === true, 'Shop settings updated: enforce_hard_blocks = TRUE');

  let hardBlockCaught = false;
  try {
    // Attempt credit of 150,000 when only 100,000 available
    await posService.executeAdvancedSale({
      shop_id: shopId,
      staff_id: staffId,
      customer_id: customerId,
      sale_type: 'RUNNING',
      items: [{ product_id: 'prod-mouse-001', quantity: 15, unit_price: 10000 }],
      subtotal: 150000,
      tax_amount: 0,
      total_amount: 150000,
      cash_received: 0,
      credit_given: 150000,
    });
  } catch (err: any) {
    hardBlockCaught = true;
    assert(err.message.includes('CREDIT LIMIT REACHED'), 'Hard block error message returned properly');
  }
  assert(hardBlockCaught === true, 'Sale was strictly blocked by hard block configuration');

  // --- 5. Scenario: Admin Override with Reason when Hard Blocks Disabled
  console.log('\n--- TEST 5: Admin Override with Reason ---');
  await posService.updateShopSettings(shopId, { enforce_hard_blocks: false, require_override_reason: true });

  let missingReasonCaught = false;
  try {
    await posService.executeAdvancedSale({
      shop_id: shopId,
      staff_id: staffId,
      customer_id: customerId,
      sale_type: 'RUNNING',
      items: [{ product_id: 'prod-mouse-001', quantity: 15, unit_price: 10000 }],
      subtotal: 150000,
      tax_amount: 0,
      total_amount: 150000,
      cash_received: 0,
      credit_given: 150000,
    });
  } catch (err: any) {
    missingReasonCaught = true;
    assert(err.message.includes('Admin override reason is required'), 'Override blocked without reason');
  }
  assert(missingReasonCaught === true, 'Override required justification');

  const overrideSale = await posService.executeAdvancedSale({
    shop_id: shopId,
    staff_id: staffId,
    customer_id: customerId,
    sale_type: 'RUNNING',
    items: [{ product_id: 'prod-mouse-001', quantity: 15, unit_price: 10000 }],
    subtotal: 150000,
    tax_amount: 0,
    total_amount: 150000,
    cash_received: 0,
    credit_given: 150000,
    admin_override_reason: 'Valued VIP wholesale partner emergency stock order',
    admin_override_by: 'Super Admin',
  });

  assert(overrideSale.success === true, 'Sale succeeded with Admin Override');
  assert(overrideSale.is_override_applied === true, 'is_override_applied is true');

  // --- 6. Scenario: Customer Return with Stock Increase & Credit Adjustment
  console.log('\n--- TEST 6: Sales Return & Inventory Restoration ---');
  const returnRes = await posService.processReturn({
    shop_id: shopId,
    staff_id: staffId,
    customer_id: customerId,
    original_sale_id: overrideSale.order_id,
    items: [{ product_id: 'prod-mouse-001', quantity: 5, refund_unit_price: 10000 }],
    return_reason: 'Defective packaging returned by customer',
    refund_type: 'Credit_Adjustment',
  });

  assert(returnRes.success === true, 'Return processed successfully');
  assert(returnRes.refund_total === 50000, 'Refund total is 50,000 PKR');
  assert(returnRes.returned_items_count === 5, 'Returned 5 units to stock');

  // --- 7. Scenario: Physical Stock Reconciliation
  console.log('\n--- TEST 7: Physical Stock Reconciliation ---');
  const recRes = await posService.reconcileStock({
    shop_id: shopId,
    staff_id: staffId,
    product_id: 'prod-mouse-001',
    physical_count: 45,
    notes: 'Bi-weekly cycle count audit',
  });
  assert(recRes.physical_count === 45, 'Physical stock recorded as 45 units');
  assert(recRes.reconciliation_id.startsWith('rec-'), 'Reconciliation audit ID generated');

  // --- 8. Scenario: Customer Payment Recording & Running Balance
  console.log('\n--- TEST 8: Payment Recording & Balance Update ---');
  const payRecord = await posService.recordDetailedPayment({
    shop_id: shopId,
    customer_id: customerId,
    amount_paid: 200000,
    payment_method: 'Check',
    check_number: 'CHK-90921',
    received_by_user_id: staffId,
    notes: 'Mid-month settlement check',
  });
  assert(payRecord.payment_id.startsWith('pay-'), 'Detailed payment record stored');
  assert(payRecord.payment_method === 'Check', 'Payment method is Check');

  // --- 9. Scenario: Customer Statement Generation with Aging Breakdown
  console.log('\n--- TEST 9: Statement Generation with Aging Breakdown ---');
  const period = new Date().toISOString().slice(0, 7);
  const statement = await posService.generateCustomerStatement(shopId, customerId, period);
  assert(statement.customer_id === customerId, 'Statement generated for correct customer');
  assert(statement.statement_period === period, 'Statement period matches current month');
  assert(statement.pdf_generated === true, 'Statement PDF generated');
  assert(statement.transactions.length >= 2, 'Statement contains all chronological transactions');
  assert(statement.aging_summary.current !== undefined, 'Aging breakdown calculated');

  // --- 10. Scenario: Automated Statement Dispatch Simulation
  console.log('\n--- TEST 10: Automated Statement Dispatch ---');
  const sendRes = await posService.sendCustomerStatement(shopId, statement.statement_id);
  assert(sendRes.success === true, 'Statement dispatch triggered successfully');
  assert(sendRes.email_sent === true, 'Statement email sent flag marked true');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} ADVANCED POS TEST ASSERTIONS PASSED!`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
