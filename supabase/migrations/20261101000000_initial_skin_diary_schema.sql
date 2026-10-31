-- My Skin Diary: initial private, per-user schema.
-- Re-running this file against the same schema is safe. It never contacts a remote database.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_trimmed check (display_name = btrim(display_name)),
  constraint profiles_timezone_nonempty check (length(btrim(timezone)) > 0)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  category text not null check (category in ('cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'treatment', 'other')),
  description text, 
  size_label text,
  price_amount numeric(12, 2) check (price_amount is null or price_amount >= 0),
  currency_code char(3) not null default 'IDR' check (currency_code ~ '^[A-Z]{3}$'),
  usage_instructions text,
  skin_types text[] not null default '{}'::text[],
  ingredients text[] not null default '{}'::text[],
  expires_on date, -- Manufacturer/package expiry date; independent from the opened date.
  opened_on date, -- Calendar day the user opened the product.
  pao_months smallint check (pao_months is null or pao_months between 1 and 60), -- Package PAO duration, not a calculated date.
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_nonempty check (length(btrim(name)) > 0),
  constraint products_id_user_id_key unique (id, user_id)
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('morning', 'evening', 'custom')),
  description text,
  position integer not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_name_nonempty check (length(btrim(name)) > 0),
  constraint routines_id_user_id_key unique (id, user_id)
);

create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null,
  product_id uuid,
  label text not null,
  instructions text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_items_label_nonempty check (length(btrim(label)) > 0),
  constraint routine_items_id_user_id_key unique (id, user_id),
  constraint routine_items_routine_owner_fk
    foreign key (routine_id, user_id)
    references public.routines (id, user_id) on delete cascade,
  constraint routine_items_product_owner_fk
    foreign key (product_id, user_id)
    references public.products (id, user_id) on delete cascade,
  constraint routine_items_position_key unique (routine_id, position)
);

-- A row means that one routine item was completed on that user's local calendar date.
create table if not exists public.routine_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_item_id uuid not null,
  completed_on date not null, -- User's local calendar day; caller supplies it explicitly.
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint routine_completions_item_owner_fk
    foreign key (routine_item_id, user_id)
    references public.routine_items (id, user_id) on delete cascade,
  constraint routine_completions_once_per_day_key
    unique (user_id, routine_item_id, completed_on)
);

-- Journal activities and product usage share a timeline, but retain their exact timestamp and local DATE.
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid,
  routine_item_id uuid,
  activity_type text not null check (activity_type in ('skin_note', 'product_used', 'routine_note', 'reaction')),
  activity_date date not null, -- User's local calendar day; do not derive it from UTC in the client.
  occurred_at timestamptz not null default now(),
  mood text,
  skin_area text,
  notes text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_logs_product_owner_fk
    foreign key (product_id, user_id)
    references public.products (id, user_id) on delete set null (product_id),
  constraint usage_logs_routine_item_owner_fk
    foreign key (routine_item_id, user_id)
    references public.routine_items (id, user_id) on delete set null (routine_item_id),
  constraint usage_logs_has_content check (
    mood is not null or skin_area is not null or notes is not null or cardinality(tags) > 0
    or product_id is not null or routine_item_id is not null
  )
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null check (length(endpoint) between 1 and 4096),
  p256dh_key text not null,
  auth_secret text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

-- TIME WITHOUT TIME ZONE represents a recurring wall-clock time in the user's timezone.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_routine_enabled boolean not null default true,
  morning_reminder_time time without time zone not null default '08:00',
  evening_reminder_enabled boolean not null default false,
  evening_reminder_time time without time zone not null default '20:00',
  weekly_summary_enabled boolean not null default true,
  weekly_summary_iso_day smallint not null default 1 check (weekly_summary_iso_day between 1 and 7),
  timezone text not null default 'Asia/Jakarta' check (length(btrim(timezone)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_type text not null check (notification_type in ('morning_routine', 'evening_routine', 'weekly_summary', 'product_expiry', 'other')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed', 'cancelled')),
  dedupe_key text,
  title text not null,
  body text not null,
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_logs_title_nonempty check (length(btrim(title)) > 0),
  constraint notification_logs_user_dedupe_key unique (user_id, dedupe_key)
);

-- Composite unique constraints above let child foreign keys verify tenant ownership, not just row existence.
create index if not exists products_user_expiry_idx on public.products (user_id, expires_on);
create index if not exists products_user_category_idx on public.products (user_id, category);
create index if not exists products_user_opened_idx on public.products (user_id, opened_on) where opened_on is not null;
create index if not exists routines_user_kind_position_idx on public.routines (user_id, kind, position);
create index if not exists routine_items_user_routine_position_idx on public.routine_items (user_id, routine_id, position);
create index if not exists routine_items_user_product_idx on public.routine_items (user_id, product_id) where product_id is not null;
create index if not exists routine_completions_user_day_idx on public.routine_completions (user_id, completed_on desc);
create index if not exists usage_logs_user_day_idx on public.usage_logs (user_id, activity_date desc);
create index if not exists usage_logs_user_product_idx on public.usage_logs (user_id, product_id) where product_id is not null;
create index if not exists usage_logs_tags_gin_idx on public.usage_logs using gin (tags);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists notification_logs_user_created_idx on public.notification_logs (user_id, created_at desc);
create index if not exists notification_logs_queued_schedule_idx on public.notification_logs (scheduled_at) where status = 'queued';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

do $updated_at_triggers$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'products', 'routines', 'routine_items', 'usage_logs',
    'push_subscriptions', 'notification_preferences', 'notification_logs'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$updated_at_triggers$;

-- Create a profile for every new Auth user. This is idempotent for existing profiles.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Each public table has explicit client grants and row policies. Anonymous clients receive no table grants.
grant usage on schema public to authenticated;

do $secure_tables$
declare
  table_name text;
  owner_column text;
begin
  for table_name, owner_column in
    select * from (values
      ('profiles', 'id'),
      ('products', 'user_id'),
      ('routines', 'user_id'),
      ('routine_items', 'user_id'),
      ('routine_completions', 'user_id'),
      ('usage_logs', 'user_id'),
      ('push_subscriptions', 'user_id'),
      ('notification_preferences', 'user_id'),
      ('notification_logs', 'user_id')
    ) as owned_tables(table_name, owner_column)
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null and %I = (select auth.uid()))',
      table_name || '_select_own', table_name, owner_column
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) is not null and %I = (select auth.uid()))',
      table_name || '_insert_own', table_name, owner_column
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) is not null and %I = (select auth.uid())) with check ((select auth.uid()) is not null and %I = (select auth.uid()))',
      table_name || '_update_own', table_name, owner_column, owner_column
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) is not null and %I = (select auth.uid()))',
      table_name || '_delete_own', table_name, owner_column
    );
  end loop;
end;
$secure_tables$;

commit;
