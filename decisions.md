# Decisions

Engineering decision log. Newest session first.

---

## 2026-09-22 — Resident a11y + shell restructure, grocery list, cook dashboard design

**Scope.** Restructure the resident shell (more-menu, mobile bottom nav, FAB), fix the
accessibility defects that block keyboard and screen-reader use, build the household
grocery list on the dormant `inventory` table, and design — but not build — write access
for the cook.

**Status.** The resident-facing pass is **built and verified**: 66 pgTAP assertions and
89 Vitest tests pass, `pnpm gen:types` is idempotent against the live schema, and the web
bundle builds. Decisions marked `accepted` are implemented; `proposed` ones belong to the
cook dashboard pass and are design intent only — no code exists for them yet.

### D1 — Cook "attendance" means the cook's own availability

- **Decision:** A cook marks their own availability for a meal event ("can I cook this?").
  It is independent of resident RSVPs and must never contribute to the `people_in`
  head-count.
- **Status:** `accepted` — **user requirement**, not an implementation choice.
- **Reason:** The cook needs to tell the household they cannot make a shift. That is a
  different fact from a resident saying they will not eat, and conflating the two corrupts
  the number the cook cooks for.
- **Alternatives considered:**
  - *Proxy RSVP* — cook edits residents' `rsvps.status` on their behalf. Rejected by the
    user: it overwrites resident intent and records no cook-side fact.
  - *Actual attendance* — cook records who really ate, post-meal. Rejected for this
    iteration; it answers a different question (expense splitting).
- **Consequences:** Needs a new table and RPC in the cook pass (see D5). Resident-facing
  screens must surface cook status, since a cook marking "out" is urgent information.
- **Affects:** `supabase/migrations/`, `packages/data-access/`,
  `apps/web/src/app/features/cook/cook-home.ts`, `features/resident/resident-home.ts`.

### D2 — Grocery list extends `inventory` rather than adding a table

- **Decision:** Build the Shared Pantry Ledger on the existing `public.inventory` table,
  adding `added_by`, `note`, `created_at`, `updated_at`.
- **Status:** `accepted` — user chose this option.
- **Reason:** `inventory` already exists with the right shape (`household_id`, `name`,
  `status stocked|missing`), is seeded with Oil/Atta/Salt/Milk by `create_household()`,
  and is already in the `supabase_realtime` publication. It is the PRD's Shared Pantry
  Ledger (`docs/cooklog_prd.md` L36-37). It has zero TypeScript consumers today.
- **Alternatives considered:** A new `grocery_items` table alongside `inventory`, with
  quantity and purchased-by fields. Rejected as two overlapping concepts for one idea.
- **Constraint discovered:** `inventory` has `select` and `update` policies but **no insert
  and no delete policy**, so inserts fail under RLS today despite migration 1's blanket
  grant. The migration must add both, plus a `delete` grant.
- **Consequences:** No quantity field, and no purchased-by audit trail. Both can be added
  later without a data migration. The backlog's Splitwise/Dutch expense hook would need
  `purchased_by` when it arrives.
- **Affects:** `supabase/migrations/20260922120000_pantry_ledger.sql`,
  `packages/data-access/src/lib/grocery.store.ts`,
  `apps/web/src/app/features/resident/grocery.ts`.

### D3 — Grocery RLS admits any household member, not just residents

- **Decision:** The insert/update/delete policies on `inventory` are scoped to
  `household_id = current_household()` with no role check, so cooks can write immediately.
- **Status:** `accepted` — implementation choice.
- **Reason:** The PRD's flow is *cook marks missing → appears on the residents' list*. A
  role check would need a second migration the moment the cook pass lands, for no benefit.
- **Tradeoff:** This is the one place where a cook gets table-level write access ahead of
  the deliberate role-model change in D5. Accepted because the pantry is shared household
  state, not resident-owned state.
- **Follow-through:** the `/grocery` route carries **no `roleGuard`** for the same reason —
  a cook reaching it gets a working page, not a redirect. `supabase/tests/pantry.test.sql`
  asserts the cook path directly, so the pass-2 UI needs no further database work.
- **Affects:** `supabase/migrations/20260922120000_pantry_ledger.sql`,
  `supabase/tests/pantry.test.sql`, `apps/web/src/app/app.routes.ts`.

### D4 — Mobile navigation is a bottom bar; the FAB floats above it

- **Decision:** Below `sm`, residents get a fixed bottom nav (Events / Grocery / Regulars);
  "New meal event" becomes a circular FAB.
- **Status:** `accepted` — user chose this option.
- **Reason:** The current nav is `hidden sm:flex`, so on a phone `/regulars` is
  unreachable — there is no hamburger or drawer anywhere in the repo. A bottom bar is
  thumb-reachable and keeps each destination one tap away.
- **Alternatives considered:** Putting nav links inside the `⋮` more-menu. Rejected:
  two taps per navigation, and it mixes navigation with account actions.
- **Consequences:** `<main>` needs bottom padding below `sm`; the FAB must clear the bar;
  both need `env(safe-area-inset-bottom)`. Active state must carry `aria-current="page"`,
  not colour alone.
- **Affects:** `apps/web/src/app/layout/app-shell.ts`, `layout/bottom-nav.ts` (new),
  `features/resident/resident-home.ts`.

### D5 — Cook availability gets its own table, not `rsvps` or `cook_events`

- **Decision:** A new `public.cook_availability (meal_id, user_id, status, note, updated_at)`
  with a `set_cook_availability` RPC, ungated by `cutoff_at`.
- **Status:** `proposed` — cook pass, not yet built.
- **Reason:** `daily_kitchen_docket` computes
  `count(r.user_id) filter (where r.status = 'in')` over `rsvps`, so a cook row in `rsvps`
  would silently inflate the head-count the cook cooks for — directly violating D1.
  `cook_events` is an append-only ping log (`arriving`/`ready`/`cannot_make`), not a
  current-state table, so it cannot answer "what is the cook's status right now".
  The cutoff is deliberately not enforced: a cook calling in sick an hour before dinner is
  the case this exists for.
- **Alternatives considered:** reusing `rsvps` (breaks the docket count); reusing
  `cook_events` (wrong shape); a `cook_status` column on `meals` (wrong cardinality once a
  household has more than one cook).
- **Consequences:** New table, RPC, RLS, publication entry, and a `cook_status` column on
  the `daily_kitchen_docket` view.
- **Affects:** future `supabase/migrations/`, `packages/data-access/src/lib/docket.store.ts`.

### D6 — Cooks may create meal events by relaxing the existing RPC

- **Decision:** Change `create_meal_event`'s guard from `current_user_role() = 'resident'`
  to household membership, and reuse `features/resident/event-create.ts` for both roles.
- **Status:** `proposed` — cook pass, not yet built.
- **Reason:** The RPC body already loops **residents only** when seeding default `in` RSVPs
  and applying regulars, so a cook-created event behaves correctly with no further change.
  Duplicating the form for the cook would fork validation logic.
- **Consequences:** `supabase/tests/events.test.sql` currently asserts a cook *cannot*
  create an event; that assertion inverts.
- **Affects:** future migration, `apps/web/src/app/app.routes.ts`,
  `features/resident/event-create.ts`.

### D7 — Fix the ARIA keyboard contracts in `packages/ui`, keeping roles byte-identical

- **Decision:** Add the missing keyboard behaviour to `UiDropdown` (focus in on open,
  restore on close, arrow/Home/End roving) and `UiSegmented` (roving tabindex, arrow
  selection). Do not change any `role` attribute or click behaviour.
- **Status:** `accepted` — implementation choice.
- **Reason:** Both components already declare `role="menu"` / `role="radiogroup"`, which
  promises a keyboard contract neither implements. Declaring the role without the behaviour
  is worse than not declaring it, because assistive tech announces affordances that do not
  work.
- **Constraint:** Four spec files query `button[role="radio"]` and
  `household-switcher.spec.ts` queries `[role="menu"]`. Roles and click handling must stay
  exactly as they are or those specs break.
- **Consequences:** `packages/ui` had no tests at all; this adds the first two, at
  `apps/web/src/app/core/dropdown.spec.ts` and `segmented.spec.ts`. They live there because
  Vitest only picks up specs under `apps/web/src` — the same arrangement
  `events.store.spec.ts` uses to test a `packages/data-access` file. All 48 pre-existing
  tests kept passing unchanged, which was the point of freezing the roles.
- **Affects:** `packages/ui/src/lib/dropdown.ts`, `segmented.ts`, `field.ts`.

### D8 — A11y scope is deliberately bounded

- **Decision:** This pass fixes skip link, `<h1>`, `aria-current`, the two keyboard
  contracts, field error wiring, the theme-toggle name conflict, status announcements, and
  route-change focus. It does **not** do a colour-contrast audit, does **not** change
  `UiButton`'s `md` height (40px, below the 44px touch guideline), and does **not** add
  axe or Playwright tooling.
- **Status:** `accepted` — implementation choice.
- **Reason:** The listed fixes block keyboard and screen-reader use outright. Resizing the
  base button touches every screen in the app and belongs with a visual pass; tooling is
  roadmap M8.
- **Consequences:** The app will be keyboard-navigable and screen-reader-coherent but not
  audited. M8 still owns the formal pass.
- **Affects:** `apps/web/src/app/layout/`, `packages/ui/src/lib/`.

### D9 — `updated_at` is transaction time, not wall-clock time

- **Decision:** The `inventory` touch trigger sets `updated_at := now()`, which in Postgres is
  the **transaction** timestamp, and the pgTAP fixture ages its rows by a day so the trigger
  can be observed at all.
- **Status:** `accepted` — implementation choice, found while writing the test.
- **Reason:** A first attempt asserted that `updated_at` moved after an update on a row
  created in the same test transaction. It cannot: every `now()` in one transaction returns
  the same instant, so the trigger fired correctly and the assertion still failed.
  `clock_timestamp()` would have made the test pass but would make `updated_at` inconsistent
  with every other timestamp in the schema, all of which default to `now()`.
- **Alternatives considered:** `clock_timestamp()` in the trigger — rejected as above.
- **Consequences:** Two writes in one transaction share an `updated_at`. That is standard and
  harmless here; anything needing per-write ordering would need a sequence, not a timestamp.
- **Affects:** `supabase/migrations/20260922120000_pantry_ledger.sql`,
  `supabase/tests/pantry.test.sql`.

### D10 — Bottom-nav icons are Lucide-style strokes in `currentColor`, not emoji

- **Decision:** The three bottom-nav items use inline SVG stroke icons (`stroke="currentColor"`,
  width 2, 20px) rather than the emoji the first cut shipped. The `⋮` more-menu trigger also
  suppresses `UiDropdown`'s chevron via a new `chevron` input.
- **Status:** `accepted` — implementation choice, made after looking at the running app.
- **Reason:** Coloured emoji (🍽 🛒 ⭐) rendered as fixed-palette glyphs that ignored the theme:
  they stayed the same in light and dark and did not take the lime active colour with their
  label. The repo has no icon font and no icons anywhere else, and the token layer is
  deliberately shadcn-shaped, whose icon idiom is Lucide strokes in `currentColor`. Two
  affordances on one icon-only trigger (`⋮` plus `▾`) was likewise noise.
- **Alternatives considered:** text-only labels (consistent with the rest of the app, but a
  bottom bar reads poorly without icons); adding a Lucide dependency (not worth a package for
  three glyphs).
- **Consequences:** Icons inherit `text-primary` when active and `text-muted-foreground`
  otherwise, in both themes, with no extra dependency. `bottom-nav.spec.ts` now asserts the
  `svg`/`currentColor` contract instead of counting glyph spans.
- **Affects:** `apps/web/src/app/layout/bottom-nav.ts`, `packages/ui/src/lib/dropdown.ts`,
  `apps/web/src/app/layout/app-shell.ts`.
