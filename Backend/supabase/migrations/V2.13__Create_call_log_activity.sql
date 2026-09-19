-- Migration 4: Create call_log_activity table
-- Description: Audit trail for all calling data operations

CREATE TABLE IF NOT EXISTS public.call_log_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) DEFAULT 'CallingData',
  entity_id UUID,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for auditing
CREATE INDEX IF NOT EXISTS idx_activity_user_timestamp ON public.call_log_activity (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_shop_timestamp ON public.call_log_activity (shop_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON public.call_log_activity (action);

-- RLS Enable
ALTER TABLE public.call_log_activity ENABLE ROW LEVEL SECURITY;
