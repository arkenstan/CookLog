begin;
select no_plan();

create function public._act_as(uid uuid) returns text language sql as
$$ select set_config('request.jwt.claims', json_build_object('sub', $1, 'role', 'authenticated')::text, true) $$;

insert into public.households (id, name, invite_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'Existing', 'abc123'),
  ('00000000-0000-0000-0000-0000000000b1', 'Other', 'other1');
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'r1@t.dev', '{"role":"resident"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'c1@t.dev', '{"role":"cook"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'x@t.dev', '{"role":"admin"}');

select is((select role::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-0000000000c1'),
  'cook', 'sign-up metadata sets cook role');
select is((select role::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-0000000000f1'),
  'resident', 'unknown role falls back to resident');

set local role authenticated;
select public._act_as('aaaaaaaa-0000-0000-0000-0000000000a1');

select throws_ok($$select public.join_household('nope')$$, 'invalid invite code', 'bad code rejected');
select lives_ok($$select public.join_household(' ABC123 ')$$, 'resident joins with invite code');
select is((select active_household_id from public.profiles where id = (select auth.uid())),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'joined household becomes active');

select lives_ok($$select public.create_household('Second')$$, 'member can create another household');
select is((select count(*)::int from public.households), 2, 'user sees both households');
select is((select count(*)::int from public.items), 5, 'new household gets default catalog items');
select is((select count(*)::int from public.inventory), 4, 'new household gets default inventory');

select lives_ok($$select public.set_active_household('00000000-0000-0000-0000-0000000000a1')$$,
  'switch active household');
select is((select active_household_id from public.profiles where id = (select auth.uid())),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'active household switched');
select throws_ok($$select public.set_active_household('00000000-0000-0000-0000-0000000000b1')$$,
  'not a member of this household', 'cannot activate a household you are not in');

select throws_ok($$update public.profiles set role = 'cook' where id = (select auth.uid())$$,
  '42501', null, 'cannot self-edit role');
select throws_ok($$update public.profiles set active_household_id = null where id = (select auth.uid())$$,
  '42501', null, 'cannot self-edit active household directly');

select public._act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
select throws_ok($$select public.create_household('Cook HH')$$,
  'only residents can create a household', 'cook cannot create household');
select lives_ok($$select public.join_household('abc123')$$, 'cook can join');

select * from finish();
rollback;
