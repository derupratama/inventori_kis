begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select ok(
  not has_function_privilege(
    'anon',
    'public.set_routine_item_completion(uuid,date,boolean)'::regprocedure,
    'EXECUTE'
  ),
  'anon does not have EXECUTE on set_routine_item_completion'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.move_routine_item(uuid,uuid,smallint)'::regprocedure,
    'EXECUTE'
  ),
  'anon does not have EXECUTE on move_routine_item'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('51000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'routine-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('51000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'routine-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.products (id, user_id, name, category)
values ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'Routine test product', 'cleanser');

insert into public.routines (id, user_id, name, kind)
values ('53000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'Routine test morning', 'morning');

insert into public.routine_items (id, user_id, routine_id, product_id, label, position)
values
  ('54000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'First step', 0),
  ('54000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'Second step', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select cardinality(active_days)::integer from public.routines where id = '53000000-0000-4000-8000-000000000001'), 7, 'routines default to all seven ISO weekdays');
update public.routines set active_days = array[1,3,5]::smallint[] where id = '53000000-0000-4000-8000-000000000001';
select is((select active_days::text from public.routines where id = '53000000-0000-4000-8000-000000000001'), '{1,3,5}', 'authenticated user can persist selected active days');

-- Mirrors routine-api.addSkinNote: user_id, activity_type, activity_date,
-- occurred_at, mood, and notes are supplied; routine_completion_id stays NULL.
insert into public.usage_logs (
  id, user_id, activity_type, activity_date, occurred_at, mood, notes
) values (
  '55000000-0000-4000-8000-000000000001', auth.uid(), 'skin_note', date '2026-11-01',
  '2026-11-01T09:00:00Z'::timestamptz, 'Catatan kulit', 'Manual calendar note'
);
select is((select routine_completion_id from public.usage_logs where id = '55000000-0000-4000-8000-000000000001'), null::uuid, 'manual calendar note has no completion link');

select is((select public.set_routine_item_completion('54000000-0000-4000-8000-000000000001', date '2026-11-01', true)->>'completed'), 'true', 'authenticated user can complete their own step');
select is((select public.set_routine_item_completion('54000000-0000-4000-8000-000000000001', date '2026-11-01', true)->>'completed'), 'true', 'repeating a completion is idempotent');
select is((select count(*)::integer from public.routine_completions where user_id = auth.uid() and completed_on = date '2026-11-01'), 1, 'unique completion constraint prevents checklist duplicates');
select throws_ok($$insert into public.routine_completions (user_id, routine_item_id, completed_on) values (auth.uid(), '54000000-0000-4000-8000-000000000001', date '2026-11-01')$$, '23505', null, 'unique constraint rejects a duplicate completion for the same item and day');
select is((select count(*)::integer from public.usage_logs as log join public.routine_completions as completion on completion.id = log.routine_completion_id and completion.user_id = log.user_id where log.user_id = auth.uid() and log.activity_date = date '2026-11-01' and completion.routine_item_id = '54000000-0000-4000-8000-000000000001'), 1, 'calendar usage log references the exact routine completion');
select lives_ok($$select public.move_routine_item('53000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000002', -1)$$, 'routine ordering RPC can move an owned step');
select is((select position from public.routine_items where id = '54000000-0000-4000-8000-000000000002'), 0, 'moving a step changes its persistent position');
select is((select public.set_routine_item_completion('54000000-0000-4000-8000-000000000001', date '2026-11-01', false)->>'completed'), 'false', 'unchecking removes its completion and linked calendar log');
select is((select count(*)::integer from public.routine_completions where user_id = auth.uid() and completed_on = date '2026-11-01'), 0, 'unchecking removes the completion row');
select is((select count(*)::integer from public.usage_logs where user_id = auth.uid() and routine_completion_id is not null), 0, 'unchecking cascades removal of the matching calendar activity');
select is((select count(*)::integer from public.usage_logs where id = '55000000-0000-4000-8000-000000000001' and user_id = auth.uid() and routine_completion_id is null and activity_type = 'skin_note' and notes = 'Manual calendar note'), 1, 'unchecking preserves the unrelated manual calendar note');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.set_routine_item_completion('54000000-0000-4000-8000-000000000001', date '2026-11-01', true)$$, '42501', null, 'another user cannot complete this routine item');
select throws_ok($$select public.move_routine_item('53000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000001', 1)$$, '42501', null, 'another user cannot reorder this routine item');
reset role;
select * from finish();
rollback;
