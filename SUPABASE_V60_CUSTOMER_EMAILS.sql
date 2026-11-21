-- Run after V60 migration; service-role-only customer notification queue.
create table if not exists public.flash_customer_email_queue (
 id bigint generated always as identity primary key,
 event_type text not null check(event_type in ('review','game_request')),
 recipient text not null,
 customer_name text not null default '',
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 available_at timestamptz not null default now(),
 locked_until timestamptz,
 attempts integer not null default 0,
 sent_at timestamptz,
 last_error text
);
alter table public.flash_customer_email_queue enable row level security;
revoke all on public.flash_customer_email_queue from public, anon, authenticated;
grant select,insert,update on public.flash_customer_email_queue to service_role;
grant usage,select on sequence public.flash_customer_email_queue_id_seq to service_role;
create or replace function public.flash_claim_customer_emails(p_limit integer default 10)
returns table(job_id bigint,event text,recipient_email text,customer_name text,payload jsonb)
language plpgsql security definer set search_path=public as $$
begin
 return query with chosen as (
 select q.id from public.flash_customer_email_queue q
 where q.sent_at is null and q.attempts < 6 and q.available_at <= now()
 and (q.locked_until is null or q.locked_until < now())
 order by q.id for update skip locked limit least(greatest(p_limit,1),20)
 ), updated as (
 update public.flash_customer_email_queue q set attempts=q.attempts+1, locked_until=now()+interval '4 minutes'
 from chosen where q.id=chosen.id returning q.*
 ) select u.id,u.event_type,u.recipient,u.customer_name,u.payload from updated u;
end $$;
create or replace function public.flash_finish_customer_email(p_job_id bigint,p_success boolean,p_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.flash_customer_email_queue set
 sent_at=case when p_success then now() else sent_at end,
 locked_until=null,
 available_at=case when p_success then available_at else now()+interval '10 minutes' end,
 last_error=case when p_success then null else left(coalesce(p_error,'Unknown error'),500) end
 where id=p_job_id and sent_at is null;
end $$;
revoke all on function public.flash_claim_customer_emails(integer) from public,anon,authenticated;
revoke all on function public.flash_finish_customer_email(bigint,boolean,text) from public,anon,authenticated;
grant execute on function public.flash_claim_customer_emails(integer) to service_role;
grant execute on function public.flash_finish_customer_email(bigint,boolean,text) to service_role;
