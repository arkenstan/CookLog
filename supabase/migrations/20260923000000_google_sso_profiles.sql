-- Google SSO is the only sign-up path, and a profile is a username + a role.
--
-- `profiles.name` held a free-text display name copied out of sign-up metadata. It is
-- renamed to `username`: one unique, case-insensitively distinct identity that is also
-- what the UI renders. NULL means "this user has not completed setup yet" -- it is the
-- only signal for that, which is why `role` keeps its NOT NULL default.
--
-- Nothing personal is stored in the `public` schema any more: `handle_new_user` stops
-- reading `raw_user_meta_data` entirely. GoTrue's `auth` schema is deliberately left
-- alone -- email is its identity key and not ours to remove.

alter table public.profiles rename column name to username;
alter table public.profiles
  alter column username drop not null,
  alter column username drop default;

-- Legacy values came from `raw_user_meta_data ->> 'name'`, so they can contain spaces
-- ('Asha Kumar') or collide case-insensitively. Clear anything the new rules reject
-- before the constraint and the index go on, and keep only the earliest claimant.
update public.profiles set username = null
 where username !~ '^[A-Za-z0-9_]{3,20}$';
update public.profiles p set username = null
 where username is not null
   and exists (select 1 from public.profiles q
               where lower(q.username) = lower(p.username)
                 and (q.created_at, q.id) < (p.created_at, p.id));

alter table public.profiles
  add constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$');
create unique index profiles_username_lower_key on public.profiles (lower(username));

-- Column ACLs are keyed by attnum, so the rename carried `update (name)` over as
-- `update (username)`, and a table-level revoke does not touch column grants. Drop it
-- explicitly: the username is set once, by complete_profile, and never again.
revoke update on public.profiles from authenticated;
revoke update (username, device_token) on public.profiles from authenticated;
grant update (device_token) on public.profiles to authenticated;

-- The trigger no longer trusts (or even reads) the identity provider's metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as
$$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

-- Sets the username and role exactly once. Both are written together so there is never
-- a state where one is chosen and the other is not.
create function public.complete_profile(p_username text, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as
$$
declare
  uid uuid := (select auth.uid());
  v text := btrim(coalesce(p_username, ''));
  existing text;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if v !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Pick a username of 3-20 letters, numbers or underscores';
  end if;

  -- FOUND distinguishes "no profile row" from "row exists, username still NULL".
  select username into existing from public.profiles where id = uid;
  if not found then
    raise exception 'profile not found';
  end if;
  if existing is not null then
    raise exception 'username already set';
  end if;

  begin
    update public.profiles set username = v, role = p_role where id = uid;
  exception when unique_violation then
    raise exception 'That username is taken';
  end;
end;
$$;

-- A user with no username still has the default 'resident' role, so the household RPCs
-- have to refuse them server-side -- the route guard is not the only caller that matters.
create or replace function public.create_household(p_name text) returns public.households
language plpgsql security definer set search_path = '' as
$$
declare
  uid uuid := (select auth.uid());
  hh public.households;
begin
  if (select username from public.profiles where id = uid) is null then
    raise exception 'complete your profile first';
  end if;
  if public.current_user_role() is distinct from 'resident' then
    raise exception 'only residents can create a household';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'household name required';
  end if;

  insert into public.households (name) values (btrim(p_name)) returning * into hh;
  insert into public.household_members (household_id, user_id) values (hh.id, uid);
  update public.profiles set active_household_id = hh.id where id = uid;
  insert into public.preferences (user_id) values (uid) on conflict do nothing;
  insert into public.inventory (household_id, name, added_by)
    select hh.id, n, uid from unnest(array['Oil', 'Atta', 'Salt', 'Milk']) n;
  insert into public.items (household_id, name, kind, created_by) values
    (hh.id, 'Roti', 'count', uid), (hh.id, 'Bread', 'count', uid),
    (hh.id, 'Rice', 'portion', uid), (hh.id, 'Dal', 'portion', uid), (hh.id, 'Soup', 'portion', uid);
  return hh;
end;
$$;

create or replace function public.join_household(p_code text) returns uuid
language plpgsql security definer set search_path = '' as
$$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  if (select username from public.profiles where id = uid) is null then
    raise exception 'complete your profile first';
  end if;
  select id into hid from public.households where invite_code = lower(btrim(p_code));
  if hid is null then
    raise exception 'invalid invite code';
  end if;
  insert into public.household_members (household_id, user_id) values (hid, uid)
    on conflict do nothing;
  update public.profiles set active_household_id = hid where id = uid;
  if public.current_user_role() = 'resident' then
    insert into public.preferences (user_id) values (uid) on conflict do nothing;
  end if;
  return hid;
end;
$$;

revoke all on function public.complete_profile(text, public.user_role),
  public.create_household(text), public.join_household(text) from public, anon, authenticated;
grant execute on function public.complete_profile(text, public.user_role),
  public.create_household(text), public.join_household(text) to authenticated;
