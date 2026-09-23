# 1. Repository & Directory Structure

```
CookLog/
├─ apps/
│  ├─ web/                 Angular SPA (standalone, signals). Output: dist/web/browser
│  └─ desktop-mobile/      Tauri 2 shell: src-tauri/ + tauri.conf.json
├─ packages/
│  ├─ ui/                  Spartan UI wrappers, bento grid, KDS components
│  ├─ data-access/         Supabase client, generated DB types, NgRx Signal Stores
│  ├─ platform/            Web vs Tauri abstraction (notifications, biometrics, fs)
│  ├─ design-tokens/       Tailwind preset: colors, type, breakpoints, glow, motion
│  └─ config/              Shared tsconfig / eslint / prettier
├─ supabase/               config.toml, migrations/, seed.sql, functions/, tests/
├─ docs/                   PRD, HLD, architecture/, adr/
└─ .github/workflows/
```

## Boundaries
| From | May import |
| --- | --- |
| `apps/web` | all `packages/*` |
| `packages/ui` | `design-tokens` |
| `packages/data-access` | (none internal) — only `@supabase/supabase-js`, `@ngrx/signals` |
| `packages/platform` | (none internal) — only `@tauri-apps/api` behind dynamic import |
| `apps/desktop-mobile` | nothing in TS; it only wraps the built `apps/web` output |

Feature code in `apps/web` never calls `@tauri-apps/*` or `supabase.from()` directly: native goes through `platform`, data through `data-access` stores. Enforced with ESLint `no-restricted-imports`.

## Serverless rule
There is no app backend. Anything the client cannot do safely (secrets, cron, webhooks) is a Supabase Edge Function in `supabase/functions/`.

## App layers (`apps/web/src/app`)
Dependencies point downward only.

| Layer | Path | Responsibility |
| --- | --- | --- |
| Features | `features/{auth,onboarding,resident,cook}` | Lazy-loaded pages; use stores + UI kit only |
| Shell | `layout/` | `AuthLayout` (centered card), `AppShell` (header, `HouseholdSwitcher`, nav, theme, invite code, sign out) |
| Core | `core/` | Route guards, theme service, `injectNow()` (ticking clock so cutoffs lock on screen), environment wiring |
| Data access | `packages/data-access` | `AuthStore` (Google sign-in, session, profile setup, households, switching), `EventsStore` (events, availability, entries), `CatalogStore` (items, regulars), `DocketStore` (cook view); `event-utils` (phase, step, formatting). The only code that imports `@supabase/supabase-js` |
| UI kit | `packages/ui` | Button, card, field/input, segmented control, stat, dropdown/menu item, stepper |

Stores are NgRx Signal Stores. Writes are optimistic with rollback: a write that errors *or* touches no row (RLS / closed event) restores the previous state. Pages reload when `AuthStore.activeHouseholdId` changes and subscribe to Realtime through `watchTables`.

`packages/*` are resolved through `paths` in `apps/web/tsconfig.json`; because the build/test tooling resolves their imports from the app, their runtime dependencies (`@ngrx/signals`, `@supabase/supabase-js`) are also declared in `apps/web/package.json`. Tailwind scans `packages/ui` via `content` in `apps/web/tailwind.config.js`. Test-only helpers live in `apps/web/src/testing/` (excluded from the app build).

Plain `<form (ngSubmit)>` elements need `FormsModule` (its `NgForm` provides `ngSubmit` and prevents the native submit); `ReactiveFormsModule` alone only covers `[formGroup]` forms.

## Routes
| Path | Guards | Page |
| --- | --- | --- |
| `/auth/login` | `guestGuard` | "Continue with Google" (plus a local dev password form outside production) |
| `/onboarding/profile` | `authGuard`, `noProfileGuard` | Pick a username and a role (resident / cook) — Google supplies neither |
| `/onboarding` | `authGuard`, `profileGuard`, `noHouseholdGuard` | First household: create (residents) or join by invite code |
| `/households/add` | `authGuard`, `householdGuard` | Same component (`embedded` via route data) to add another household |
| `/home` | resident | Meal events dashboard: Active / Upcoming / Completed, availability toggle |
| `/events/new` | resident | Create a meal event |
| `/events/:id` | resident | Availability, your items (steppers), add/create items, everyone's totals |
| `/regulars` | resident | Manage regular items |
| `/kitchen` | cook | Live docket: today + upcoming events with per-item totals |
| `/` | `homeRedirectGuard` | Redirects to login / profile setup / onboarding / `/home` / `/kitchen` |

`noHouseholdGuard` sits on the `/onboarding` **child**, not the parent: on the parent it would
bounce a user who has a household but no username off `/onboarding/profile` in a loop.

The session and profile are restored in an app initializer (`AuthStore.init()`), so guards always see real state on first navigation. That is also what makes the Google round trip work without an `/auth/callback` route: `getSession()` awaits supabase-js's `detectSessionInUrl`, which exchanges the `?code=` and cleans the URL before the router's first navigation.

## Meal event phases
Derived in the browser (local time) by `eventPhase()`: **active** = starts today and not cooked; **upcoming** = starts on a later day; **completed** = cooked or started on an earlier day. `isRsvpOpen()` = `status = pending` and before `cutoff_at`.
