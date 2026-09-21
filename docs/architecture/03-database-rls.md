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

## Onboarding & daily meals (migration `20260921120000_onboarding_and_meals.sql`)
Clients cannot change `role` or `household_id` directly: `update` on `profiles`, `meals` and `rsvps` is granted per column (`name, device_token` / `menu_item_id` / `status`). State changes go through `security definer` RPCs:

| RPC | Who | Effect |
| --- | --- | --- |
| `create_household(name)` | resident without a household | Creates household, joins it, seeds default inventory and menu bank |
| `join_household(code)` | anyone without a household | Joins by (case-insensitive) invite code |
| `ensure_todays_meals()` | household member | Idempotently creates today's lunch + dinner (household timezone, cutoffs from `households`), assigns the rotating picker, and defaults every resident's RSVP to `in` |

Sign-up passes `role` (`resident` | `cook`) in user metadata; `handle_new_user` accepts only those two values.

Post-cutoff RSVP writes fail with an RLS error (the `with check` on `rsvps_update_own`); clients treat both an error and a zero-row result as "locked".

## Known gaps
- Cook one-tap actions (`cook_events`), pantry ledger UI, preferences editor: not built yet.
- `lock-meals` cron (M6): meals are still `pending` after cutoff; RSVP locking currently relies on the policy's `now() < cutoff_at`.
- Email confirmation is off locally; decide for production (the register page already handles the confirm-email response).
