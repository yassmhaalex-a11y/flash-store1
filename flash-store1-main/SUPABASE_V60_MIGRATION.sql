-- Run in Supabase SQL Editor before deploying V60 changes.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_note text;
CREATE TABLE IF NOT EXISTS public.delivery_guides (
 account_type text PRIMARY KEY CHECK (account_type IN ('home','sign','full','personal')),
 steps jsonb NOT NULL DEFAULT '[]'::jsonb,
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_guides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_guides FROM anon, authenticated;
GRANT ALL ON public.delivery_guides TO service_role;
