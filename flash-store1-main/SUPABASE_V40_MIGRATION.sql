-- FLASH STORE V40: category delivery credentials + order delivery credentials
alter table public.categories add column if not exists requires_delivery_credentials boolean not null default false;
alter table public.orders add column if not exists requires_delivery_credentials boolean not null default false;
alter table public.orders add column if not exists delivery_email text not null default '';
alter table public.orders add column if not exists delivery_password text not null default '';
