-- Phase 2: CRM Basics Backend Migration Script
-- Schema for Leads, Customers, Tasks, CallingData, CallHistory, and ActivityLogs

-- 1. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  lead_source VARCHAR(50) CHECK (lead_source IN ('Website', 'Cold Call', 'Referral', 'Social Media', 'Manual Entry')),
  lead_status VARCHAR(50) CHECK (lead_status IN ('New', 'Contacted', 'Qualified', 'Negotiating', 'Lost', 'Won')),
  lead_value DECIMAL(15,2),
  priority VARCHAR(20) CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_lead_email_per_user UNIQUE(shop_id, created_by_id, email),
  CONSTRAINT unique_lead_phone_per_user UNIQUE(shop_id, created_by_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_leads_shop_status ON public.leads(shop_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user ON public.leads(assigned_to_user_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_date ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads(created_by_id);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  customer_type VARCHAR(50) CHECK (customer_type IN ('Individual', 'Business', 'Corporate')),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  total_order_value DECIMAL(15,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  customer_status VARCHAR(50) CHECK (customer_status IN ('Active', 'Inactive', 'VIP', 'At Risk')) DEFAULT 'Active',
  credit_limit DECIMAL(15,2),
  payment_terms VARCHAR(50) CHECK (payment_terms IN ('Cash', 'Credit', 'Installment')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_customer_email_per_user UNIQUE(shop_id, created_by_id, email),
  CONSTRAINT unique_customer_phone_per_user UNIQUE(shop_id, created_by_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_status ON public.customers(shop_id, customer_status);
CREATE INDEX IF NOT EXISTS idx_customers_created_date ON public.customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by_id);

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) CHECK (task_type IN ('Follow-up', 'Call', 'Meeting', 'Email', 'Reminder', 'Other')),
  linked_entity VARCHAR(50) CHECK (linked_entity IN ('lead', 'customer')),
  linked_entity_value UUID,
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority VARCHAR(20) CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status VARCHAR(50) CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Overdue', 'Cancelled')) DEFAULT 'Not Started',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_date TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  remind_before_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON public.tasks(assigned_to_user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_shop_status ON public.tasks(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity ON public.tasks(linked_entity, linked_entity_value);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by_id);

-- 4. CALLING DATA TABLE
CREATE TABLE IF NOT EXISTS public.calling_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  source VARCHAR(100) CHECK (source IN ('Manual Entry', 'Purchased List', 'CSV Import')),
  data_type VARCHAR(50) CHECK (data_type IN ('Raw Data', 'Support Numbers')),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) CHECK (status IN ('Available', 'Assigned', 'Used', 'Expired', 'Invalid')) DEFAULT 'Available',
  usage_count INTEGER DEFAULT 0,
  last_used_date TIMESTAMP WITH TIME ZONE,
  linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  linked_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_calling_phone_per_user UNIQUE(shop_id, created_by_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_calling_data_status ON public.calling_data(created_by_id, status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_calling_data_assigned ON public.calling_data(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_calling_data_phone ON public.calling_data(phone_number);

-- 5. CALL HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calling_data_id UUID NOT NULL REFERENCES public.calling_data(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_duration_seconds INTEGER DEFAULT 0,
  call_status VARCHAR(50) CHECK (call_status IN ('Connected', 'No Response', 'Busy', 'Invalid', 'Interested', 'Not Interested')),
  call_notes TEXT,
  linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  call_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_calling_data ON public.call_history(calling_data_id);
CREATE INDEX IF NOT EXISTS idx_call_history_agent ON public.call_history(agent_user_id);

-- 6. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) CHECK (module IN ('Leads', 'Customers', 'Tasks', 'CallingData')),
  entity_id UUID,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_shop ON public.activity_logs(shop_id, timestamp);

-- RLS POLICIES FOR NEW CRM TABLES
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
