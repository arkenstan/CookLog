begin;
select no_plan();

create function public._act_as(uid uuid) returns text language sql as
$$ select set_config('request.jwt.claims', json_build_object('sub', $1, 'role', 'authenticated')::text, true) $$;

-- Fixtures (postgres bypasses RLS). The trigger creates bare profiles; identity is set below.
insert into public.households (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'A'),
  ('00000000-0000-0000-0000-00000000000b', 'B');
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a-res@test.dev'),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'a-cook@test.dev'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b-res@test.dev');
-- The trigger makes bare profiles; complete_profile's job, done directly here.
update public.profiles p set username = v.username, role = v.role::public.user_role
from (values
  ('aaaaaaaa-0000-0000-0000-00000000000a'::uuid, 'a_res', 'resident'),
  ('aaaaaaaa-0000-0000-0000-00000000000c'::uuid, 'a_cook', 'cook'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'::uuid, 'b_res', 'resident')
) as v (id, username, role) where p.id = v.id;
insert into public.household_members (household_id, user_id) values
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-00000000000b');
update public.profiles set active_household_id = '00000000-0000-0000-0000-00000000000a'
  where id in ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000c');
update public.profiles set active_household_id = '00000000-0000-0000-0000-00000000000b'
  where id = 'bbbbbbbb-0000-0000-0000-00000000000b';
insert into public.meals (id, household_id, title, type, starts_at, cutoff_at) values
  ('cccccccc-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'A open', 'dinner', now() + interval '3 hours', now() + interval '1 hour'),
  ('cccccccc-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'B open', 'dinner', now() + interval '3 hours', now() + interval '1 hour');
insert into public.items (id, household_id, name, kind) values
  ('dddddddd-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Roti', 'count');
insert into public.inventory (id, household_id, name) values
  ('eeeeeeee-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Atta');

set local role authenticated;

select public._act_as('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.meals), 1, 'resident sees only own household meals');
select is((select count(*)::int from public.households), 1, 'resident sees only member households');
select throws_ok($$insert into public.rsvps (meal_id, user_id, status) values
  ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'out')$$,
  '42501', null, 'RSVPs cannot be written directly (RPC only)');
select throws_ok($$insert into public.meals (household_id, title, type, starts_at, cutoff_at) values
  ('00000000-0000-0000-0000-00000000000a', 'x', 'lunch', now(), now())$$,
  '42501', null, 'meals cannot be inserted directly');

select public._act_as('aaaaaaaa-0000-0000-0000-00000000000c');
select lives_ok($$update public.inventory set status = 'missing'
  where id = 'eeeeeeee-0000-0000-0000-00000000000a'$$, 'cook can mark inventory missing');
select throws_ok($$select public.set_availability('cccccccc-0000-0000-0000-00000000000a', 'in')$$,
  'only residents can set availability', 'cook cannot set availability');
select throws_ok($$insert into public.event_entries (meal_id, user_id, item_id, amount) values
  ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000c',
   'dddddddd-0000-0000-0000-00000000000a', 1)$$, '42501', null, 'cook cannot add entries');
select throws_ok($$select public.create_meal_event('x', 'lunch', now() + interval '2 hours', now())$$,
  'only residents can create meal events', 'cook cannot create events');

reset role;
set local role anon;
select throws_ok($$select * from public.meals$$, '42501', null, 'anon has no access');
select throws_ok($$select * from public.docket_items$$, '42501', null, 'anon cannot read docket');

select * from finish();
rollback;
