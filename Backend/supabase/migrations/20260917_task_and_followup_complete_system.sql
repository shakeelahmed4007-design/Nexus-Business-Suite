-- ==============================================================================
-- NEXUS BUSINESS SUITE - TASK & FOLLOW-UP MODULE MASTER MIGRATION
-- Multi-tenant isolation, multi-staff assignments, comment threads,
-- status lifecycle timeline, templates, customer/lead links, and notifications.
-- ==============================================================================

-- 1. Ensure tasks table has all required columns
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    created_by_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) NOT NULL DEFAULT 'Customer Follow-up',
    related_customer_id UUID,
    related_lead_id UUID,
    linked_entity VARCHAR(50),
    linked_entity_value VARCHAR(255),
    assigned_to_user_id UUID,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    due_date TIMESTAMPTZ,
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    completion_date TIMESTAMPTZ,
    completion_notes TEXT,
    hold_reason TEXT,
    cancellation_reason TEXT,
    remind_before_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Add missing columns safely if table already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='related_customer_id') THEN
        ALTER TABLE public.tasks ADD COLUMN related_customer_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='related_lead_id') THEN
        ALTER TABLE public.tasks ADD COLUMN related_lead_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='status_changed_at') THEN
        ALTER TABLE public.tasks ADD COLUMN status_changed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='hold_reason') THEN
        ALTER TABLE public.tasks ADD COLUMN hold_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='cancellation_reason') THEN
        ALTER TABLE public.tasks ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

-- 2. Task Assignments table (Supports multiple staff assignments per task)
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL,
    assigned_by_user_id UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Task Comments table (Staff & Admin collaboration)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    commented_by_user_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Task Status History table (Complete audit lifecycle timeline)
CREATE TABLE IF NOT EXISTS public.task_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id UUID NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

-- 5. Task Templates table (Reusable workflows)
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) NOT NULL DEFAULT 'Customer Follow-up',
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
    default_assigned_user_ids JSONB DEFAULT '[]'::jsonb,
    created_by_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Task Notifications table (In-app alerts for assignments, due dates, comments)
CREATE TABLE IF NOT EXISTS public.task_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    user_id UUID NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- 'assignment', 'unassigned', 'comment', 'status_change', 'due_tomorrow', 'due_today', 'overdue'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Indexes for High Performance and Multi-Tenant Isolation
CREATE INDEX IF NOT EXISTS idx_tasks_shop_id ON public.tasks(shop_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_customer ON public.tasks(related_customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON public.tasks(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks(deleted_at);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_active ON public.task_assignments(task_id, assigned_to_user_id) WHERE unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_history_task_id ON public.task_status_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_user ON public.task_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_task_templates_shop ON public.task_templates(shop_id);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
