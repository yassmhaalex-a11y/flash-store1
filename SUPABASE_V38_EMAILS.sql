-- V38: email settings + webhook checklist
-- Run once in Supabase SQL Editor.
alter table public.store_settings add column if not exists admin_email text default '';

-- After deploying the Supabase Edge Function `order-emails`, create these
-- Database Webhooks in Supabase Dashboard -> Database -> Webhooks:
-- 1) public.orders : INSERT  -> https://<PROJECT_REF>.supabase.co/functions/v1/order-emails
-- 2) public.orders : UPDATE  -> same URL
-- 3) public.profiles : INSERT -> same URL
-- Optional header on each webhook:
-- x-order-email-secret: <same value as ORDER_EMAIL_WEBHOOK_SECRET>
