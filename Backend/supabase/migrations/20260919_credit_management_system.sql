-- ============================================================================
-- Migration: 20260919_credit_management_system.sql
-- Description: Credit Management System for Nexus Business Suite
-- Tables:
--   - customers (update credit_limit)
--   - vendors (update credit_limit)
--   - customer_credit_ledger
--   - credit_sales
--   - customer_payments
--   - credit_purchases
--   - vendor_credit_ledger
--   - vendor_credit_payments
-- ============================================================================

-- 1. Ensure credit_limit on customers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'customers' 
          AND column_name = 'credit_limit'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN credit_limit NUMERIC(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- 2. Ensure credit_limit on vendors table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'vendors' 
          AND column_name = 'credit_limit'
    ) THEN
        ALTER TABLE public.vendors ADD COLUMN credit_limit NUMERIC(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- 3. Customer Credit Ledger Table
-- Tracks complete credit history: sales, payments, adjustments with running balance
CREATE TABLE IF NOT EXISTS public.customer_credit_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('CREDIT_SALE', 'PAYMENT', 'ADJUSTMENT')),
    amount NUMERIC(12, 2) NOT NULL,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    outstanding_balance_after NUMERIC(12, 2) NOT NULL,
    referenced_transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cust_credit_ledger_shop_cust 
    ON public.customer_credit_ledger (shop_id, customer_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_cust_credit_ledger_ref_tx 
    ON public.customer_credit_ledger (shop_id, referenced_transaction_id);

-- 4. Credit Sales Table
-- Records every credit sale separately with items, cash down payment, and credit given
CREATE TABLE IF NOT EXISTS public.credit_sales (
    sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    sale_amount NUMERIC(12, 2) NOT NULL,
    payment_received_today NUMERIC(12, 2) DEFAULT 0.00,
    credit_given NUMERIC(12, 2) NOT NULL,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    items_sold_json JSONB DEFAULT '[]'::jsonb,
    staff_member_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_sales_shop_cust 
    ON public.credit_sales (shop_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_credit_sales_shop_date 
    ON public.credit_sales (shop_id, transaction_date DESC);

-- 5. Customer Payments Table
-- Records every payment a customer makes toward their credit balance
CREATE TABLE IF NOT EXISTS public.customer_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method VARCHAR(50) DEFAULT 'Cash',
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    recorded_by_user_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cust_payments_shop_cust 
    ON public.customer_payments (shop_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_cust_payments_shop_date 
    ON public.customer_payments (shop_id, payment_date DESC);

-- 6. Credit Purchases Table
-- Records vendor purchases on credit
CREATE TABLE IF NOT EXISTS public.credit_purchases (
    purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    vendor_id UUID NOT NULL,
    purchase_amount NUMERIC(12, 2) NOT NULL,
    payment_paid_today NUMERIC(12, 2) DEFAULT 0.00,
    credit_taken NUMERIC(12, 2) NOT NULL,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    items_purchased_json JSONB DEFAULT '[]'::jsonb,
    recorded_by_user_id VARCHAR(255),
    override_applied BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_shop_vendor 
    ON public.credit_purchases (shop_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_shop_date 
    ON public.credit_purchases (shop_id, transaction_date DESC);

-- 7. Vendor Credit Ledger Table
-- Tracks vendor credit history: credit purchases, payments, adjustments with running balance
CREATE TABLE IF NOT EXISTS public.vendor_credit_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    vendor_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('CREDIT_PURCHASE', 'PAYMENT', 'ADJUSTMENT')),
    amount NUMERIC(12, 2) NOT NULL,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    outstanding_balance_after NUMERIC(12, 2) NOT NULL,
    referenced_transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_credit_ledger_shop_vendor 
    ON public.vendor_credit_ledger (shop_id, vendor_id, transaction_date DESC);

-- 8. Vendor Credit Payments Table
-- Records payments made to vendors toward outstanding credit
CREATE TABLE IF NOT EXISTS public.vendor_credit_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    vendor_id UUID NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method VARCHAR(50) DEFAULT 'Cash',
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    recorded_by_user_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_credit_payments_shop_vendor 
    ON public.vendor_credit_payments (shop_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_credit_payments_shop_date 
    ON public.vendor_credit_payments (shop_id, payment_date DESC);
