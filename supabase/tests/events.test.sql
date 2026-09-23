begin;
select no_plan();

create function public._act_as(uid uuid) returns text language sql as
$$ select set_config('request.jwt.claims', json_build_object('sub', $1, 'role', 'authenticated')::text, true) $$;

-- Household H: residents r1, r2 and cook c1. Household O: unrelated resident ro.
insert into public.households (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'H'),
  ('00000000-0000-0000-0000-0000000000b1', 'O');
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'r1@t.dev'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'r2@t.dev'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'c1@t.dev'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'ro@t.dev');
-- The trigger makes bare profiles; complete_profile's job, done directly here.
update public.profiles p set username = v.username, role = v.role::public.user_role
from (values
  ('aaaaaaaa-0000-0000-0000-0000000000a1'::uuid, 'res1', 'resident'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2'::uuid, 'res2', 'resident'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1'::uuid, 'cook1', 'cook'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1'::uuid, 'other1', 'resident')
) as v (id, username, role) where p.id = v.id;
insert into public.household_members (household_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-0000000000b1');
update public.profiles set active_household_id = '00000000-0000-0000-0000-0000000000a1'
  where id in ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-0000000000c1');
update public.profiles set active_household_id = '00000000-0000-0000-0000-0000000000b1'
  where id = 'bbbbbbbb-0000-0000-0000-0000000000b1';
insert into public.items (id, household_id, name, kind) values
  ('11111111-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Roti', 'count'),
  ('11111111-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'Soup', 'portion');
insert into public.regulars (user_id, item_id, amount) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '11111111-0000-0000-0000-0000000000a1', 4),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', '11111111-0000-0000-0000-0000000000a1', 2),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', '11111111-0000-0000-0000-0000000000a2', 1);
-- A past event (RSVPs closed)
insert into public.meals (id, household_id, title, type, starts_at, cutoff_at) values
  ('cccccccc-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Old', 'lunch',
   now() - interval '1 hour', now() - interval '3 hours');

set local role authenticated;

-- ── r1 creates an event ─────────────────────────────────────────────────────
select public._act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
select throws_ok($$select public.create_meal_event('Bad', 'dinner', now() + interval '1 hour', now() + interval '2 hours')$$,
  'RSVP cutoff must be before the meal starts', 'cutoff must precede start');
select lives_ok($$select public.create_meal_event('Dinner', 'dinner', now() + interval '5 hours', now() + interval '2 hours')$$,
  'resident creates a meal event');
select is((select count(*)::int from public.rsvps r join public.meals m on m.id = r.meal_id
           where m.title = 'Dinner' and r.status = 'in'), 2, 'every resident defaults to in');
select is((select count(*)::int from public.event_entries e join public.meals m on m.id = e.meal_id
           where m.title = 'Dinner'), 3, 'regulars are pre-filled for each resident');

-- ── entries: validation and ownership ───────────────────────────────────────
select lives_ok($$insert into public.event_entries (meal_id, user_id, item_id, amount)
  select id, (select auth.uid()), '11111111-0000-0000-0000-0000000000a2', 1 from public.meals where title = 'Dinner'$$,
  'resident adds a portion item');
select throws_ok($$update public.event_entries set amount = 1.5
  where item_id = '11111111-0000-0000-0000-0000000000a1' and user_id = (select auth.uid())$$,
  'count items must be whole numbers', 'fractional count rejected');
select throws_ok($$update public.event_entries set amount = 0.25
  where item_id = '11111111-0000-0000-0000-0000000000a2' and user_id = (select auth.uid())$$,
  'portions must be in steps of 0.5', 'quarter portion rejected');
select lives_ok($$update public.event_entries set amount = 1.5
  where item_id = '11111111-0000-0000-0000-0000000000a2' and user_id = (select auth.uid())$$,
  'half-step portion accepted');
with u as (update public.event_entries set amount = 9 where user_id = 'aaaaaaaa-0000-0000-0000-0000000000a2' returning 1)
  select is((select count(*)::int from u), 0, 'cannot edit another resident''s entries');
select is((select count(*)::int from public.regulars), 1, 'regulars are private to their owner');

-- ── availability toggling affects the docket, keeps tweaks ──────────────────
update public.event_entries set amount = 5
  where item_id = '11111111-0000-0000-0000-0000000000a1' and user_id = (select auth.uid());
select lives_ok($$select public.set_availability((select id from public.meals where title = 'Dinner'), 'out')$$,
  'resident marks out');

select public._act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
select is((select total from public.docket_items where name = 'Roti'), 2::numeric, 'docket ignores residents who are out');
select is((select total from public.docket_items where name = 'Soup'), 1::numeric, 'portion total counts only ins');
select is((select people_in from public.daily_kitchen_docket where title = 'Dinner'), 1::bigint, 'people_in = 1');

select public._act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
select lives_ok($$select public.set_availability((select id from public.meals where title = 'Dinner'), 'in')$$,
  'resident marks in again');
select public._act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
select is((select total from public.docket_items where name = 'Roti'), 7::numeric, 'tweaked regular (5) kept: 5 + 2');
select is((select total from public.docket_items where name = 'Soup'), 2.5::numeric, 'soup = 1.5 + 1');

-- ── closed events ───────────────────────────────────────────────────────────
select public._act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
select throws_ok($$select public.set_availability('cccccccc-0000-0000-0000-0000000000a1', 'in')$$,
  'RSVPs are closed for this event', 'no RSVP after cutoff');
select throws_ok($$insert into public.event_entries (meal_id, user_id, item_id, amount) values
  ('cccccccc-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   '11111111-0000-0000-0000-0000000000a1', 1)$$, '42501', null, 'no entries after cutoff');

-- ── isolation ───────────────────────────────────────────────────────────────
select public._act_as('bbbbbbbb-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.meals), 0, 'other household sees no meals');
select is((select count(*)::int from public.event_entries), 0, 'other household sees no entries');
select is((select count(*)::int from public.items), 0, 'other household sees no items');

select * from finish();
rollback;
