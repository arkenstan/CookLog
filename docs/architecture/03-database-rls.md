# 3. Database & RLS Blueprint

Source of truth: [`supabase/migrations/20260921000000_init_schema.sql`](../../supabase/migrations/20260921000000_init_schema.sql). Tests: [`supabase/tests/rls.test.sql`](../../supabase/tests/rls.test.sql) (pgTAP, `pnpm db:test`).

## Multi-household scoping
The PRD models one flat household; every table here is scoped by `household_id` (directly or via `meals`) so RLS can be expressed as "same household as the caller".

```
households 1─* profiles (id = auth.users.id, role resident|cook)
profiles   1─1 preferences
households 1─* menu_items, meals, inventory
meals      1─* rsvps (meal_id, user_id), cook_events
```

## Helpers
`current_household()` and `current_user_role()` are `security definer` with `search_path = ''`, so policies on `profiles` do not recurse. Executable by `authenticated` only.

## Policy matrix (`authenticated` only; `anon` has nothing)
| Table | Resident | Cook |
| --- | --- | --- |
| `households` | select own | select own |
| `profiles` | select household; update self | select household; update self |
| `preferences` | select household; insert/update self | select household (feeds docket) |
| `menu_items` | select | select |
| `meals` | select; update menu if today's `picker_id` and pending | select |
| `rsvps` | select household; insert/update **self**, meal pending and `now() < cutoff_at` | select; **no write** |
| `inventory` | select, update | select, update (mark missing) |
| `cook_events` | select | select, insert |

Deviation from the HLD ("cook read-only on the view"): the cook can read `preferences` and `rsvps` rows because the docket view runs with `security_invoker = true`, so the caller's RLS applies to the underlying tables. This prevents the classic view-bypasses-RLS leak. If per-row exposure to the cook is unwanted, switch the view to `security definer` semantics behind an RPC.

## View
`daily_kitchen_docket`: per meal, `people_in`, `total_rotis`, `total_rice_portions`, `allergies` for residents marked `in`. RSVPs default to "in" (the client upserts `in` rows when a meal is created; a `lock-meals` function will backfill).

## Realtime & server logic
`meals`, `rsvps`, `inventory`, `cook_events` are in the `supabase_realtime` publication. Planned Edge Functions (M6): `lock-meals` (pg_cron at cutoff), `notify` (DB webhook on `inventory → missing` and `cook_events`).

## Known gaps (tracked for M2)
- Household creation and invite-code join need an RPC (no direct insert policy on `households` or update of `profiles.household_id`).
- Meal creation and picker rotation need a `security definer` function or cron.
- `profiles_update_own` currently lets a user change their own `role` and `household_id`; add a column guard (trigger) before shipping.
