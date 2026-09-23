-- complete_profile: the one-time username + role step that replaces sign-up metadata.
begin;
select no_plan();

create function public._act_as(uid uuid) returns text language sql as
$$ select set_config('request.jwt.claims', json_build_object('sub', $1, 'role', 'authenticated')::text, true) $$;

-- Metadata is hostile on purpose: nothing here may reach public.profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a1@t.dev', '{"name":"Evil","role":"cook"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'a2@t.dev', '{}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', 'a3@t.dev', '{}');
insert into public.households (id, name, invite_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'H', 'abc123');

select is((select username from public.profiles where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  null, 'the trigger stores no name from provider metadata');
select is((select role::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  'resident', 'the trigger ignores a role in provider metadata');

set local role authenticated;

-- ── Happy path ───────────────────────────────────────────────────────────────
select public._act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
select lives_ok($$select public.complete_profile('  Zara  ', 'resident')$$, 'username and role are set');
select is((select username from public.profiles where id = (select auth.uid())),
  'Zara', 'username is trimmed and stored as typed');
select is((select role::text from public.profiles where id = (select auth.uid())),
  'resident', 'role is set from the argument');
select throws_ok($$select public.complete_profile('Zara2', 'cook')$$,
  'username already set', 'the username can only be set once');

-- ── Uniqueness and format ────────────────────────────────────────────────────
select public._act_as('aaaaaaaa-0000-0000-0000-0000000000a2');
select throws_ok($$select public.complete_profile('zara', 'resident')$$,
  'That username is taken', 'usernames collide case-insensitively');
select throws_ok($$select public.complete_profile('ab', 'resident')$$,
  'Pick a username of 3-20 letters, numbers or underscores', 'too short is rejected');
select throws_ok($$select public.complete_profile('aaaaaaaaaaaaaaaaaaaaa', 'resident')$$,
  'Pick a username of 3-20 letters, numbers or underscores', 'too long is rejected');
select throws_ok($$select public.complete_profile('as ha', 'resident')$$,
  'Pick a username of 3-20 letters, numbers or underscores', 'spaces are rejected');
select throws_ok($$select public.complete_profile('as.ha', 'resident')$$,
  'Pick a username of 3-20 letters, numbers or underscores', 'punctuation is rejected');

-- ── The column grant does not survive the rename ─────────────────────────────
select throws_ok($$update public.profiles set username = 'sneaky' where id = (select auth.uid())$$,
  '42501', null, 'username cannot be written directly (RPC only)');

-- ── Household RPCs refuse an incomplete profile ──────────────────────────────
select throws_ok($$select public.create_household('X')$$,
  'complete your profile first', 'cannot create a household before picking a username');
select throws_ok($$select public.join_household('abc123')$$,
  'complete your profile first', 'cannot join a household before picking a username');

-- ── Cook role, then anon ─────────────────────────────────────────────────────
select public._act_as('aaaaaaaa-0000-0000-0000-0000000000a3');
select lives_ok($$select public.complete_profile('Zuri', 'cook')$$, 'a cook can complete a profile');
select is((select role::text from public.profiles where id = (select auth.uid())),
  'cook', 'the cook role is stored');

set local role anon;
select throws_ok($$select public.complete_profile('Someone', 'resident')$$,
  '42501', null, 'anon cannot execute complete_profile');

select * from finish();
rollback;
