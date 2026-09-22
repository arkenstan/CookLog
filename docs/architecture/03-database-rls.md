# 3. Database & RLS Blueprint

Source of truth: [`supabase/migrations/`](../../supabase/migrations). Tests: [`supabase/tests/`](../../supabase/tests) (pgTAP, `pnpm db:test`).

## Model
```
households 1─* household_members *─1 profiles (role resident|cook; active_household_id)
households 1─* items (kind count|portion)
profiles   1─* regulars *─1 items                 (my default amounts)
households 1─* meals  (a "meal event": title, type, starts_at, cutoff_at, status)
meals      1─* rsvps (meal_id, user_id, in|out)
meals      1─* event_entries (meal_id, user_id, item_id, amount, source regular|manual)
meals      1─* cook_events        households 1─* inventory
```
- **Multi-household.** A user can belong to many households (`household_members`). `profiles.active_household_id` is the one the UI shows. `current_household()` returns it (validated against membership), and nearly every policy is "row belongs to my active household". Switching = `set_active_household(id)`; no client can write the column directly. Role is account-level (`profiles.role`).
- **Items.** `count` = whole units (roti, bread; +1 per step). `portion` = servings in 0.5 steps (soup, dal, rice). A trigger (`validate_amount`) enforces this on `regulars` and `event_entries`; amounts are `numeric(6,1)`, > 0 and ≤ 100.
- **Regulars** are per resident and apply to items of the household they are in. They are copied into an event as `source = 'regular'` entries when the resident is In (never overwriting an existing entry, so per-event tweaks survive Out → In).

## Policy matrix (`authenticated` only; `anon` has nothing)
| Table | Resident | Cook |
| --- | --- | --- |
| `households` | select those I belong to | same |
| `household_members` | select my rows + members of households I'm in; no writes | same |
| `profiles` | select self + housemates; update `name`, `device_token` only | same |
| `preferences` | select self + housemates; insert/update self | select housemates (allergies for docket) |
| `items` | select active household; insert (as self) | select |
| `regulars` | select/insert/update(`amount`)/delete **own** rows | — |
| `meals` | select active household; **no direct writes** | select |
| `rsvps` | select active household; **no direct writes** (RPC) | select |
| `event_entries` | select active household; insert/update(`amount`)/delete **own** rows while meal is `pending` and before cutoff | select |
| `inventory` | select; insert (as self); update(`status`, `note`); delete — all active-household | same as resident (shared pantry: the cook marks items missing) |
| `cook_events` | select | select, insert |

Column-level grants back this up (e.g. `update (amount)` only), so a policy mistake cannot widen writable columns.

## RPCs (`security definer`, `search_path = ''`, `authenticated` only)
| RPC | Effect |
| --- | --- |
| `create_household(name)` | Residents only. Creates household, membership, sets active, seeds catalog (Roti, Bread = count; Rice, Dal, Soup = portion) and the pantry (Oil, Atta, Salt, Milk, authored by the creator) |
| `join_household(code)` | Adds membership by (case-insensitive) invite code and makes it active |
| `set_active_household(id)` | Must be a member |
| `create_meal_event(title, type, starts_at, cutoff_at)` | Residents only, `cutoff_at <= starts_at`. Creates the event; every resident member gets an `in` RSVP and their regulars |
| `set_availability(meal, status)` | Residents only; event must be pending and before cutoff. Upserts own RSVP; `in` re-applies regulars |
| `apply_regulars(meal, user)` | Internal (not granted to clients) |

Post-cutoff writes fail: RPCs raise `RSVPs are closed for this event`; direct entry writes fail with an RLS error. Clients treat an error and a zero-row result the same way ("locked") and roll back.

## Docket views (`security_invoker = true`, caller's RLS applies)
- `daily_kitchen_docket`: per event `people_in` and merged `allergies` of residents who are In. (Name kept from the original design; it now lists events.)
- `docket_items`: per event and item, `total` = sum of entries of residents who are **In**, plus `contributors`. Count totals are pieces, portion totals are servings.

## Realtime
`meals`, `rsvps`, `inventory`, `cook_events`, `event_entries`, `items` are in the `supabase_realtime` publication. Events are filtered by RLS, so a user only receives their active household's changes.

## Superseded from the first design
The daily auto-created lunch/dinner, the rotating menu picker and menu bank (`menu_items`), `ensure_todays_meals`, and `preferences.roti_count/rice_portion` were replaced by resident-created events, items and regulars.

## Known gaps
- Cook one-tap actions (`cook_events` UI) and the allergies editor: not built yet.
- The cook's screen is still read-only: cook availability per event, cook-created events and the
  missing-ingredient grid are designed but unbuilt (see `decisions.md`, D5-D7).
- Nothing marks events `locked` / `cooked` yet; locking relies on `cutoff_at`, and "completed" is otherwise date-based.
- Event phases use the browser's timezone; `households.timezone` is unused for meals.
- No way to edit/cancel an event, remove a member, or leave a household yet.
- Email confirmation is off locally; decide for production (the register page already handles the confirm-email response).
