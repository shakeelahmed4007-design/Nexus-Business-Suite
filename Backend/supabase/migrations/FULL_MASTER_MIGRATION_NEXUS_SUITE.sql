-- ============================================================================
-- NEXUS BUSINESS SUITE - ALL-IN-ONE MASTER SUPABASE DATABASE MIGRATION
-- Multi-Tenant System: Phase 1 (Auth/RBAC) + Phase 2 (CRM) + Phase 3 (Inventory/POS/Finance)
-- Copy and run this ENTIRE script in your Supabase SQL Editor!
-- ============================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. CREATE / UPGRADE SHOPS (TENANTS) TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'suspended')),
    module_access JSONB DEFAULT '[]'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. CREATE / UPGRADE PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    has_data_access BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}'::jsonb,
    password TEXT,
    created_by_role TEXT,
    created_by_email TEXT,
    created_by_id TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely ensure columns exist if profiles table already existed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_data_access BOOLEAN DEFAULT true;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by_role TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by_email TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by_id TEXT;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. PHASE 2 CRM TABLES (CUSTOMERS, LEADS, CALLING_DATA, TASKS, ACTIVITY_LOGS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    customer_id VARCHAR(100),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    customer_type VARCHAR(50) DEFAULT 'Individual',
    customer_status VARCHAR(50) DEFAULT 'Active',
    company_name VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    address TEXT,
    total_order_value NUMERIC(12,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    last_order_date TIMESTAMPTZ,
    credit_limit NUMERIC(12,2) DEFAULT 0.00,
    payment_terms VARCHAR(100) DEFAULT 'Cash',
    assigned_to_user_id VARCHAR(255),
    owner_admin_email VARCHAR(255),
    created_by_id VARCHAR(255),
    created_by VARCHAR(255),
    created_by_email VARCHAR(255),
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop old strict constraints if any exist
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_status_check;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.customers ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_order_value NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT 'Cash';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    lead_id VARCHAR(100),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    customer_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    company_name VARCHAR(255),
    lead_source VARCHAR(100) DEFAULT 'Manual Entry',
    source VARCHAR(100) DEFAULT 'Manual Entry',
    lead_status VARCHAR(50) DEFAULT 'New',
    status VARCHAR(50) DEFAULT 'New',
    lead_value NUMERIC(12,2) DEFAULT 0.00,
    priority VARCHAR(50) DEFAULT 'Medium',
    assigned_to_user_id VARCHAR(255),
    owner_admin_email VARCHAR(255),
    created_by_id VARCHAR(255),
    created_by VARCHAR(255),
    created_by_email VARCHAR(255),
    notes TEXT,
    last_contact_date TIMESTAMPTZ,
    next_follow_up_date TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE public.leads ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100) DEFAULT 'Manual Entry';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_status VARCHAR(50) DEFAULT 'New';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_value NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(255);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.calling_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    contact_name VARCHAR(255),
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    campaign_name VARCHAR(100) DEFAULT 'General Campaign',
    source VARCHAR(100) DEFAULT 'Manual Entry',
    data_type VARCHAR(100) DEFAULT 'Raw Data',
    status VARCHAR(50) DEFAULT 'Available',
    call_status VARCHAR(50) DEFAULT 'Pending',
    call_duration INT DEFAULT 0,
    usage_count INT DEFAULT 0,
    assigned_to_user_id VARCHAR(255),
    assigned_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    last_used_date TIMESTAMPTZ,
    linked_lead_id VARCHAR(255),
    linked_customer_id VARCHAR(255),
    owner_admin_email VARCHAR(255),
    created_by_id VARCHAR(255),
    created_by_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE public.calling_data ALTER COLUMN contact_name DROP NOT NULL;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'Manual Entry';
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS data_type VARCHAR(100) DEFAULT 'Raw Data';
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Available';
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS assigned_date TIMESTAMPTZ;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS last_used_date TIMESTAMPTZ;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS linked_lead_id VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS linked_customer_id VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) DEFAULT 'Follow-up',
    task_status VARCHAR(50) DEFAULT 'Not Started',
    status VARCHAR(50) DEFAULT 'Not Started',
    priority VARCHAR(20) DEFAULT 'Medium',
    due_date TIMESTAMPTZ,
    completion_date TIMESTAMPTZ,
    completion_notes TEXT,
    remind_before_minutes INT DEFAULT 15,
    linked_entity VARCHAR(50),
    linked_entity_value VARCHAR(255),
    linked_lead_id VARCHAR(255),
    linked_customer_id VARCHAR(255),
    assigned_to_user_id VARCHAR(255),
    owner_admin_email VARCHAR(255),
    created_by_id VARCHAR(255),
    created_by_email VARCHAR(255),
    related_to_type VARCHAR(50),
    related_to_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(100) DEFAULT 'Follow-up';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_status VARCHAR(50) DEFAULT 'Not Started';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS linked_entity VARCHAR(50);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS linked_entity_value VARCHAR(255);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS linked_lead_id VARCHAR(255);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS linked_customer_id VARCHAR(255);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS remind_before_minutes INT DEFAULT 15;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(255);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. PHASE 3 INVENTORY, POS & FINANCE TABLES
-- ----------------------------------------------------------------------------

-- A. VENDORS TABLE
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

-- B. PRODUCTS TABLE
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

-- C. STOCKS TABLE
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

-- D. ORDERS TABLE
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

-- E. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_percentage NUMERIC(5, 2) DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL
);

-- F. INVOICES TABLE
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

-- G. PAYMENTS TABLE
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

-- H. STOCK MOVEMENTS TABLE (Audit Trail)
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

-- I. VENDOR PAYMENTS TABLE
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

-- J. POS SESSIONS TABLE
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
-- 6. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_shop ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_leads_shop ON public.leads(shop_id);
CREATE INDEX IF NOT EXISTS idx_calling_data_shop ON public.calling_data(shop_id);
CREATE INDEX IF NOT EXISTS idx_tasks_shop ON public.tasks(shop_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_shop ON public.activity_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendors_shop_id ON public.vendors(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_stocks_shop_product ON public.stocks(shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.orders(shop_id, order_status);
CREATE INDEX IF NOT EXISTS idx_invoices_shop_status ON public.invoices(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- ----------------------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY (RLS) & SERVICE ROLE POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
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

-- Allow full access to Service Role / Admin Service
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name FROM information_schema.tables WHERE table_schema='public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Service role full access %I" ON public.%I FOR ALL USING (true)', tbl, tbl);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 8. AUTOMATIC AUTH USER PROFILE CREATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, password, created_by_role, created_by_email)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'staff'),
    COALESCE(new.raw_user_meta_data->>'password', '123456'),
    COALESCE(new.raw_user_meta_data->>'created_by_role', 'SUPER_ADMIN'),
    COALESCE(new.raw_user_meta_data->>'created_by_email', 'admin@nexus.com')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MIGRATION COMPLETE: All Phase 1, Phase 2, and Phase 3 Tables Sync Ready!
-- ============================================================================
