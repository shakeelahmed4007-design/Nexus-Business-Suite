-- Migration for Invoices Table in Supabase

-- 1. Create `invoices` table
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    customer TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Paid', 'Sent', 'Overdue', 'Draft')),
    items JSONB DEFAULT '[]'::jsonb,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Allow authenticated full access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow anon full access to invoices" ON public.invoices;

CREATE POLICY "Allow authenticated full access to invoices" ON public.invoices
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 4. Initial Demo Seed Data
INSERT INTO public.invoices (id, customer, date, due_date, amount, tax, total, status, items)
VALUES
  ('INV-2043', 'Hamza Sheikh', '2026-08-30', '2026-09-14', 15700, 2800, 18500, 'Paid', '[{"name":"Wireless Headphones","qty":2,"price":4500},{"name":"USB-C Cable 2m","qty":3,"price":450},{"name":"Phone Case Pro","qty":2,"price":800}]'::jsonb),
  ('INV-2042', 'Sara Ahmed', '2026-08-29', '2026-09-12', 10200, 1800, 12000, 'Paid', '[{"name":"Smart Watch Pro","qty":1,"price":12000}]'::jsonb),
  ('INV-2041', 'Bilal Raza', '2026-08-28', '2026-09-11', 27200, 4800, 32000, 'Sent', '[{"name":"Bluetooth Speaker","qty":5,"price":3200},{"name":"Power Bank 20000mAh","qty":5,"price":3800}]'::jsonb),
  ('INV-2040', 'Hina Malik', '2026-08-27', '2026-09-10', 7500, 1400, 8900, 'Paid', '[{"name":"Laptop Stand","qty":1,"price":2800},{"name":"Wireless Mouse","qty":2,"price":1500},{"name":"Desk Lamp LED","qty":1,"price":2200}]'::jsonb)
ON CONFLICT (id) DO NOTHING;
