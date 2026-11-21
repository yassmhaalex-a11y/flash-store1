-- FLASH STORE V55: private transactional email queue.
-- Run once in Supabase SQL Editor. Requires public.orders and public.order_items.
create table if not exists public.flash_email_queue (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('confirmed','processing','completed','canceled')),
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now() + interval '30 seconds',
  locked_until timestamptz,
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  unique(order_id,event_type)
);

alter table public.flash_email_queue enable row level security;
revoke all on public.flash_email_queue from anon, authenticated;

create or replace function public.flash_queue_order_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare kind text;
begin
  if TG_OP = 'INSERT' then
    kind := 'confirmed';
  elsif NEW.status is distinct from OLD.status then
    kind := case lower(coalesce(NEW.status,''))
      when 'processing' then 'processing'
      when 'completed' then 'completed'
      when 'canceled' then 'canceled'
      when 'cancelled' then 'canceled'
      else null end;
  end if;
  if kind is not null then
    insert into public.flash_email_queue(order_id,event_type)
    values (NEW.id,kind)
    on conflict(order_id,event_type) do nothing;
  end if;
  return NEW;
end; $$;

drop trigger if exists flash_order_email_insert on public.orders;
create trigger flash_order_email_insert after insert on public.orders
for each row execute function public.flash_queue_order_email();
drop trigger if exists flash_order_email_status on public.orders;
create trigger flash_order_email_status after update of status on public.orders
for each row execute function public.flash_queue_order_email();

-- Claim due messages atomically; only the Supabase service role can call.
create or replace function public.flash_claim_email_jobs(p_limit integer default 10)
returns table(job_id bigint, order_uuid uuid, event text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with claimed as (
    select q.id from public.flash_email_queue q
    where q.sent_at is null and q.attempts < 6
      and q.available_at <= now()
      and (q.locked_until is null or q.locked_until < now())
    order by q.id
    for update skip locked
    limit least(greatest(p_limit,1),20)
  ), updated as (
    update public.flash_email_queue q
    set locked_until = now() + interval '4 minutes', attempts = q.attempts + 1
    from claimed where q.id = claimed.id
    returning q.id,q.order_id,q.event_type
  )
  select updated.id, updated.order_id, updated.event_type from updated;
end; $$;

create or replace function public.flash_finish_email_job(
  p_job_id bigint, p_success boolean, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.flash_email_queue
  set sent_at = case when p_success then now() else sent_at end,
      last_error = case when p_success then null else left(coalesce(p_error,'Unknown error'),500) end,
      locked_until = null,
      available_at = case when p_success then available_at else now() + interval '10 minutes' end
  where id = p_job_id and sent_at is null;
end; $$;

revoke all on function public.flash_claim_email_jobs(integer) from public, anon, authenticated;
revoke all on function public.flash_finish_email_job(bigint,boolean,text) from public, anon, authenticated;
grant execute on function public.flash_claim_email_jobs(integer) to service_role;
grant execute on function public.flash_finish_email_job(bigint,boolean,text) to service_role;
grant select on public.flash_email_queue to service_role;

-- Does not send emails by itself. Install Code.gs and its 5-minute trigger.
