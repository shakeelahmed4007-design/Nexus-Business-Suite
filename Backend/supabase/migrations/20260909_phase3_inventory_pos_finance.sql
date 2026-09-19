-- ============================================================================
-- Phase 3 Database Migration: Inventory + POS + Finance System
-- Multi-Tenant Architecture with Shop-Level Scoping
-- ============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- PRE-CHECK: SAFELY MIGRATE PRE-EXISTING TABLES IF COLUMN NAMES DIFFER
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- 1. Ensure invoices table has invoice_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_id') THEN
            ALTER TABLE public.invoices ADD COLUMN invoice_id UUID DEFAULT gen_random_uuid();
            UPDATE public.invoices SET invoice_id = gen_random_uuid() WHERE invoice_id IS NULL;
            ALTER TABLE public.invoices ADD CONSTRAINT invoices_invoice_id_unique UNIQUE (invoice_id);
        END IF;
    END IF;

    -- 2. Ensure orders table has order_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_id') THEN
            ALTER TABLE public.orders ADD COLUMN order_id UUID DEFAULT gen_random_uuid();
            UPDATE public.orders SET order_id = gen_random_uuid() WHERE order_id IS NULL;
            ALTER TABLE public.orders ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);
        END IF;
    END IF;

    -- 3. Ensure products table has product_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'product_id') THEN
            ALTER TABLE public.products ADD COLUMN product_id UUID DEFAULT gen_random_uuid();
            UPDATE public.products SET product_id = gen_random_uuid() WHERE product_id IS NULL;
            ALTER TABLE public.products ADD CONSTRAINT products_product_id_unique UNIQUE (product_id);
        END IF;
    END IF;

    -- 4. Ensure vendors table has vendor_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'vendor_id') THEN
            ALTER TABLE public.vendors ADD COLUMN vendor_id UUID DEFAULT gen_random_uuid();
            UPDATE public.vendors SET vendor_id = gen_random_uuid() WHERE vendor_id IS NULL;
            ALTER TABLE public.vendors ADD CONSTRAINT vendors_vendor_id_unique UNIQUE (vendor_id);
        END IF;
    END IF;

    -- 5. Ensure profiles table supports sales role and stores permissions & creator metadata
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_data_access BOOLEAN DEFAULT true;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by_role TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by_email TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by_id TEXT;
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 1. VENDORS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
    vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    bank_details JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Blocked')),
    approval_status VARCHAR(50) DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_percentage NUMERIC(5, 2) DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Discontinued')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_sku_per_shop UNIQUE (shop_id, sku)
);

-- ----------------------------------------------------------------------------
-- 3. STOCKS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    shop_id VARCHAR(100) NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    low_stock_threshold INT DEFAULT 5 CHECK (low_stock_threshold >= 0),
    warehouse_location VARCHAR(100) DEFAULT 'Main Warehouse',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_stock_per_shop UNIQUE (shop_id, product_id)
);

-- ----------------------------------------------------------------------------
-- 4. ORDERS TABLE (Sales / Purchase Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(255),
    order_type VARCHAR(50) DEFAULT 'Sale' CHECK (order_type IN ('Sale', 'Purchase', 'POS')),
    order_date TIMESTAMPTZ DEFAULT NOW(),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'Fixed' CHECK (discount_type IN ('Fixed', 'Percentage')),
    order_status VARCHAR(50) DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled')),
    payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Refunded')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. ORDER ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_percentage NUMERIC(5, 2) DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. INVOICES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    shop_id VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    issue_date TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
    customer_id VARCHAR(255),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Paid', 'Overdue', 'Cancelled')),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_invoice_number_per_shop UNIQUE (shop_id, invoice_number)
);

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS TABLE (Incoming & Outgoing Payments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID,
    shop_id VARCHAR(100) NOT NULL,
    payment_type VARCHAR(50) DEFAULT 'Incoming' CHECK (payment_type IN ('Incoming', 'Outgoing')),
    payment_method VARCHAR(50) DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Card', 'Bank Transfer', 'Online', 'Cheque')),
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    reference_number VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'Paid' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. STOCK MOVEMENTS TABLE (Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    shop_id VARCHAR(100) NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('Sale', 'Purchase', 'Adjustment', 'Return', 'Transfer', 'Damage', 'Reservation', 'Release')),
    quantity_changed INT NOT NULL,
    reason TEXT NOT NULL,
    created_by VARCHAR(255) DEFAULT 'System',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. VENDOR PAYMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_payments (
    vendor_payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,
    shop_id VARCHAR(100) NOT NULL,
    amount_payable NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Paid', 'Overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. POS SESSIONS TABLE (Daily Till Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL,
    staff_id VARCHAR(255) NOT NULL,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_balance NUMERIC(12, 2) DEFAULT 0.00,
    total_sales NUMERIC(12, 2) DEFAULT 0.00,
    expenses NUMERIC(12, 2) DEFAULT 0.00,
    session_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vendors_shop_id ON public.vendors(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_stocks_shop_product ON public.stocks(shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.orders(shop_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_shop_status ON public.invoices(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON public.vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_shop_staff ON public.pos_sessions(shop_id, staff_id, status);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access vendors" ON public.vendors;
DROP POLICY IF EXISTS "Service role full access products" ON public.products;
DROP POLICY IF EXISTS "Service role full access stocks" ON public.stocks;
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Service role full access invoices" ON public.invoices;
DROP POLICY IF EXISTS "Service role full access payments" ON public.payments;
DROP POLICY IF EXISTS "Service role full access stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Service role full access vendor_payments" ON public.vendor_payments;
DROP POLICY IF EXISTS "Service role full access pos_sessions" ON public.pos_sessions;

CREATE POLICY "Service role full access vendors" ON public.vendors FOR ALL USING (true);
CREATE POLICY "Service role full access products" ON public.products FOR ALL USING (true);
CREATE POLICY "Service role full access stocks" ON public.stocks FOR ALL USING (true);
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Service role full access order_items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Service role full access invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Service role full access payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Service role full access stock_movements" ON public.stock_movements FOR ALL USING (true);
CREATE POLICY "Service role full access vendor_payments" ON public.vendor_payments FOR ALL USING (true);
CREATE POLICY "Service role full access pos_sessions" ON public.pos_sessions FOR ALL USING (true);
