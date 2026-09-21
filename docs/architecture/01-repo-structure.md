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
