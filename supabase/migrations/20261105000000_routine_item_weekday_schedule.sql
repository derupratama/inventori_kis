-- Add per-product weekday scheduling while preserving existing routine item rows.
-- Existing routine-level active_days continue to limit when a whole routine runs.
begin;

alter table public.routine_items
  add column if not exists active_days smallint[] not null default array[1,2,3,4,5,6,7]::smallint[];

do $routine_item_days_constraint$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'routine_items_active_days_valid'
      and conrelid = 'public.routine_items'::regclass
  ) then
    alter table public.routine_items
      add constraint routine_items_active_days_valid
      check (active_days <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(active_days) <= 7);
  end if;
end;
$routine_item_days_constraint$;

commit;
