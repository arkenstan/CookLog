# Decisions

Engineering decision log. Newest session first.

---

## 2026-09-24 — Web-only: remove the Tauri desktop/mobile shell

**Scope.** Delete `apps/desktop-mobile` and its release workflow, and remove the Tauri
references from the scripts and docs.

### D23 — CookLog ships as a web app only

- **Decision:** Remove the Tauri 2 shell (desktop, Android, iOS), `release-tauri.yml`, the
  Tauri step in `scripts/generate-icons.mjs` and the Tauri `.gitignore` entries. Roadmap M7
  (Native) is dropped; M8 keeps its number because earlier decisions cite it.
- **Status:** `accepted` — **user requirement**.
- **Reason:** The shell had no sign-in path since D16/D22, and keeping it meant a Rust
  toolchain, signing secrets and a release matrix for a target nobody could use.
- **Consequences:** D22 is superseded. `pnpm icons` now only writes web icons into
  `apps/web/public`. Responsive/mobile-first web layout (e.g. D4's bottom nav) is unaffected.
- **Affects:** `apps/desktop-mobile/` (deleted), `.github/workflows/release-tauri.yml`
  (deleted), `scripts/generate-icons.mjs`, `.gitignore`, `pnpm-lock.yaml`, README,
  COLLABORATION.md, `docs/architecture/`, `docs/adr/0001`.

---

## 2026-09-23 — Google SSO only, username identity, minimal stored data

**Scope.** Remove email/password registration in favour of Google SSO, add a first-login step
that collects a username and a role, and stop storing personal information in the `public`
schema.

**Status.** Built and verified: 82 pgTAP assertions and 108 Vitest tests pass, `pnpm gen:types`
is idempotent against the live schema, and the web bundle builds. All decisions below are
`accepted`.

### D16 — Google SSO is the only way to create an account

- **Decision:** Delete the register page and `signUp`. `/auth/login` is a single "Continue
  with Google" button. New accounts come from Google and nowhere else.
- **Status:** `accepted` — **user requirement**, not an implementation choice.
- **Consequences:** `[auth.email] enable_signup = false` — see D20. The desktop/mobile shell
  loses its only sign-in path — see D22 (the shell was later removed — D23).
- **Affects:** `apps/web/src/app/features/auth/`, `packages/data-access/src/lib/auth.store.ts`,
  `supabase/config.toml`.

### D17 — `profiles.name` becomes a unique `username`, stored as typed

- **Decision:** Rename the column. 3–20 characters of `[A-Za-z0-9_]`, enforced by a CHECK,
  a re-check in `complete_profile`, and an Angular `Validators.pattern`. Stored exactly as
  typed, with a unique index on `lower(username)`.
- **Status:** `accepted` — **user requirement** (one identity field, no display name); the
  format and casing are implementation choices.
- **Reason:** The username is also what the UI renders — the In/Out roster and the grocery
  ledger's "Added by". Lowercasing it would print "added by asha" everywhere. A
  case-insensitive unique index still stops `Asha` and `asha` from coexisting.
- **Alternatives considered:** keeping `name` as an optional display name beside a username.
  Rejected by the user: it keeps a second, Google-derivable field for no product gain.
- **Consequences:** No rename path exists. The client cannot check availability before
  submitting — `profiles_select` only exposes self and housemates — so taken-ness comes back
  as an error from the RPC. The migration must null out legacy values that contain spaces or
  collide, or the CHECK and the index abort it.
- **Affects:** `20260923000000_google_sso_profiles.sql`, `events.store.ts`, `grocery.store.ts`.

### D18 — `role` stays `NOT NULL DEFAULT 'resident'`; `username IS NULL` is the only setup signal

- **Decision:** Do not make `role` nullable. A profile needs setup exactly when its username
  is NULL.
- **Status:** `accepted` — implementation choice.
- **Reason:** `current_user_role()` feeds seven RLS policies and five RPC guards across three
  migrations. Making it nullable turns every `is distinct from 'resident'` into a different
  question and needs all of it re-proven, for no product benefit. Two independent "incomplete"
  signals can also disagree with each other; one cannot.
- **Consequences:** A signed-in user with no username is nominally a resident at the database
  level, so the route guard is not enough. `create_household` and `join_household` now raise
  `complete your profile first`, which makes "identity before household" a server-side
  invariant rather than a UI convention.
- **Affects:** `20260923000000_google_sso_profiles.sql`, `supabase/tests/profile.test.sql`.

### D19 — Profile setup is its own route and component

- **Decision:** A new `ProfileSetup` component at `/onboarding/profile`, not a third mode
  inside `Onboarding`.
- **Status:** `accepted` — implementation choice.
- **Reason:** `Onboarding` is already dual-purpose (first run vs. `embedded` at
  `/households/add`). A separate route is also what makes `profileGuard` / `noProfileGuard`
  expressible at all.
- **Constraint discovered:** `noHouseholdGuard` was on the **parent** `onboarding` route. Left
  there, a user with a household but no username loops forever: `/onboarding/profile` →
  parent guard fires → `/` → `homeRedirectGuard` → `/onboarding/profile`. It now sits on the
  `''` child, and `app.routes.spec.ts` asserts that.
- **Consequences:** The gate order is `isAuthenticated` → `hasProfile` → `hasHousehold` →
  role, in `homeRedirectGuard` and in the AppShell route's guard list alike.
- **Affects:** `apps/web/src/app/app.routes.ts`, `core/guards.ts`,
  `features/onboarding/profile-setup.ts`.

### D20 — Email auth is switched off in the production dashboard, not in `config.toml`

- **Decision:** Leave both `enable_signup` flags in `supabase/config.toml` alone. Google-only
  is enforced in production by hand, in the Supabase dashboard.
- **Status:** `accepted` — implementation choice, corrected by verification.
- **Reason:** `config.toml` configures the **local** stack only: `supabase-deploy.yml` runs
  `link`, `db push` and `functions deploy`, never `config push`, so nothing in `[auth]` ever
  reaches the hosted project. Turning email off there therefore buys production nothing and
  costs local development the D21 escape hatch. Both flags were tried and both are traps:
  - `[auth.email] enable_signup = false` maps to `GOTRUE_EXTERNAL_EMAIL_ENABLED=false`, which
    disables the whole email provider. Sign-**in** dies with it, and the password grant then
    returns `email_provider_disabled` — found by signing a seeded user in over HTTP.
  - `[auth] enable_signup = false` is `GOTRUE_DISABLE_SIGNUP`, which rejects **every** new
    user including OAuth ones. With the password path gone, no account could ever be created
    again.
- **Consequences:** A local stack still accepts email sign-ups. That is intentional and
  contained: the app has no UI for it beyond the dev-only form, and production is configured
  separately. The README lists the four manual dashboard steps, and `config.toml` carries a
  comment so nobody "fixes" this later.
- **Affects:** `supabase/config.toml`, `README.md`.

### D21 — A dev-only password sign-in survives, behind `!environment.production`

- **Decision:** Keep `AuthStore.signIn` and the seeded password users; the login page renders
  the email/password form only outside production.
- **Status:** `accepted` — **user decision**, chosen over requiring Google credentials locally.
- **Reason:** With Google as the only path, no one can sign in to a local stack without first
  registering an OAuth client in the Google Cloud Console. That is a poor first-run experience
  for a change that is otherwise invisible locally.
- **Alternatives considered:** deleting the password path entirely and documenting the Google
  setup as a prerequisite. Rejected by the user.
- **Consequences:** A second auth path exists in the codebase. The `@if` branch is still
  compiled into the production bundle — Angular cannot tree-shake a template branch — it
  simply never renders. So the containment that matters is **server-side**: the hosted
  project has the email provider disabled and holds no password users, which makes
  `signInWithPassword` fail even if the form were forced to appear. `seed.sql` documents the
  local credentials.
- **Affects:** `apps/web/src/app/features/auth/login.ts`, `supabase/seed.sql`.

### D22 — Tauri OAuth is out of scope

- **Decision:** Leave `tauri.conf.json` untouched. The desktop/mobile shell has no sign-in.
- **Status:** `superseded` by D23 — the shell itself was removed.
- **Reason:** Google rejects OAuth inside embedded WebViews (`disallowed_useragent`), and
  there is no deep-link plugin or custom scheme registered, so there is nothing for the
  callback to return into. The correct shape — system browser → deep link →
  `exchangeCodeForSession` — is a plugin, Rust and signing-config change, i.e. roadmap M7.
- **Consequences:** A real regression from "the email form worked in the WebView". Recorded in
  the README, `03-database-rls.md` known gaps, and roadmap M7 rather than left to be
  discovered. The CSP needs no change: `connect-src` already allows `*.supabase.co`, and
  `accounts.google.com` must **not** be added, because the WebView should never go there.
- **Affects:** documentation only.

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

### D11 — UI kit migrated to ZardUI, vendored into `packages/ui`

- **Decision:** Replace the hand-rolled kit with ZardUI (zardui.com), a shadcn-for-Angular
  library. Its components are **copied into `packages/ui/src/lib/zard/`** (shadcn model:
  the source is ours to edit), not consumed as a runtime dependency.
- **Status:** `accepted` — **user requirement**. Placement, theming and the Segmented
  replacement were chosen by the user from options.
- **Reason:** The user wanted the shadcn aesthetic with real Angular support. ZardUI is
  signals-based, zoneless-ready and Tailwind v4 native, which matches this stack exactly.
- **Version risk taken knowingly:** ZardUI targets **Angular 21.2**; this repo is on
  **22.1**, and `zard-cli` is beta (`1.0.0-beta.117`). Because the code is vendored rather
  than depended on, this is a compile question, not a locked peer range — and the source
  uses only stable signal APIs. A spike confirmed it compiles clean on 22 (see D12).
- **Alternatives considered:** keeping the hand-rolled kit (rejected by the user); using
  ZardUI's default `src/app/shared/` layout with an `@/*` alias (rejected: it breaks the
  `features → layout → core → data-access → ui` layering and splits the import surface).
- **Consequences:** `@cooklog/ui` now re-exports ZardUI plus three of ours. Imports were
  rewritten from `@/shared/...` to relative paths so the package stays self-contained with
  no alias magic. New runtime deps: `@angular/cdk`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `@ng-icons/core`, `@ng-icons/lucide`, and `tw-animate-css` (dev).
- **Affects:** `packages/ui/**`, every page template, `app.config.ts` (`provideZard()`).

### D12 — Icon layer re-pointed from `lucide-angular` to `@ng-icons/lucide`

- **Decision:** Rewrite the vendored `icon.component.ts` and `icons.ts` to render through
  `@ng-icons/core` instead of `lucide-angular`, keeping the public API (`zType`, `zSize`,
  `class`) so the vendored Button and Toggle Group templates work untouched.
- **Status:** `accepted` — implementation choice, forced by a hard incompatibility.
- **Reason:** This was the **only real Angular 22 blocker** in the whole migration.
  `lucide-angular@1.0.0` declares `@angular/core: 13.x - 21.x`. `@ng-icons/lucide@36`
  declares `>=22.0.0`, and ZardUI's own install docs already list `@ng-icons` — upstream
  appears to be mid-migration between the two. Same Lucide glyphs either way.
- **Consequences:** The registry is a curated subset (9 icons) rather than upstream's ~90,
  keyed by the same kebab-case names so `zType="loader-circle"` still resolves. Re-vendoring
  ZardUI later means re-applying this patch. Supersedes [[D10]]'s hand-inlined SVGs, which
  are now real Lucide icons.
- **Affects:** `packages/ui/src/lib/zard/components/icon/`.

### D13 — Local patches to vendored ZardUI

Three deliberate edits to the copied source, each recorded so a future re-vendor can
re-apply them:

1. **Toggle Group takes a `zLabel`.** Upstream renders `role="group"` with no accessible
   name, leaving screen-reader users no context for the buttons inside. Bound to `aria-label`.
2. **Selected toggle state is `primary`, not `accent`.** Upstream uses `bg-accent`, which in
   our palette is cyan; the selected segment has always been neon lime, and it now carries
   `shadow-glow-sm` to match the RSVP cards. Hover no longer previews the accent colour.
3. **Icon layer** — see D12.

- **Status:** `accepted` — implementation choices.
- **Affects:** `packages/ui/src/lib/zard/components/toggle-group/`, `.../icon/`.

### D14 — `zDisabled`, not `disabled`, on ZardUI buttons

- **Decision:** Every `[disabled]` binding on a `z-button` is `[zDisabled]`.
- **Status:** `accepted` — implementation choice, found by a failing test.
- **Reason:** `ZardButtonComponent` host-binds `[attr.disabled]` from `zDisabled()`, writing
  `null` when false. That **strips** a native `[disabled]` property binding, so every
  migrated submit button silently stopped disabling while `busy()`. The stepper's Increase
  button failing its max check is what surfaced it.
- **Consequences:** A trap for anyone adding a button later. Native `[disabled]` still
  applies to `input`/`select`, which are not ZardUI components.
- **Affects:** all form pages, `packages/ui/src/lib/stepper.ts`.

### D15 — The `''` redirect must precede the AppShell route

- **Decision:** Move `{ path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] }`
  **above** the `{ path: '', component: AppShell, children: [...] }` route.
- **Status:** `accepted` — user-reported bug fix.
- **Reason:** `homeRedirectGuard` was already correct and role-aware (`/kitchen` for a cook,
  `/home` for a resident, `/auth/login` when signed out, `/onboarding` without a household),
  but it was **unreachable**. The AppShell route also matches `''`; the router claimed it
  first and rendered the shell around an empty `<router-outlet>`, so every sign-in landed on
  a blank page with only the header and bottom nav visible.
- **Alternatives considered:** adding an empty-path child *inside* the shell's children.
  Rejected: it renders the shell only to immediately redirect out of it, and leaves two
  routes competing for `''`.
- **Consequences:** `/` never renders the shell at all now. The `**` wildcard still
  redirects to `''`, so unknown paths resolve through the same role-aware guard.
- **Verified:** resident → `/home`, cook → `/kitchen`, signed out → `/auth/login`, for
  post-login, a direct `/` hit, and an unknown path — in a real browser, with no console
  errors. `app.routes.spec.ts` covers the ordering and was confirmed to fail against the
  old arrangement.
- **Affects:** `apps/web/src/app/app.routes.ts`, `apps/web/src/app/app.routes.spec.ts`.
