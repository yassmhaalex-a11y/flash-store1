-- FLASH STORE V39 migration
-- IMPORTANT: This migration only adds columns/tables. It does NOT delete products,
-- categories, orders, accounts, or any existing data.
alter table public.store_settings add column if not exists admin_email text default '';
alter table public.products add column if not exists requires_account_details boolean not null default false;
alter table public.product_options
  add column if not exists requires_account_details boolean not null default false;

alter table public.products
  add column if not exists sale_price numeric(12,2) not null default 0,
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz;

alter table public.product_options
  add column if not exists sale_price numeric(12,2) not null default 0,
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz;

alter table public.order_items
  add column if not exists account_email text default '',
  add column if not exists account_password text default '';

-- Keep service-role access available for the server-side store API.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
