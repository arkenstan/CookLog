-- Multi-household membership, resident-created meal events, item catalog, regulars.
-- Supersedes: rotating picker, menu bank (menu_items), ensure_todays_meals, preference roti/rice columns.

alter type public.meal_type add value if not exists 'other';
create type public.item_kind as enum ('count', 'portion');
create type public.entry_source as enum ('regular', 'manual');

-- ── Households: membership + active household ────────────────────────────────
create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index on public.household_members (user_id);

insert into public.household_members (household_id, user_id)
select household_id, id from public.profiles where household_id is not null;

-- profiles.household_id becomes "the household the UI is currently showing".
alter table public.profiles rename column household_id to active_household_id;

create or replace function public.current_household() returns uuid
language sql stable security definer set search_path = '' as
$$
  select p.active_household_id
  from public.profiles p
  where p.id = (select auth.uid())
    and exists (select 1 from public.household_members m
                where m.user_id = p.id and m.household_id = p.active_household_id)
$$;

create function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.household_members
                  where household_id = hid and user_id = (select auth.uid())) $$;

create function public.shares_household(uid uuid) returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.household_members a
                  join public.household_members b on b.household_id = a.household_id
                  where a.user_id = (select auth.uid()) and b.user_id = uid) $$;

revoke all on function public.is_member(uuid), public.shares_household(uuid) from public, anon;
grant execute on function public.is_member(uuid), public.shares_household(uuid) to authenticated;

alter table public.household_members enable row level security;
create policy members_select on public.household_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_member(household_id));

drop policy households_select on public.households;
create policy households_select on public.households for select to authenticated
  using (public.is_member(id));

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_household(id));

drop policy preferences_select on public.preferences;
create policy preferences_select on public.preferences for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_household(user_id));

-- ── Retire the daily-meal model ──────────────────────────────────────────────
drop view public.daily_kitchen_docket;
drop function public.ensure_todays_meals();
drop policy meals_update_picker on public.meals;
drop policy rsvps_insert_own on public.rsvps;
drop policy rsvps_update_own on public.rsvps;

alter table public.meals
  add column title text not null default '',
  add column created_by uuid references public.profiles (id) on delete set null,
  add column starts_at timestamptz,
  drop column picker_id,
  drop column menu_item_id;  -- also drops unique(household_id, date, type) with `date` below
update public.meals set starts_at = cutoff_at, title = initcap(type::text);
alter table public.meals
  drop column date,
  alter column starts_at set not null,
  add constraint meals_cutoff_before_start check (cutoff_at <= starts_at);

drop table public.menu_items;
alter table public.preferences drop column roti_count, drop column rice_portion;

-- ── Items, regulars, entries ─────────────────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  kind public.item_kind not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index items_household_name_key on public.items (household_id, lower(name));

create table public.regulars (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  amount numeric(6, 1) not null check (amount > 0 and amount <= 100),
  primary key (user_id, item_id)
);

create table public.event_entries (
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  amount numeric(6, 1) not null check (amount > 0 and amount <= 100),
  source public.entry_source not null default 'manual',
  primary key (meal_id, user_id, item_id)
);
create index on public.event_entries (user_id);

-- count => whole units; portion => steps of 0.5
create function public.validate_amount() returns trigger
language plpgsql security definer set search_path = '' as
$$
declare k public.item_kind;
begin
  select kind into k from public.items where id = new.item_id;
  if k = 'count' and new.amount <> trunc(new.amount) then
    raise exception 'count items must be whole numbers';
  elsif k = 'portion' and (new.amount * 2) <> trunc(new.amount * 2) then
    raise exception 'portions must be in steps of 0.5';
  end if;
  return new;
end;
$$;
create trigger regulars_validate before insert or update on public.regulars
  for each row execute function public.validate_amount();
create trigger entries_validate before insert or update on public.event_entries
  for each row execute function public.validate_amount();

alter table public.items enable row level security;
alter table public.regulars enable row level security;
alter table public.event_entries enable row level security;

create policy items_select on public.items for select to authenticated
  using (household_id = public.current_household());
create policy items_insert on public.items for insert to authenticated
  with check (household_id = public.current_household()
              and created_by = (select auth.uid())
              and public.current_user_role() = 'resident');

create policy regulars_select_own on public.regulars for select to authenticated
  using (user_id = (select auth.uid()));
create policy regulars_insert_own on public.regulars for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.items i
                          where i.id = item_id and i.household_id = public.current_household()));
create policy regulars_update_own on public.regulars for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy regulars_delete_own on public.regulars for delete to authenticated
  using (user_id = (select auth.uid()));

create policy entries_select on public.event_entries for select to authenticated
  using (exists (select 1 from public.meals m
                 where m.id = meal_id and m.household_id = public.current_household()));
create policy entries_insert_own on public.event_entries for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_user_role() = 'resident'
    and exists (select 1 from public.meals m join public.items i on i.household_id = m.household_id
                where m.id = meal_id and i.id = item_id
                  and m.household_id = public.current_household()
                  and m.status = 'pending' and now() < m.cutoff_at)
  );
create policy entries_update_own on public.event_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.meals m
                          where m.id = meal_id and m.status = 'pending' and now() < m.cutoff_at));
create policy entries_delete_own on public.event_entries for delete to authenticated
  using (user_id = (select auth.uid())
         and exists (select 1 from public.meals m
                     where m.id = meal_id and m.status = 'pending' and now() < m.cutoff_at));

-- ── RPCs ─────────────────────────────────────────────────────────────────────
create or replace function public.create_household(p_name text) returns public.households
language plpgsql security definer set search_path = '' as
$$
declare
  uid uuid := (select auth.uid());
  hh public.households;
begin
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
  insert into public.inventory (household_id, name)
    select hh.id, n from unnest(array['Oil', 'Atta', 'Salt', 'Milk']) n;
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

create function public.set_active_household(p_household uuid) returns void
language plpgsql security definer set search_path = '' as
$$
begin
  if not public.is_member(p_household) then
    raise exception 'not a member of this household';
  end if;
  update public.profiles set active_household_id = p_household where id = (select auth.uid());
end;
$$;

-- Internal: copy a resident's regulars into an event (never overwrites existing entries).
create function public.apply_regulars(p_meal uuid, p_user uuid) returns void
language sql security definer set search_path = '' as
$$
  insert into public.event_entries (meal_id, user_id, item_id, amount, source)
  select m.id, p_user, r.item_id, r.amount, 'regular'
  from public.meals m
  join public.regulars r on r.user_id = p_user
  join public.items i on i.id = r.item_id and i.household_id = m.household_id
  where m.id = p_meal
  on conflict do nothing
$$;

create function public.create_meal_event(
  p_title text, p_type public.meal_type, p_starts_at timestamptz, p_cutoff_at timestamptz
) returns public.meals
language plpgsql security definer set search_path = '' as
$$
declare
  hid uuid := public.current_household();
  ev public.meals;
  member record;
begin
  if public.current_user_role() is distinct from 'resident' then
    raise exception 'only residents can create meal events';
  end if;
  if hid is null then
    raise exception 'no active household';
  end if;
  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'title required';
  end if;
  if p_cutoff_at > p_starts_at then
    raise exception 'RSVP cutoff must be before the meal starts';
  end if;

  insert into public.meals (household_id, created_by, title, type, starts_at, cutoff_at)
  values (hid, (select auth.uid()), btrim(p_title), p_type, p_starts_at, p_cutoff_at)
  returning * into ev;

  -- Everyone defaults to "in" (PRD), with their regulars pre-filled.
  for member in
    select m.user_id from public.household_members m
    join public.profiles p on p.id = m.user_id
    where m.household_id = hid and p.role = 'resident'
  loop
    insert into public.rsvps (meal_id, user_id) values (ev.id, member.user_id);
    perform public.apply_regulars(ev.id, member.user_id);
  end loop;
  return ev;
end;
$$;

create function public.set_availability(p_meal uuid, p_status public.rsvp_status) returns void
language plpgsql security definer set search_path = '' as
$$
declare
  uid uuid := (select auth.uid());
  ev public.meals;
begin
  if public.current_user_role() is distinct from 'resident' then
    raise exception 'only residents can set availability';
  end if;
  select * into ev from public.meals where id = p_meal and household_id = public.current_household();
  if ev.id is null then
    raise exception 'event not found';
  end if;
  if ev.status <> 'pending' or now() >= ev.cutoff_at then
    raise exception 'RSVPs are closed for this event';
  end if;

  insert into public.rsvps (meal_id, user_id, status) values (p_meal, uid, p_status)
    on conflict (meal_id, user_id) do update set status = excluded.status;
  if p_status = 'in' then
    perform public.apply_regulars(p_meal, uid);
  end if;
end;
$$;

revoke all on function public.create_household(text), public.join_household(text),
  public.set_active_household(uuid), public.apply_regulars(uuid, uuid),
  public.create_meal_event(text, public.meal_type, timestamptz, timestamptz),
  public.set_availability(uuid, public.rsvp_status), public.validate_amount()
  from public, anon, authenticated;
grant execute on function public.create_household(text), public.join_household(text),
  public.set_active_household(uuid),
  public.create_meal_event(text, public.meal_type, timestamptz, timestamptz),
  public.set_availability(uuid, public.rsvp_status) to authenticated;

-- ── Docket views (caller's RLS applies) ──────────────────────────────────────
create view public.daily_kitchen_docket with (security_invoker = true) as
select
  m.id as meal_id, m.household_id, m.title, m.type, m.starts_at, m.cutoff_at, m.status,
  count(r.user_id) filter (where r.status = 'in') as people_in,
  coalesce((
    select array_agg(distinct a)
    from public.rsvps r2
    join public.preferences p2 on p2.user_id = r2.user_id
    cross join lateral unnest(p2.allergies) a
    where r2.meal_id = m.id and r2.status = 'in'
  ), '{}') as allergies
from public.meals m
left join public.rsvps r on r.meal_id = m.id
group by m.id;

create view public.docket_items with (security_invoker = true) as
select
  e.meal_id, m.household_id, i.id as item_id, i.name, i.kind,
  sum(e.amount) as total, count(*) as contributors
from public.event_entries e
join public.rsvps r on r.meal_id = e.meal_id and r.user_id = e.user_id and r.status = 'in'
join public.meals m on m.id = e.meal_id
join public.items i on i.id = e.item_id
group by e.meal_id, m.household_id, i.id, i.name, i.kind;

-- ── Privileges: nothing for anon; authenticated gets only what the UI needs ──
revoke all on all tables in schema public from anon;
revoke insert, update on public.meals from authenticated;
revoke insert, update on public.rsvps from authenticated;
revoke insert, update, delete on public.household_members from authenticated;
revoke all on public.items, public.regulars, public.event_entries from authenticated;
grant select, insert on public.items to authenticated;
grant select, insert, update (amount), delete on public.regulars to authenticated;
grant select, insert, update (amount), delete on public.event_entries to authenticated;
grant select on public.daily_kitchen_docket, public.docket_items to authenticated;

alter publication supabase_realtime add table public.event_entries, public.items;
