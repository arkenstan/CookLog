# CookLog

Household meal coordination: residents RSVP, the cook gets an aggregated kitchen docket.

Angular (Signals) + Tauri 2 + Supabase, in a pnpm + Turborepo monorepo.

- Product docs: [`docs/cooklog_prd.md`](docs/cooklog_prd.md), [`docs/cooklog_hld.md`](docs/cooklog_hld.md)
- Architecture plan: [`docs/architecture/`](docs/architecture/)

## Getting started

```bash
corepack enable && pnpm install
pnpm db:start        # local Supabase (needs Docker)
pnpm dev
```

## Layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Angular SPA (web build is also Tauri's frontend) |
| `apps/desktop-mobile` | Tauri 2 shell (desktop + iOS/Android) |
| `packages/*` | ui, data-access, platform, design-tokens, config |
| `supabase/` | migrations, RLS, seed, Edge Functions, pgTAP tests |
