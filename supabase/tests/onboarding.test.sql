begin;
select plan(13);

-- Fixtures as postgres (profiles are created by the auth.users trigger)
insert into public.households (id, name, invite_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'Existing', 'abc123');
insert into public.menu_items (id, household_id, name) values
  ('eeeeeeee-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Dal');
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'r1@t.dev', '{"role":"resident"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'r2@t.dev', '{"role":"resident"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', 'r3@t.dev', '{"role":"resident"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'c1@t.dev', '{"role":"cook"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'x@t.dev', '{"role":"admin"}');

select is((select role::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-0000000000c1'),
  'cook', 'sign-up metadata sets cook role');
select is((select role::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-0000000000f1'),
  'resident', 'unknown role falls back to resident');

set local role authenticated;

-- r1 joins with a case-insensitive code
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select public.join_household('nope')$$, 'invalid invite code', 'bad code rejected');
select lives_ok($$select public.join_household(' ABC123 ')$$, 'resident joins with invite code');
select throws_ok($$select public.create_household('Again')$$, 'already in a household',
  'member cannot create another household');
select throws_ok($$update public.profiles set role = 'cook' where id = (select auth.uid())$$,
  '42501', null, 'cannot self-edit role');
select throws_ok($$update public.profiles set household_id = null where id = (select auth.uid())$$,
  '42501', null, 'cannot self-edit household');

-- r2 joins, then today's meals are created once with default "in" RSVPs
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select public.join_household('abc123');
select public.ensure_todays_meals();
select is((select count(*)::int from public.ensure_todays_meals()), 2, 'lunch + dinner, idempotent');
select is((select count(*)::int from public.rsvps where status = 'in'), 4, 'all residents default to in');

-- exactly one resident (the picker) may set the menu, and never the status
with a as (update public.meals set menu_item_id = 'eeeeeeee-0000-0000-0000-0000000000a1' returning 1)
  select set_config('t.a', count(*)::text, true) from a;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
with b as (update public.meals set menu_item_id = 'eeeeeeee-0000-0000-0000-0000000000a1' returning 1)
  select set_config('t.b', count(*)::text, true) from b;
select is(current_setting('t.a')::int + current_setting('t.b')::int, 2, 'picker sets menu on both meals');
select throws_ok($$update public.meals set status = 'locked'$$, '42501', null, 'cannot edit meal status');

-- cook cannot create a household; r3 can and gets seeded inventory
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select throws_ok($$select public.create_household('Cook HH')$$, 'only residents can create a household',
  'cook cannot create household');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select public.create_household('Mine');
select is((select count(*)::int from public.inventory), 4, 'new household gets default inventory');

select * from finish();
rollback;
