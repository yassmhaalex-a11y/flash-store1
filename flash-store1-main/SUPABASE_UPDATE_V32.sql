-- FLASH STORE V32 update for an existing database. Run this in Supabase SQL Editor.
alter table public.products add column if not exists requires_account_details boolean not null default false;
alter table public.orders add column if not exists account_email text default '';
alter table public.orders add column if not exists account_password text default '';
alter table public.hero_banners add column if not exists overlay_enabled boolean not null default false;
alter table public.hero_banners add column if not exists overlay_title text default '';
alter table public.hero_banners add column if not exists overlay_text text default '';
alter table public.hero_banners add column if not exists overlay_show_price boolean not null default true;
alter table public.hero_banners add column if not exists overlay_show_category boolean not null default true;
alter table public.hero_banners add column if not exists overlay_button_text text default 'BUY NOW';
alter table public.hero_banners add column if not exists overlay_position text not null default 'bottom-left';
alter table public.store_settings add column if not exists support_title text default 'Support';
alter table public.store_settings add column if not exists support_text text default 'Need help? Contact us on WhatsApp.';
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'system',
  title text not null,
  message text not null default '',
  related_id text default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
