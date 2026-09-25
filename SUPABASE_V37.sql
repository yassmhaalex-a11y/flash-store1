-- FLASH STORE V37: configurable notification email
alter table public.store_settings add column if not exists admin_email text default '';
