-- Routine schedules and completion/activity synchronization.
-- Safe to re-run; only additive schema changes and replaceable database function.

begin;

alter table public.routines
  add column if not exists active_days smallint[] not null default array[1,2,3,4,5,6,7]::smallint[];

do $routine_schedule_constraint$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'routines_active_days_valid'
      and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines add constraint routines_active_days_valid
      check (active_days <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(active_days) <= 7);
  end if;
end;
$routine_schedule_constraint$;

-- One morning and one evening routine per account. Custom routines remain unrestricted.
create unique index if not exists routines_unique_standard_kind_idx
  on public.routines (user_id, kind)
  where kind in ('morning', 'evening');

-- Tie a routine completion to exactly one usage log. Unchecking removes its log via cascade.
do $routine_completion_owner_key$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'routine_completions_id_user_id_key'
      and conrelid = 'public.routine_completions'::regclass
  ) then
    alter table public.routine_completions
      add constraint routine_completions_id_user_id_key unique (id, user_id);
  end if;
end;
$routine_completion_owner_key$;

alter table public.usage_logs
  add column if not exists routine_completion_id uuid;

do $usage_completion_constraints$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'usage_logs_completion_owner_fk'
      and conrelid = 'public.usage_logs'::regclass
  ) then
    alter table public.usage_logs add constraint usage_logs_completion_owner_fk
      foreign key (routine_completion_id, user_id)
      references public.routine_completions (id, user_id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'usage_logs_completion_once_key'
      and conrelid = 'public.usage_logs'::regclass
  ) then
    alter table public.usage_logs
      add constraint usage_logs_completion_once_key unique (user_id, routine_completion_id);
  end if;
end;
$usage_completion_constraints$;

create or replace function public.set_routine_item_completion(
  p_routine_item_id uuid,
  p_completed_on date,
  p_complete boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $routine_completion_rpc$
declare
  v_user_id uuid := auth.uid();
  v_product_id uuid;
  v_completion_id uuid;
  v_usage_log_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_completed_on is null or p_complete is null then
    raise exception using errcode = '22004', message = 'Completion date and state are required';
  end if;

  select item.product_id into v_product_id
  from public.routine_items as item
  where item.id = p_routine_item_id and item.user_id = v_user_id;
  if not found then
    raise exception using errcode = '42501', message = 'Routine item is not available to this user';
  end if;

  if p_complete then
    insert into public.routine_completions (user_id, routine_item_id, completed_on)
    values (v_user_id, p_routine_item_id, p_completed_on)
    on conflict (user_id, routine_item_id, completed_on)
    do update set completed_at = pg_catalog.now()
    returning id into v_completion_id;

    insert into public.usage_logs (
      user_id, routine_completion_id, product_id, routine_item_id,
      activity_type, activity_date, occurred_at, notes
    ) values (
      v_user_id, v_completion_id, v_product_id, p_routine_item_id,
      case when v_product_id is null then 'routine_note' else 'product_used' end,
      p_completed_on, pg_catalog.now(), 'Routine item completed'
    )
    on conflict (user_id, routine_completion_id)
    do update set activity_date = excluded.activity_date,
                  occurred_at = excluded.occurred_at,
                  product_id = excluded.product_id,
                  routine_item_id = excluded.routine_item_id,
                  activity_type = excluded.activity_type,
                  notes = excluded.notes
    returning id into v_usage_log_id;

    return pg_catalog.jsonb_build_object(
      'completed', true,
      'completion_id', v_completion_id,
      'usage_log_id', v_usage_log_id,
      'activity_date', p_completed_on
    );
  end if;

  delete from public.routine_completions
  where user_id = v_user_id
    and routine_item_id = p_routine_item_id
    and completed_on = p_completed_on;
  return pg_catalog.jsonb_build_object('completed', false, 'activity_date', p_completed_on);
end;
$routine_completion_rpc$;

revoke all on function public.set_routine_item_completion(uuid, date, boolean) from public, anon, authenticated;
grant execute on function public.set_routine_item_completion(uuid, date, boolean) to authenticated;

create or replace function public.move_routine_item(
  p_routine_id uuid,
  p_item_id uuid,
  p_direction smallint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $routine_order_rpc$
declare
  v_user_id uuid := auth.uid();
  v_locked_routine_id uuid;
  v_item_position integer;
  v_neighbor_id uuid;
  v_neighbor_position integer;
  v_temp_position integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_direction is null or p_direction not in (-1, 1) then
    raise exception using errcode = '22023', message = 'Direction must be -1 or 1';
  end if;

  -- Serialize all ordering operations for this routine. The lock is on the
  -- owned parent row, so it cannot affect another user's routine.
  select routine.id into v_locked_routine_id
  from public.routines as routine
  where routine.id = p_routine_id and routine.user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'Routine is not available to this user';
  end if;

  select item.position into v_item_position
  from public.routine_items as item
  where item.id = p_item_id and item.routine_id = p_routine_id and item.user_id = v_user_id;
  if not found then
    raise exception using errcode = '42501', message = 'Routine item is not available to this user';
  end if;

  if p_direction = -1 then
    select item.id, item.position into v_neighbor_id, v_neighbor_position
    from public.routine_items as item
    where item.routine_id = p_routine_id and item.user_id = v_user_id and item.position < v_item_position
    order by item.position desc limit 1;
  else
    select item.id, item.position into v_neighbor_id, v_neighbor_position
    from public.routine_items as item
    where item.routine_id = p_routine_id and item.user_id = v_user_id and item.position > v_item_position
    order by item.position asc limit 1;
  end if;
  if v_neighbor_id is null then return; end if;

  -- Pick a free non-negative slot among 0..item_count. This avoids overflow
  -- when an existing position is already at the maximum integer value.
  select slots.position into v_temp_position
  from pg_catalog.generate_series(
    0,
    (select pg_catalog.count(*)::integer from public.routine_items as item
     where item.routine_id = p_routine_id and item.user_id = v_user_id)
  ) as slots(position)
  where not exists (
    select 1 from public.routine_items as item
    where item.routine_id = p_routine_id and item.user_id = v_user_id
      and item.position = slots.position
  )
  order by slots.position
  limit 1;

  update public.routine_items set position = v_temp_position
  where id = p_item_id and routine_id = p_routine_id and user_id = v_user_id;
  update public.routine_items set position = v_item_position
  where id = v_neighbor_id and routine_id = p_routine_id and user_id = v_user_id;
  update public.routine_items set position = v_neighbor_position
  where id = p_item_id and routine_id = p_routine_id and user_id = v_user_id;
end;
$routine_order_rpc$;

revoke all on function public.move_routine_item(uuid, uuid, smallint) from public, anon, authenticated;
grant execute on function public.move_routine_item(uuid, uuid, smallint) to authenticated;

-- Make newly added columns and RPC signatures immediately visible to the Supabase Data API.
notify pgrst, 'reload schema';

commit;
