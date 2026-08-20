create extension if not exists pgcrypto;

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default 'Flash Store',
  logo_url text,
  primary_color text default '#ff2020',
  secondary_color text default '#ffc400',
  phone text,
  whatsapp text,
  instagram text,
  facebook text,
  payment_methods jsonb not null default '["Vodafone Cash","Telda","InstaPay"]'::jsonb,
  about_text text,
  faq_text text,
  terms_text text,
  privacy_text text,
  returns_text text,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_url text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  price numeric(12,2) not null default 0,
  old_price numeric(12,2),
  category_id uuid references public.categories(id) on delete set null,
  platform text,
  product_type text,
  featured boolean not null default false,
  is_active boolean not null default true,
  stock_status text not null default 'available',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  button_text text default 'Shop Now',
  image_url text,
  link text default '/products',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  phone text not null,
  payment_method text not null,
  total numeric(12,2) not null default 0,
  status text not null default 'pending',
  items jsonb not null default '[]'::jsonb,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.banners enable row level security;
alter table public.orders enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public settings read" on public.store_settings;
create policy "public settings read" on public.store_settings for select using (true);

drop policy if exists "public categories read" on public.categories;
create policy "public categories read" on public.categories for select using (is_active = true);

drop policy if exists "public products read" on public.products;
create policy "public products read" on public.products for select using (is_active = true);

drop policy if exists "public banners read" on public.banners;
create policy "public banners read" on public.banners for select using (is_active = true);

drop policy if exists "public create orders" on public.orders;
create policy "public create orders" on public.orders for insert with check (true);

drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all using (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
) with check (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all using (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
) with check (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "admins manage banners" on public.banners;
create policy "admins manage banners" on public.banners for all using (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
) with check (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "admins manage settings" on public.store_settings;
create policy "admins manage settings" on public.store_settings for all using (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
) with check (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders for all using (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
) with check (
  exists(select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "admin user self read" on public.admin_users;
create policy "admin user self read" on public.admin_users for select using (user_id = auth.uid());

insert into public.store_settings (store_name, about_text)
select 'Flash Store',
'Welcome to Flash Store — your destination for digital gaming products, subscriptions, games and gift cards. Our goal is to make gaming easier, faster and more affordable while providing reliable support.'
where not exists (select 1 from public.store_settings);

insert into public.categories (name,slug,image_url,sort_order)
select * from (values
('Xbox','xbox','https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80',1),
('PlayStation','playstation','https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=900&q=80',2),
('Steam','steam','https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',3),
('Fortnite','fortnite','https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&w=900&q=80',4)
) v(name,slug,image_url,sort_order)
where not exists (select 1 from public.categories);

insert into public.banners (title,subtitle,button_text,image_url,link,sort_order)
select * from (values
('LEVEL UP WITH FLASH STORE','Digital games, subscriptions and gift cards.','Shop Now','https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1800&q=85','/products',1),
('GAME PASS DEALS','Get more gaming for less.','Explore Xbox','https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1800&q=85','/category/xbox',2)
) v(title,subtitle,button_text,image_url,link,sort_order)
where not exists (select 1 from public.banners);