begin;
select plan(8);

-- Fixtures (run as postgres, bypassing RLS)
insert into public.households (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'A'),
  ('00000000-0000-0000-0000-00000000000b', 'B');

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a-res@test.dev'),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'a-cook@test.dev'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b-res@test.dev');

update public.profiles set household_id = '00000000-0000-0000-0000-00000000000a'
  where id in ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000c');
update public.profiles set household_id = '00000000-0000-0000-0000-00000000000b'
  where id = 'bbbbbbbb-0000-0000-0000-00000000000b';
update public.profiles set role = 'cook' where id = 'aaaaaaaa-0000-0000-0000-00000000000c';

insert into public.meals (id, household_id, date, type, cutoff_at) values
  ('cccccccc-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a',
   current_date, 'dinner', now() + interval '1 hour'),
  ('cccccccc-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b',
   current_date, 'dinner', now() + interval '1 hour'),
  ('cccccccc-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000a',
   current_date, 'lunch', now() - interval '1 hour');
insert into public.inventory (id, household_id, name) values
  ('dddddddd-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Atta');

-- Resident A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.meals), 2, 'resident sees only own household meals');
select lives_ok(
  $$insert into public.rsvps (meal_id, user_id, status) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'out')$$,
  'resident can RSVP for self before cutoff');
select throws_ok(
  $$insert into public.rsvps (meal_id, user_id, status) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000c', 'out')$$,
  '42501', null, 'resident cannot RSVP for someone else');
select throws_ok(
  $$insert into public.rsvps (meal_id, user_id, status) values
    ('cccccccc-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-00000000000a', 'out')$$,
  '42501', null, 'resident cannot RSVP after cutoff');
select throws_ok(
  $$insert into public.rsvps (meal_id, user_id, status) values
    ('cccccccc-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', 'out')$$,
  '42501', null, 'resident cannot RSVP to another household meal');

-- Cook A
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select lives_ok(
  $$update public.inventory set status = 'missing' where id = 'dddddddd-0000-0000-0000-00000000000a'$$,
  'cook can mark inventory missing');
select throws_ok(
  $$insert into public.rsvps (meal_id, user_id, status) values
    ('cccccccc-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000c', 'in')$$,
  '42501', null, 'cook cannot write RSVPs');

-- Anon
reset role;
set local role anon;
select throws_ok($$select * from public.meals$$, '42501', null, 'anon has no access');

select * from finish();
rollback;
