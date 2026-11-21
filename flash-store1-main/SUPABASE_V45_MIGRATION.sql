-- Run once in Supabase SQL editor before deploying V45
create table if not exists public.store_reviews (
 id uuid primary key default gen_random_uuid(), display_name text not null check (char_length(display_name) between 2 and 80),
 rating integer not null check (rating between 1 and 10), comment text not null check (char_length(comment) between 3 and 1500),
 approved boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.game_requests (
 id uuid primary key default gen_random_uuid(), name text not null, contact text not null, game text not null,
 details text not null default '', status text not null default 'processing', created_at timestamptz not null default now()
);
create table if not exists public.store_features (id integer primary key default 1 check (id=1), reviews_enabled boolean not null default true);
insert into public.store_features(id,reviews_enabled) values(1,true) on conflict(id) do nothing;
create index if not exists store_reviews_approved_idx on public.store_reviews(approved,created_at desc);
alter table public.store_reviews enable row level security;
alter table public.game_requests enable row level security;
alter table public.store_features enable row level security;
-- No public RLS policies: review submissions and moderation run through server API only.
