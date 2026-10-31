begin;
select plan(23);

-- Fixed users let the test exercise ownership without linking to an external Supabase project.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS A"}', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS B"}', now(), now());

insert into public.products (id, user_id, name, category)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'RLS product A', 'serum'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'RLS product B', 'serum');

insert into public.routines (id, user_id, name, kind)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'RLS routine A', 'morning'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'RLS routine B', 'morning');

insert into public.routine_items (id, user_id, routine_id, product_id, label, position)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'RLS item A', 1),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'RLS item B', 1);

insert into public.routine_completions (user_id, routine_item_id, completed_on)
values
  ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', date '2026-11-01'),
  ('10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', date '2026-11-01');

insert into public.usage_logs (user_id, product_id, routine_item_id, activity_type, activity_date, notes)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'skin_note', date '2026-11-01', 'A note'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'skin_note', date '2026-11-01', 'B note');

insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_secret)
values
  ('10000000-0000-4000-8000-000000000001', 'https://push.example.test/a', 'p256dh-a', 'auth-a'),
  ('10000000-0000-4000-8000-000000000002', 'https://push.example.test/b', 'p256dh-b', 'auth-b');

insert into public.notification_preferences (user_id)
values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');

insert into public.notification_logs (user_id, notification_type, title, body)
values
  ('10000000-0000-4000-8000-000000000001', 'morning_routine', 'A title', 'A body'),
  ('10000000-0000-4000-8000-000000000002', 'morning_routine', 'B title', 'B body');

select ok(
  not exists (
    select 1
    from unnest(array[
      'profiles', 'products', 'routines', 'routine_items', 'routine_completions',
      'usage_logs', 'push_subscriptions', 'notification_preferences', 'notification_logs'
    ]) as names(table_name)
    where has_table_privilege('anon', format('public.%s', table_name), 'select,insert,update,delete')
  ),
  'anon has no SELECT/INSERT/UPDATE/DELETE grants on any personal table'
);

select is(
  (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any(array[
     'profiles', 'products', 'routines', 'routine_items', 'routine_completions',
     'usage_logs', 'push_subscriptions', 'notification_preferences', 'notification_logs'
   ]) and c.relrowsecurity),
  9,
  'RLS is enabled on all nine personal tables'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = any(array[
       'profiles', 'products', 'routines', 'routine_items', 'routine_completions',
       'usage_logs', 'push_subscriptions', 'notification_preferences', 'notification_logs'
     ])
     and 'authenticated' = any(roles)
     and cmd in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  36,
  'each table has authenticated SELECT, INSERT, UPDATE, and DELETE policies'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select * from public.products$$, '42501', null, 'anon cannot select products');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*)::integer from public.profiles), 1, 'user A sees only their profile');
select is((select count(*)::integer from public.products), 1, 'user A sees only their products');
select is((select count(*)::integer from public.routines), 1, 'user A sees only their routines');
select is((select count(*)::integer from public.routine_items), 1, 'user A sees only their routine items');
select is((select count(*)::integer from public.routine_completions), 1, 'user A sees only their completions');
select is((select count(*)::integer from public.usage_logs), 1, 'user A sees only their usage logs');
select is((select count(*)::integer from public.push_subscriptions), 1, 'user A sees only their push subscriptions');
select is((select count(*)::integer from public.notification_preferences), 1, 'user A sees only their preferences');
select is((select count(*)::integer from public.notification_logs), 1, 'user A sees only their notification logs');

select throws_ok(
  $$insert into public.products (user_id, name, category) values ('10000000-0000-4000-8000-000000000002', 'Cross-tenant product', 'serum')$$,
  '42501', null, 'user A cannot insert a product for user B'
);
select is(
  (with changed as (update public.products set name = 'Changed B' where id = '20000000-0000-4000-8000-000000000002' returning 1)
   select count(*)::integer from changed),
  0,
  'user A cannot update user B product'
);
select is(
  (with removed as (delete from public.products where id = '20000000-0000-4000-8000-000000000002' returning 1)
   select count(*)::integer from removed),
  0,
  'user A cannot delete user B product'
);
select throws_ok(
  $$insert into public.routine_items (user_id, routine_id, product_id, label, position)
    values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Cross-tenant item', 2)$$,
  '23503', null, 'composite foreign keys prevent linking a routine to another user product'
);

select lives_ok(
  $$insert into public.products (user_id, name, category) values ('10000000-0000-4000-8000-000000000001', 'RLS test own insert', 'serum')$$,
  'user A can insert their own product'
);
select is((select count(*)::integer from public.products where name = 'RLS test own insert'), 1, 'own insert is visible');
select lives_ok(
  $$update public.products set name = 'RLS test updated' where user_id = '10000000-0000-4000-8000-000000000001' and name = 'RLS test own insert'$$,
  'user A can update their own product'
);
select is((select name from public.products where name = 'RLS test updated'), 'RLS test updated', 'own update is visible');
select lives_ok(
  $$delete from public.products where user_id = '10000000-0000-4000-8000-000000000001' and name = 'RLS test updated'$$,
  'user A can delete their own product'
);
select is((select count(*)::integer from public.products where name = 'RLS test updated'), 0, 'own delete takes effect');

reset role;
select * from finish();
rollback;
