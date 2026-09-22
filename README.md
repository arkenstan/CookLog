# CookLog

CookLog coordinates meals in a shared household. Residents join meal events,
set their availability, add regular quantities, and keep a shared grocery list.
The household cook gets a live, aggregated kitchen docket.

## Stack

- Angular 22 standalone components, Signals, NgRx Signal Store, and zoneless change detection
- Tailwind CSS v4 with shared design tokens and a small in-house UI kit
- Supabase for Postgres, Auth, Realtime, and Row Level Security
- Tauri 2 for the desktop shell
- pnpm workspaces and Turborepo

The web client talks to Supabase only through `packages/data-access`. Pages use
stores and the shared UI kit; authorization is enforced by Supabase RLS and
database functions.

## Quick start

Requirements: Node 24, Corepack, pnpm 12, and Docker for local Supabase.

```bash
corepack enable
pnpm install
pnpm db:start
pnpm --filter web dev
```

The web app is available at `http://127.0.0.1:4200`.

Local development uses the Supabase CLI stack at `http://127.0.0.1:54321`.
Production environment values are still placeholders in
`apps/web/src/environments/environment.production.ts`.

## Common commands

```bash
pnpm --filter web build                 # production Angular build
pnpm --filter web test --watch=false   # web Vitest suite
pnpm db:reset                          # reset local database and seed it
pnpm db:test                            # run Supabase pgTAP tests
pnpm gen:types                          # regenerate Supabase TypeScript types
pnpm build                              # build all workspace projects
pnpm lint                               # lint all workspace projects
pnpm turbo run lint test build          # run the CI web checks
```

`pnpm gen:types` requires the local Supabase instance to be running. The root
Tauri build may fail on Linux when `linuxdeploy` is unavailable; the web build
is the focused check for the Angular application.

## Product surface

The current app includes email auth, onboarding, multiple households, meal
events, availability, count and portion items, regulars, a shared grocery list,
and the cook docket.
Routes include:

`/auth/login`, `/auth/register`, `/onboarding`, `/households/add`, `/home`,
`/events/new`, `/events/:id`, `/grocery`, `/regulars`, and `/kitchen`.

Features not yet implemented include event editing/cancellation, cooked-status
automation, allergies editing, push notifications, mobile Tauri targets, and
production Supabase configuration.

## CI and deployment

Pull requests and pushes to `main` run the web lint, test, and build checks,
Supabase pgTAP tests, and generated-type drift checks. Changes to `apps/web` or
shared packages deploy the web build to Cloudflare Pages. Changes under
`supabase/` can deploy migrations and Edge Functions through the Supabase CLI.
These workflows require repository secrets and a configured production
Supabase project; they do not make the placeholder production environment safe
to deploy by themselves.

## Repository layout

| Path                     | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `apps/web`               | Angular SPA and application routes                             |
| `apps/desktop-mobile`    | Tauri 2 native shell                                           |
| `packages/data-access`   | Supabase client, generated types, stores, and realtime helpers |
| `packages/ui`            | Shared standalone UI components                                |
| `packages/design-tokens` | Tailwind preset and theme tokens                               |
| `supabase/migrations`    | Database schema, RPCs, grants, and RLS policies                |
| `supabase/tests`         | pgTAP database and RLS tests                                   |
| `docs`                   | Product, architecture, and ADR documentation                   |

## Documentation

- [Product requirements](docs/cooklog_prd.md)
- [High-level design](docs/cooklog_hld.md)
- [Architecture documentation](docs/architecture/)
- [Collaboration guide](COLLABORATION.md)

## License

No license has been declared yet.
