-- ============================================================
-- CRM Direct Supabase Migration Script
-- Run this in Supabase SQL Editor to support direct CRM operations
-- ============================================================

-- 1. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  lead_source VARCHAR(100),
  lead_status VARCHAR(100) DEFAULT 'New',
  lead_value DECIMAL(15,2) DEFAULT 0,
  priority VARCHAR(50) DEFAULT 'Medium',
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Drop any restricting constraints on leads table if existing
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_lead_source_check;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_lead_status_check;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_priority_check;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS unique_lead_email_per_user;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS unique_lead_phone_per_user;
ALTER TABLE public.leads ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN created_by_id DROP NOT NULL;

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  customer_type VARCHAR(100) DEFAULT 'Regular',
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  total_order_value DECIMAL(15,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  customer_status VARCHAR(100) DEFAULT 'Active',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  payment_terms VARCHAR(100) DEFAULT 'Cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Drop restricting constraints on customers table
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_status_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_payment_terms_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS unique_customer_email_per_user;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS unique_customer_phone_per_user;
ALTER TABLE public.customers ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN created_by_id DROP NOT NULL;

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(100) DEFAULT 'Follow-up',
  linked_entity VARCHAR(50),
  linked_entity_value UUID,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority VARCHAR(50) DEFAULT 'Medium',
  status VARCHAR(100) DEFAULT 'Not Started',
  due_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_date TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  remind_before_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN assigned_to_user_id DROP NOT NULL;

-- 4. CALLING DATA TABLE
CREATE TABLE IF NOT EXISTS public.calling_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL,
  contact_name VARCHAR(255),
  source VARCHAR(100) DEFAULT 'Manual Entry',
  data_type VARCHAR(50) DEFAULT 'Raw Data',
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(100) DEFAULT 'Available',
  usage_count INTEGER DEFAULT 0,
  last_used_date TIMESTAMP WITH TIME ZONE,
  linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  linked_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.calling_data DROP CONSTRAINT IF EXISTS calling_data_source_check;
ALTER TABLE public.calling_data DROP CONSTRAINT IF EXISTS calling_data_status_check;
ALTER TABLE public.calling_data DROP CONSTRAINT IF EXISTS unique_calling_phone_per_user;
ALTER TABLE public.calling_data ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE public.calling_data ALTER COLUMN created_by_id DROP NOT NULL;

-- 5. CALL HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calling_data_id UUID REFERENCES public.calling_data(id) ON DELETE CASCADE,
  agent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  call_duration_seconds INTEGER DEFAULT 0,
  call_status VARCHAR(100),
  call_notes TEXT,
  linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  call_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Create Open RLS Policies for Anon & Authenticated Roles
DROP POLICY IF EXISTS "leads_full_access" ON public.leads;
CREATE POLICY "leads_full_access" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_full_access" ON public.customers;
CREATE POLICY "customers_full_access" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_full_access" ON public.tasks;
CREATE POLICY "tasks_full_access" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "calling_data_full_access" ON public.calling_data;
CREATE POLICY "calling_data_full_access" ON public.calling_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "call_history_full_access" ON public.call_history;
CREATE POLICY "call_history_full_access" ON public.call_history FOR ALL USING (true) WITH CHECK (true);
