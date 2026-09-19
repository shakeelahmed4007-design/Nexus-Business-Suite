-- Migration 5: Create calling_data_allocations table
-- Description: Track batch allocations of calling numbers to sales agents

CREATE TABLE IF NOT EXISTS public.calling_data_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calling_data_inventory_id UUID NOT NULL REFERENCES public.calling_data_inventory(id) ON DELETE CASCADE,
  allocated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) CHECK (status IN ('Active', 'Expired', 'Returned')) DEFAULT 'Active',
  usage_count INTEGER DEFAULT 0,
  last_used_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_inventory_allocation UNIQUE (calling_data_inventory_id)
);

-- Indexes for allocation management
CREATE INDEX IF NOT EXISTS idx_allocations_agent_status ON public.calling_data_allocations (agent_user_id, status);
CREATE INDEX IF NOT EXISTS idx_allocations_expiry ON public.calling_data_allocations (expiry_date, status);
CREATE INDEX IF NOT EXISTS idx_allocations_admin ON public.calling_data_allocations (admin_user_id, allocated_date DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.fn_update_allocations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allocations_updated_at ON public.calling_data_allocations;
CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON public.calling_data_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_allocations_timestamp();

-- RLS Enable
ALTER TABLE public.calling_data_allocations ENABLE ROW LEVEL SECURITY;
