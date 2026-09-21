-- Onboarding (create/join household), today's meals, and column-level write lockdown.

alter table public.households add column timezone text not null default 'Asia/Kolkata';

-- Role comes from sign-up metadata; only resident/cook are accepted.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as
$$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'cook'
         then 'cook'::public.user_role else 'resident'::public.user_role end
  );
  return new;
end;
$$;

-- Clients may only change what the UI needs; role/household changes go through RPCs.
revoke update on public.profiles from authenticated;
grant update (name, device_token) on public.profiles to authenticated;
revoke update on public.meals from authenticated;
grant update (menu_item_id) on public.meals to authenticated;
revoke update on public.rsvps from authenticated;
grant update (status) on public.rsvps to authenticated;

create function public.create_household(p_name text) returns public.households
language plpgsql security definer set search_path = '' as
$$
declare
  uid uuid := (select auth.uid());
  hh public.households;
begin
  if public.current_user_role() is distinct from 'resident' then
    raise exception 'only residents can create a household';
  end if;
  if public.current_household() is not null then
    raise exception 'already in a household';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'household name required';
  end if;

  insert into public.households (name) values (btrim(p_name)) returning * into hh;
  update public.profiles set household_id = hh.id where id = uid;
  insert into public.preferences (user_id) values (uid) on conflict do nothing;
  insert into public.inventory (household_id, name)
    select hh.id, n from unnest(array['Oil', 'Atta', 'Salt', 'Milk']) n;
  insert into public.menu_items (household_id, name)
    select hh.id, n from unnest(array['Dal Tadka', 'Rajma', 'Aloo Gobi', 'Paneer Butter Masala']) n;
  return hh;
end;
$$;

create function public.join_household(p_code text) returns uuid
language plpgsql security definer set search_path = '' as
$$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  if public.current_household() is not null then
    raise exception 'already in a household';
  end if;
  select id into hid from public.households where invite_code = lower(btrim(p_code));
  if hid is null then
    raise exception 'invalid invite code';
  end if;
  update public.profiles set household_id = hid where id = uid;
  if public.current_user_role() = 'resident' then
    insert into public.preferences (user_id) values (uid) on conflict do nothing;
  end if;
  return hid;
end;
$$;

-- Idempotent: today's lunch + dinner (household timezone), rotating picker, RSVPs default to "in".
create function public.ensure_todays_meals() returns setof public.meals
language plpgsql security definer set search_path = '' as
$$
declare
  hh public.households;
  today date;
  residents uuid[];
  picker uuid;
begin
  select * into hh from public.households where id = public.current_household();
  if hh.id is null then
    raise exception 'not in a household';
  end if;

  today := (now() at time zone hh.timezone)::date;
  select array_agg(id order by created_at, id) into residents
    from public.profiles where household_id = hh.id and role = 'resident';
  if residents is not null then
    picker := residents[1 + ((today - date '2020-01-01') % array_length(residents, 1))];
  end if;

  insert into public.meals (household_id, date, type, cutoff_at, picker_id)
  select hh.id, today, v.t, ((today + v.c) at time zone hh.timezone), picker
  from (values ('lunch'::public.meal_type, hh.lunch_cutoff),
               ('dinner'::public.meal_type, hh.dinner_cutoff)) v (t, c)
  on conflict (household_id, date, type) do nothing;

  insert into public.rsvps (meal_id, user_id)
  select m.id, p.id
  from public.meals m
  join public.profiles p on p.household_id = hh.id and p.role = 'resident'
  where m.household_id = hh.id and m.date = today
  on conflict do nothing;

  return query
    select * from public.meals where household_id = hh.id and date = today order by type;
end;
$$;

revoke all on function public.create_household(text), public.join_household(text),
  public.ensure_todays_meals() from public, anon;
grant execute on function public.create_household(text), public.join_household(text),
  public.ensure_todays_meals() to authenticated;
