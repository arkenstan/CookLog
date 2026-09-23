-- Local dev seed: one household, two residents, one cook.
--
-- Production signs in with Google only. These three keep a password so there is a way in
-- without Google credentials on a local stack -- the login page shows that form only when
-- `!environment.production`. To exercise the real flow instead, sign in with Google and
-- join this household with invite code `flat3b`.
insert into public.households (id, name, invite_code) values
  ('11111111-1111-1111-1111-111111111111', 'Flat 3B', 'flat3b');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
       crypt('password123', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', now(), now(),
       '', '', '', ''
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'asha@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'ben@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'cook@example.com')
) as u (id, email);

-- The trigger creates bare profiles (no username, default role); setup normally happens
-- through complete_profile, so the seed does it directly.
update public.profiles p set username = v.username, role = v.role::public.user_role,
                             active_household_id = '11111111-1111-1111-1111-111111111111'
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'Asha', 'resident'),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'Ben', 'resident'),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'Lakshmi', 'cook')
) as v (id, username, role)
where p.id = v.id;

insert into public.household_members (household_id, user_id)
select '11111111-1111-1111-1111-111111111111', id from public.profiles
where id in ('aaaaaaaa-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000002',
             'aaaaaaaa-0000-0000-0000-000000000003');
insert into public.preferences (user_id)
select id from public.profiles where role = 'resident';

insert into public.inventory (household_id, name)
select '11111111-1111-1111-1111-111111111111', n from unnest(array['Oil', 'Atta', 'Salt', 'Milk']) n;

insert into public.items (id, household_id, name, kind) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Roti', 'count'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Bread', 'count'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Rice', 'portion'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Dal', 'portion'),
  ('bbbbbbbb-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Soup', 'portion');

insert into public.regulars (user_id, item_id, amount) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 1),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 2),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', 0.5);

-- A sample dinner that is still open when the DB is reset.
with ev as (
  insert into public.meals (household_id, created_by, title, type, starts_at, cutoff_at)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001',
          'Dinner', 'dinner', now() + interval '5 hours', now() + interval '2 hours')
  returning id
), r as (
  insert into public.rsvps (meal_id, user_id)
  select ev.id, p.id from ev, public.profiles p where p.role = 'resident'
  returning meal_id, user_id
)
select public.apply_regulars(meal_id, user_id) from r;
