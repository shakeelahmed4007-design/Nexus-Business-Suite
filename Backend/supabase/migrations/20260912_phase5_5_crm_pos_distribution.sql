-- Phase 5.5: CRM-POS Integration & Advanced Distribution System Migration

-- 1. Enhance Customers Table for POS-CRM & Renewals
ALTER TABLE IF EXISTS public.customers
  ADD COLUMN IF NOT EXISTS service_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS service_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '12 months'),
  ADD COLUMN IF NOT EXISTS service_duration_months INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_order_value NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_high_value BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS customer_source VARCHAR(50) DEFAULT 'POS',
  ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(12,2) DEFAULT 0;

-- 2. Create POS Customer Purchases Table
CREATE TABLE IF NOT EXISTS public.pos_customer_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_phone VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_address TEXT,
  order_amount NUMERIC(12,2) NOT NULL,
  items_summary TEXT,
  channel VARCHAR(50) DEFAULT 'POS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Number Assignment History Table
CREATE TABLE IF NOT EXISTS public.number_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL,
  calling_data_id UUID,
  phone_number VARCHAR(50) NOT NULL,
  previous_agent_id VARCHAR(255),
  new_agent_id VARCHAR(255),
  reassigned_by VARCHAR(255),
  reason TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add Columns to calling_data_inventory for Expiration and Reassignment
ALTER TABLE IF EXISTS public.calling_data_inventory
  ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reassign_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reassigned_at TIMESTAMP WITH TIME ZONE;

-- 5. Add Columns to leads for External Assignment & Performance Tracking
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS unresolved_status VARCHAR(50) DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS assignment_source VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reassigned_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_end_date TIMESTAMP WITH TIME ZONE;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_customers_shop_phone ON public.customers(shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_pos_purchases_shop_phone ON public.pos_customer_purchases(shop_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_assignment_history_shop ON public.number_assignment_history(shop_id);
