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
-- Aged on purpose: now() is the transaction timestamp, so a row created in this
-- transaction could never show a moved updated_at.
insert into public.inventory (id, household_id, name, added_by, created_at, updated_at) values
  ('eeeeeeee-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Atta',
   'aaaaaaaa-0000-0000-0000-00000000000a', now() - interval '1 day', now() - interval '1 day'),
  ('eeeeeeee-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Atta',
   'bbbbbbbb-0000-0000-0000-00000000000b', now() - interval '1 day', now() - interval '1 day');

set local role authenticated;

-- ── Resident: full ledger access inside their own household ──────────────────
select public._act_as('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.inventory), 1, 'resident sees only own household pantry');

select lives_ok($$insert into public.inventory (household_id, name, added_by) values
  ('00000000-0000-0000-0000-00000000000a', 'Ghee', 'aaaaaaaa-0000-0000-0000-00000000000a')$$,
  'resident can add a pantry item');

select throws_ok($$insert into public.inventory (household_id, name, added_by) values
  ('00000000-0000-0000-0000-00000000000a', 'ghee', 'aaaaaaaa-0000-0000-0000-00000000000a')$$,
  '23505', null, 'duplicate names are rejected case-insensitively');

select throws_ok($$insert into public.inventory (household_id, name, added_by) values
  ('00000000-0000-0000-0000-00000000000a', '   ', 'aaaaaaaa-0000-0000-0000-00000000000a')$$,
  '23514', null, 'blank names are rejected');

select throws_ok($$insert into public.inventory (household_id, name, added_by) values
  ('00000000-0000-0000-0000-00000000000a', 'Jaggery', 'aaaaaaaa-0000-0000-0000-00000000000c')$$,
  '42501', null, 'added_by cannot be forged');

select throws_ok($$insert into public.inventory (household_id, name, added_by) values
  ('00000000-0000-0000-0000-00000000000b', 'Jaggery', 'aaaaaaaa-0000-0000-0000-00000000000a')$$,
  '42501', null, 'cannot add to another household pantry');

select throws_ok($$update public.inventory
  set household_id = '00000000-0000-0000-0000-00000000000b'
  where id = 'eeeeeeee-0000-0000-0000-00000000000a'$$,
  '42501', null, 'rows cannot be moved between households');

select lives_ok($$delete from public.inventory where name = 'Ghee'$$,
  'resident can remove a pantry item');

-- ── Cook: same write access, which is what the missing-ingredient grid needs ──
select public._act_as('aaaaaaaa-0000-0000-0000-00000000000c');
select lives_ok($$update public.inventory set status = 'missing'
  where id = 'eeeeeeee-0000-0000-0000-00000000000a'$$, 'cook can mark inventory missing');
select is((select status::text from public.inventory where id = 'eeeeeeee-0000-0000-0000-00000000000a'),
  'missing', 'the status change stuck');
select ok((select updated_at > created_at from public.inventory
  where id = 'eeeeeeee-0000-0000-0000-00000000000a'), 'the touch trigger moved updated_at');
select lives_ok($$insert into public.inventory (household_id, name, status, added_by) values
  ('00000000-0000-0000-0000-00000000000a', 'Coriander', 'missing',
   'aaaaaaaa-0000-0000-0000-00000000000c')$$, 'cook can add a missing ingredient');

-- ── Another household is invisible and untouchable ───────────────────────────
select public._act_as('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.inventory), 1, 'other household sees only its own pantry');
select is((select count(*)::int from public.inventory
  where id = 'eeeeeeee-0000-0000-0000-00000000000a'), 0, 'cannot read across households');
select lives_ok($$delete from public.inventory where id = 'eeeeeeee-0000-0000-0000-00000000000a'$$,
  'a cross-household delete runs but matches nothing');
select is((select count(*)::int from public.inventory
  where id = 'eeeeeeee-0000-0000-0000-00000000000a'), 0, 'and the row is still there for its owner');

reset role;
select is((select count(*)::int from public.inventory
  where id = 'eeeeeeee-0000-0000-0000-00000000000a'), 1, 'confirmed: the row survived');

set local role anon;
select throws_ok($$select * from public.inventory$$, '42501', null, 'anon has no pantry access');

select * from finish();
rollback;
