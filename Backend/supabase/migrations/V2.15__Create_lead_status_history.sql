-- Migration 6: Create lead_status_history table
-- Description: Track lead status transitions and audit trail

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads_from_call(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for history lookup
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON public.lead_status_history (lead_id, changed_at DESC);

-- Trigger: Log lead status changes to lead_status_history
CREATE OR REPLACE FUNCTION public.fn_log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.lead_status_history (lead_id, old_status, new_status, changed_by_user_id, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.agent_user_id, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_lead_status_change ON public.leads_from_call;
CREATE TRIGGER trg_log_lead_status_change
  AFTER UPDATE ON public.leads_from_call
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_lead_status_change();

-- RLS Enable
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
