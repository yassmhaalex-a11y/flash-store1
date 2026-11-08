-- Run once in Supabase SQL Editor BEFORE deploying V52. Preserves existing discount codes.
alter table public.discounts add column if not exists min_order_total numeric(12,2);
alter table public.discounts add column if not exists max_order_total numeric(12,2);
