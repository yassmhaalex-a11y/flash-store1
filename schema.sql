-- FLASH STORE V17 database
-- Run this in a CLEAN Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  image_url text default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text default '',
  image_url text default '',
  platform text default '',
  old_price numeric(12,2) not null default 0,
  price numeric(12,2) not null default 0,
  featured boolean not null default false,
  best_seller boolean not null default false,
  discount_badge boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  old_price numeric(12,2) not null default 0,
  image_url text default '',
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  kind text not null default 'percent' check (kind in ('percent','fixed')),
  value numeric(12,2) not null,
  scope text not null default 'all' check (scope in ('all','products','categories')),
  first_order_only boolean not null default false,
  one_use_per_user boolean not null default false,
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.discount_products (
  discount_id uuid references public.discounts(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  primary key (discount_id, product_id)
);

create table if not exists public.discount_categories (
  discount_id uuid references public.discounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (discount_id, category_id)
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  details text not null default '',
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigserial unique not null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text not null,
  password_text text default '',
  payment_method text not null,
  payment_details text default '',
  proof_url text default '',
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  discount_code text default '',
  status text not null default 'pending' check (status in ('pending','paid','processing','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  option_id uuid references public.product_options(id) on delete set null,
  product_name text not null,
  option_name text default '',
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0
);

create table if not exists public.store_settings (
  id int primary key default 1,
  store_name text not null default 'FLASH STORE',
  logo_url text default '',
  hero_enabled boolean not null default true,
  about_title text default 'About FLASH STORE',
  about_text text default 'Your gaming destination for digital products.',
  whatsapp text default '',
  updated_at timestamptz not null default now()
);

insert into public.store_settings(id) values (1) on conflict (id) do nothing;

insert into public.payment_methods(name, details, sort_order)
values
('Vodafone Cash','Add your Vodafone Cash number from the Admin Panel.',1),
('Telda','Add your Telda details from the Admin Panel.',2),
('InstaPay','Add your InstaPay details from the Admin Panel.',3)
on conflict (name) do nothing;

-- Profile creation trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.discounts enable row level security;
alter table public.discount_products enable row level security;
alter table public.discount_categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;

-- Public reads
drop policy if exists "public categories" on public.categories;
create policy "public categories" on public.categories for select using (active=true);

drop policy if exists "public products" on public.products;
create policy "public products" on public.products for select using (active=true);

drop policy if exists "public options" on public.product_options;
create policy "public options" on public.product_options for select using (active=true);

drop policy if exists "public settings" on public.store_settings;
create policy "public settings" on public.store_settings for select using (true);

drop policy if exists "public payments" on public.payment_methods;
create policy "public payments" on public.payment_methods for select using (active=true);

-- Logged-in users can read their profile and own orders.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid()=id);

drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders for select using (auth.uid()=user_id);

drop policy if exists "own order items" on public.order_items;
create policy "own order items" on public.order_items for select
using (exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));

-- The Vercel API uses the service role server-side for protected writes/admin work.
