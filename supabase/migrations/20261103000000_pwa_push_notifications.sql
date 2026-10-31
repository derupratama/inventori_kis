-- Phase 9: per-device Web Push delivery queue and reminder settings.
-- Additive only; existing subscriptions, preferences, notification logs, and user data remain intact.
begin;

alter table public.notification_preferences
  add column if not exists product_expiry_enabled boolean not null default true,
  add column if not exists product_expiry_days_before smallint not null default 7,
  add column if not exists product_expiry_reminder_time time without time zone not null default '09:00';

do $preferences_checks$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conname = 'notification_preferences_expiry_days_valid' and conrelid = 'public.notification_preferences'::regclass) then
    alter table public.notification_preferences add constraint notification_preferences_expiry_days_valid check (product_expiry_days_before between 0 and 90);
  end if;
end;
$preferences_checks$;

do $push_key_checks$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conname = 'push_subscriptions_p256dh_length_valid' and conrelid = 'public.push_subscriptions'::regclass) then
    alter table public.push_subscriptions add constraint push_subscriptions_p256dh_length_valid
      check (length(p256dh_key) between 1 and 256);
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conname = 'push_subscriptions_auth_secret_length_valid' and conrelid = 'public.push_subscriptions'::regclass) then
    alter table public.push_subscriptions add constraint push_subscriptions_auth_secret_length_valid
      check (length(auth_secret) between 1 and 256);
  end if;
end;
$push_key_checks$;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notification_logs(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','processing','sent','failed')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_once_key unique (notification_id, subscription_id)
);

create index if not exists notification_deliveries_due_idx
  on public.notification_deliveries (next_attempt_at, created_at)
  where status = 'queued';
alter table public.notification_deliveries enable row level security;
revoke all on table public.notification_deliveries from public, anon, authenticated;
grant select on table public.notification_deliveries to authenticated;
grant select, insert, update, delete on table public.notification_deliveries to service_role;
drop policy if exists notification_deliveries_select_own on public.notification_deliveries;
create policy notification_deliveries_select_own on public.notification_deliveries
  for select to authenticated
  using (exists (
    select 1 from public.notification_logs as log
    where log.id = notification_id and log.user_id = (select auth.uid())
  ));

-- Claim is atomic across concurrent Cron invocations. No client role can execute it.
create or replace function public.claim_notification_deliveries(p_limit integer default 100)
returns setof public.notification_deliveries
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    update public.notification_deliveries as abandoned
    set status = 'failed', last_error = 'Retry limit reached after worker timeout', updated_at = pg_catalog.now()
    where abandoned.status = 'processing'
      and abandoned.updated_at < pg_catalog.now() - interval '5 minutes'
      and abandoned.attempt_count >= 10
    returning abandoned.id
  ), eligible as (
    select delivery.id
    from public.notification_deliveries as delivery
    left join public.push_subscriptions as subscription on subscription.id = delivery.subscription_id
    where ((delivery.status = 'queued' and delivery.next_attempt_at <= pg_catalog.now())
      or (delivery.status = 'processing' and delivery.updated_at < pg_catalog.now() - interval '5 minutes'))
      and delivery.attempt_count < 10
    order by delivery.next_attempt_at, delivery.created_at
    for update of delivery skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  )
  update public.notification_deliveries as delivery
  set status = 'processing', attempt_count = delivery.attempt_count + 1, updated_at = pg_catalog.now()
  from eligible
  where delivery.id = eligible.id
  returning delivery.*;
$$;
revoke all on function public.claim_notification_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(integer) to service_role;

notify pgrst, 'reload schema';

-- Cron invokes the server-only sender once per minute. UTC execution is converted
-- to each preference's IANA timezone in the sender when matching wall-clock times.
commit;
