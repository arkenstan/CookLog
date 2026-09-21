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
| Shell | `layout/` | `AuthLayout` (centered card), `AppShell` (header, theme, invite code, sign out) |
| Core | `core/` | Route guards, theme service, environment wiring (`environments/`) |
| Data access | `packages/data-access` | `AuthStore`, `MealsStore`, `DocketStore` (NgRx Signal Stores), Supabase provider, realtime helper. The only code that imports `@supabase/supabase-js` |
| UI kit | `packages/ui` | Button, card, field/input, segmented control, stat |

`packages/*` are resolved through `paths` in `apps/web/tsconfig.json`; because the build/test tooling resolves their imports from the app, their runtime dependencies (`@ngrx/signals`, `@supabase/supabase-js`) are also declared in `apps/web/package.json`. Tailwind scans `packages/ui` via `content` in `apps/web/tailwind.config.js`.

## Routes
| Path | Guards | Page |
| --- | --- | --- |
| `/auth/login`, `/auth/register` | `guestGuard` | Sign in; register with role (resident / cook) |
| `/onboarding` | `authGuard`, `noHouseholdGuard` | Create a household (residents) or join by invite code |
| `/home` | `authGuard`, `householdGuard`, `roleGuard('resident')` | Today's RSVP + menu pick |
| `/kitchen` | `authGuard`, `householdGuard`, `roleGuard('cook')` | Live docket (KDS) |
| `/` | `homeRedirectGuard` | Redirects to login / onboarding / `/home` / `/kitchen` |

The session and profile are restored in an app initializer (`AuthStore.init()`), so guards always see real state on first navigation.
