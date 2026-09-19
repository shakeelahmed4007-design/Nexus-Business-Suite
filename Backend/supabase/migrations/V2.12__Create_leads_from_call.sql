-- Migration 3: Create leads_from_call table
-- Description: Leads created automatically when calls are logged

CREATE TABLE IF NOT EXISTS public.leads_from_call (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  call_log_id UUID NOT NULL REFERENCES public.call_logs(id) ON DELETE CASCADE,
  calling_data_inventory_id UUID NOT NULL REFERENCES public.calling_data_inventory(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  status VARCHAR(50) NOT NULL CHECK (status IN ('New', 'Trial', 'Sales', 'Denied', 'Pending', 'Renewal')) DEFAULT 'New',
  source VARCHAR(50) CHECK (source IN ('Calling', 'Website', 'Facebook', 'Instagram', 'WhatsApp', 'Manual')) DEFAULT 'Calling',
  created_from_call BOOLEAN DEFAULT true,
  priority VARCHAR(20) CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
  notes TEXT,

  -- Trial Specific Fields
  trial_period VARCHAR(50),
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,

  -- Sales Specific Fields
  sale_amount DECIMAL(15,2),
  sale_date TIMESTAMP WITH TIME ZONE,
  renewal_date TIMESTAMP WITH TIME ZONE,

  -- Denial Specific Fields
  denial_reason VARCHAR(255),
  denial_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT unique_lead_per_call_log UNIQUE (call_log_id),
  CONSTRAINT unique_lead_phone_per_agent UNIQUE (shop_id, agent_user_id, phone_number)
);

-- Indexes for status pages & filtering
CREATE INDEX IF NOT EXISTS idx_leads_from_call_shop_status ON public.leads_from_call (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_agent_status ON public.leads_from_call (agent_user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_status ON public.leads_from_call (status);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_created_desc ON public.leads_from_call (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_trial_end ON public.leads_from_call (trial_end_date);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_renewal ON public.leads_from_call (renewal_date);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.fn_update_leads_from_call_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_from_call_updated_at ON public.leads_from_call;
CREATE TRIGGER trg_leads_from_call_updated_at
  BEFORE UPDATE ON public.leads_from_call
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_leads_from_call_timestamp();

-- Trigger: Update calling_data_inventory status to 'Used' when lead created
CREATE OR REPLACE FUNCTION public.fn_update_inventory_status_on_lead()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.calling_data_inventory
  SET status = 'Used', updated_at = NOW()
  WHERE id = NEW.calling_data_inventory_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_inventory_status_on_lead_create ON public.leads_from_call;
CREATE TRIGGER trg_update_inventory_status_on_lead_create
  AFTER INSERT ON public.leads_from_call
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_inventory_status_on_lead();

-- RLS Enable
ALTER TABLE public.leads_from_call ENABLE ROW LEVEL SECURITY;
