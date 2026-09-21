-- Local dev seed: one household, two residents, one cook. Password for all: password123
insert into public.households (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Flat 3B');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
       crypt('password123', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', name), now(), now(),
       '', '', '', ''
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'asha@example.com', 'Asha'),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'ben@example.com', 'Ben'),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'cook@example.com', 'Lakshmi')
) as u (id, email, name);

update public.profiles set household_id = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'cook' where id = 'aaaaaaaa-0000-0000-0000-000000000003';

insert into public.preferences (user_id, roti_count, rice_portion) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 4, 1),
  ('aaaaaaaa-0000-0000-0000-000000000002', 2, 0.5);

insert into public.menu_items (household_id, name)
select '11111111-1111-1111-1111-111111111111', n
from unnest(array['Dal Tadka', 'Paneer Butter Masala', 'Aloo Gobi', 'Rajma']) n;

insert into public.inventory (household_id, name)
select '11111111-1111-1111-1111-111111111111', n
from unnest(array['Oil', 'Atta', 'Salt', 'Milk']) n;
