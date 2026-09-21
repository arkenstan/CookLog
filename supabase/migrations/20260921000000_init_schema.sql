-- CookLog initial schema: multi-household, RLS everywhere.

create type public.user_role as enum ('resident', 'cook');
create type public.meal_type as enum ('lunch', 'dinner');
create type public.meal_status as enum ('pending', 'locked', 'cooked');
create type public.rsvp_status as enum ('in', 'out');
create type public.stock_status as enum ('stocked', 'missing');
create type public.cook_event_kind as enum ('arriving', 'ready', 'cannot_make');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  lunch_cutoff time not null default '09:00',
  dinner_cutoff time not null default '16:00',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  name text not null default '',
  role public.user_role not null default 'resident',
  device_token text,
  created_at timestamptz not null default now()
);
create index on public.profiles (household_id);

create table public.preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  roti_count int not null default 2 check (roti_count >= 0),
  rice_portion numeric(3, 1) not null default 1 check (rice_portion >= 0),
  allergies text[] not null default '{}'
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null
);
create index on public.menu_items (household_id);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  type public.meal_type not null,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  picker_id uuid references public.profiles (id) on delete set null,
  status public.meal_status not null default 'pending',
  cutoff_at timestamptz not null,
  unique (household_id, date, type)
);

create table public.rsvps (
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null default 'in',
  primary key (meal_id, user_id)
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  status public.stock_status not null default 'stocked'
);
create index on public.inventory (household_id);

create table public.cook_events (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  kind public.cook_event_kind not null,
  created_at timestamptz not null default now()
);

-- Helpers: security definer so policies on profiles don't recurse.
create function public.current_household() returns uuid
language sql stable security definer set search_path = '' as
$$ select household_id from public.profiles where id = (select auth.uid()) $$;

create function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = '' as
$$ select role from public.profiles where id = (select auth.uid()) $$;

revoke all on function public.current_household(), public.current_user_role() from public, anon;
grant execute on function public.current_household(), public.current_user_role() to authenticated;

-- Auto-create a profile for each new auth user.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as
$$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Docket: totals for people marked "in". security_invoker => caller's RLS applies.
create view public.daily_kitchen_docket with (security_invoker = true) as
select
  m.id as meal_id,
  m.household_id,
  m.date,
  m.type,
  m.status,
  mi.name as menu_item,
  count(r.user_id) filter (where r.status = 'in') as people_in,
  coalesce(sum(p.roti_count) filter (where r.status = 'in'), 0) as total_rotis,
  coalesce(sum(p.rice_portion) filter (where r.status = 'in'), 0) as total_rice_portions,
  coalesce((
    select array_agg(distinct a)
    from public.rsvps r2
    join public.preferences p2 on p2.user_id = r2.user_id
    cross join lateral unnest(p2.allergies) a
    where r2.meal_id = m.id and r2.status = 'in'
  ), '{}') as allergies
from public.meals m
left join public.menu_items mi on mi.id = m.menu_item_id
left join public.rsvps r on r.meal_id = m.id
left join public.preferences p on p.user_id = r.user_id
group by m.id, mi.name;

-- Row Level Security
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.menu_items enable row level security;
alter table public.meals enable row level security;
alter table public.rsvps enable row level security;
alter table public.inventory enable row level security;
alter table public.cook_events enable row level security;

create policy households_select on public.households for select to authenticated
  using (id = public.current_household());

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or household_id = public.current_household());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Preferences: own row rw; household members (incl. cook) can read for the docket.
create policy preferences_select on public.preferences for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = user_id and p.household_id = public.current_household()));
create policy preferences_insert_own on public.preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy preferences_update_own on public.preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy menu_items_select on public.menu_items for select to authenticated
  using (household_id = public.current_household());

create policy meals_select on public.meals for select to authenticated
  using (household_id = public.current_household());
-- The day's picker chooses the menu while the meal is pending.
create policy meals_update_picker on public.meals for update to authenticated
  using (picker_id = (select auth.uid()) and status = 'pending')
  with check (picker_id = (select auth.uid()) and status = 'pending');

create policy rsvps_select on public.rsvps for select to authenticated
  using (exists (select 1 from public.meals m
                 where m.id = meal_id and m.household_id = public.current_household()));
-- Residents write only their own RSVP, before cutoff, on a pending meal.
create policy rsvps_insert_own on public.rsvps for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_user_role() = 'resident'
    and exists (select 1 from public.meals m
                where m.id = meal_id and m.status = 'pending' and now() < m.cutoff_at
                  and m.household_id = public.current_household())
  );
create policy rsvps_update_own on public.rsvps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.meals m
                where m.id = meal_id and m.status = 'pending' and now() < m.cutoff_at)
  );

create policy inventory_select on public.inventory for select to authenticated
  using (household_id = public.current_household());
create policy inventory_update on public.inventory for update to authenticated
  using (household_id = public.current_household())
  with check (household_id = public.current_household());

create policy cook_events_select on public.cook_events for select to authenticated
  using (exists (select 1 from public.meals m
                 where m.id = meal_id and m.household_id = public.current_household()));
create policy cook_events_insert_cook on public.cook_events for insert to authenticated
  with check (
    public.current_user_role() = 'cook'
    and exists (select 1 from public.meals m
                where m.id = meal_id and m.household_id = public.current_household())
  );

-- Nothing for anon; authenticated gets table privileges, RLS does the filtering.
revoke all on all tables in schema public from anon;
grant select, insert, update on all tables in schema public to authenticated;

-- Realtime
alter publication supabase_realtime add table
  public.meals, public.rsvps, public.inventory, public.cook_events;
