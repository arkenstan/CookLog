-- Shared pantry ledger: make the dormant `inventory` table a real grocery list.
-- Any household member (resident or cook) may add, flip stocked/missing, or remove a row —
-- the PRD flow is "cook marks an ingredient missing -> it appears on the residents' list".

alter table public.inventory
  add column added_by   uuid references public.profiles (id) on delete set null,
  add column note       text,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

alter table public.inventory add constraint inventory_name_not_blank check (btrim(name) <> '');

-- One row per ingredient per household, case-insensitively (mirrors items_household_name_key).
create unique index inventory_household_name_key on public.inventory (household_id, lower(name));
create index on public.inventory (household_id, status);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as
$$ begin new.updated_at := now(); return new; end; $$;

create trigger inventory_touch before update on public.inventory
  for each row execute function public.touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- `inventory_select` and `inventory_update` already exist and are household-scoped.
-- Insert and delete had no policy at all, so both were blocked despite the table grant.
create policy inventory_insert on public.inventory for insert to authenticated
  with check (household_id = public.current_household()
              and added_by = (select auth.uid()));

create policy inventory_delete on public.inventory for delete to authenticated
  using (household_id = public.current_household());

-- ── Privileges: clients touch only the columns the UI needs ──────────────────
revoke insert, update on public.inventory from authenticated;
grant insert (household_id, name, status, added_by, note) on public.inventory to authenticated;
grant update (status, note) on public.inventory to authenticated;
grant delete on public.inventory to authenticated;

-- Seeded pantry rows should name their author like any other row.
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
  insert into public.inventory (household_id, name, added_by)
    select hh.id, n, uid from unnest(array['Oil', 'Atta', 'Salt', 'Milk']) n;
  insert into public.items (household_id, name, kind, created_by) values
    (hh.id, 'Roti', 'count', uid), (hh.id, 'Bread', 'count', uid),
    (hh.id, 'Rice', 'portion', uid), (hh.id, 'Dal', 'portion', uid), (hh.id, 'Soup', 'portion', uid);
  return hh;
end;
$$;

revoke all on function public.create_household(text), public.touch_updated_at() from public, anon;
grant execute on function public.create_household(text) to authenticated;

-- `inventory` is already in the supabase_realtime publication (migration 1).
