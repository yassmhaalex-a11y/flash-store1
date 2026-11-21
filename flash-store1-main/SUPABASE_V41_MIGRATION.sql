-- FLASH STORE V41: optional category delivery code + order delivery code
alter table public.categories add column if not exists requires_delivery_code boolean not null default false;
alter table public.orders add column if not exists requires_delivery_code boolean not null default false;
alter table public.orders add column if not exists delivery_code text not null default '';
