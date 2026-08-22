create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer','admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  price numeric(12,2) not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  platform_id uuid references public.platforms(id) on delete set null,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  stock int,
  active boolean not null default true
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  button_text text,
  target_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  payment_method text not null,
  items jsonb not null,
  total numeric(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id,email,name) values(new.id,new.email,new.raw_user_meta_data->>'name');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.platforms enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.banners enable row level security;
alter table public.orders enable row level security;

create policy "public active categories" on public.categories for select using (active = true);
create policy "public active platforms" on public.platforms for select using (active = true);
create policy "public active products" on public.products for select using (active = true);
create policy "public active variants" on public.product_variants for select using (active = true);
create policy "public active banners" on public.banners for select using (active = true);

create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id);
create policy "create orders" on public.orders for insert with check (user_id is null or auth.uid() = user_id);

-- Admin helper:
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage platforms" on public.platforms for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage variants" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage banners" on public.banners for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());

insert into public.categories(name,slug) values
('Games','games'),('Gift Cards','gift-cards'),('Subscriptions','subscriptions')
on conflict do nothing;

insert into public.platforms(name,slug) values
('Xbox','xbox'),('PlayStation','playstation'),('Steam','steam')
on conflict do nothing;