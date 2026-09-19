-- Migration: 20260920_pos_advanced_credit_integration.sql
-- Description: Advanced POS System with Credit Limit Validation, Bulk vs Running Sales,
-- Real-Time Inventory Reservation & Synchronization, Multi-Method Payments, and Customer Statements.

-- 1. POS Shop Settings
CREATE TABLE IF NOT EXISTS public.pos_shop_settings (
    shop_id VARCHAR(100) PRIMARY KEY,
    enforce_hard_blocks BOOLEAN DEFAULT FALSE,
    require_override_reason BOOLEAN DEFAULT TRUE,
    default_bulk_discount_percent NUMERIC(5, 2) DEFAULT 5.00,
    bulk_tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    retail_tax_rate NUMERIC(5, 2) DEFAULT 18.00,
    statement_frequency VARCHAR(20) DEFAULT 'monthly',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inventory Reservations
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    quantity_reserved INTEGER NOT NULL CHECK (quantity_reserved > 0),
    reserved_by_user_id VARCHAR(100) NOT NULL,
    sale_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_shop 
    ON public.inventory_reservations (shop_id, product_id, status);

-- 3. Detailed Payment Records
CREATE TABLE IF NOT EXISTS public.payment_records (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Check', 'Bank Transfer', 'Card', 'Mobile Wallet', 'Advance')),
    reference_number VARCHAR(100),
    check_number VARCHAR(100),
    card_last4 VARCHAR(4),
    received_by_user_id VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_customer 
    ON public.payment_records (shop_id, customer_id, payment_date DESC);

-- 4. Customer Statements
CREATE TABLE IF NOT EXISTS public.customer_statements (
    statement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    statement_period VARCHAR(20) NOT NULL, -- e.g. "2026-09"
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_payments NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    aging_summary JSONB DEFAULT '{}'::jsonb,
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_statements_customer 
    ON public.customer_statements (shop_id, customer_id, statement_period);

-- 5. Physical Stock Reconciliations
CREATE TABLE IF NOT EXISTS public.stock_reconciliations (
    reconciliation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    system_count INTEGER NOT NULL,
    physical_count INTEGER NOT NULL,
    variance INTEGER NOT NULL, -- physical_count - system_count
    conducted_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enhance orders / sales table if exists with POS advanced fields
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'RUNNING';
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_received_today NUMERIC(12, 2) DEFAULT 0.00;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS credit_given NUMERIC(12, 2) DEFAULT 0.00;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bulk_discount_applied NUMERIC(12, 2) DEFAULT 0.00;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_rate_used NUMERIC(5, 2) DEFAULT 18.00;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_override_by VARCHAR(100);
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_override_reason TEXT;
    END IF;
END $$;
