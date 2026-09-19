-- Migration 2: Create call_logs table
-- Description: Record every call made on allocated numbers

CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  calling_data_inventory_id UUID NOT NULL REFERENCES public.calling_data_inventory(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  call_duration_seconds INTEGER DEFAULT 0,
  call_status VARCHAR(50) NOT NULL CHECK (
    call_status IN ('Connected', 'No Response', 'Busy', 'Invalid', 'Interested', 'Not Interested', 'Callback Later', 'Sale', 'Renewal Needed')
  ),
  call_notes TEXT,
  call_recording_url TEXT,
  call_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  linked_lead_id UUID, -- Foreign key to leads_from_call added in V2.16
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast query execution
CREATE INDEX IF NOT EXISTS idx_call_logs_inventory_time ON public.call_logs (calling_data_inventory_id, call_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_time ON public.call_logs (agent_user_id, call_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs (call_status);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON public.call_logs (linked_lead_id);

-- RLS Enable
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
