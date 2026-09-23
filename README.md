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
cp .env.example .env    # fill in the Google OAuth values, see below
pnpm db:start
pnpm --filter web dev
```

The web app is available at `http://localhost:4200`, which is what `site_url` in
`supabase/config.toml` points at. `127.0.0.1:4200` is allow-listed too, but the two
are separate `localStorage` origins, so a session created on one is invisible on the
other — pick one and stay on it.

Local development uses the Supabase CLI stack at `http://127.0.0.1:54321`.
Production environment values are still placeholders in
`apps/web/src/environments/environment.production.ts`.

### Google sign-in

`supabase/config.toml` enables the Google provider, so `pnpm db:start` needs
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
in the environment or in a `.env` file. Create an OAuth 2.0 Client ID of type "Web
application" in the Google Cloud Console with authorised redirect URI
`http://127.0.0.1:54321/auth/v1/callback` (GoTrue's address, not Angular's) and
authorised JavaScript origin `http://localhost:4200`.

To skip that setup, the login page also shows a **local dev sign-in** form outside
production. The seeded users (`asha@example.com`, `ben@example.com`,
`cook@example.com`, password `password123`) already have usernames and a household.
Signing in with a real Google account instead lands you on the username step, then
you can join the seeded household with invite code `flat3b`.

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

The current app includes Google sign-in, username and role setup, household
onboarding, multiple households, meal events, availability, count and portion
items, regulars, a shared grocery list, and the cook docket.
Routes include:

`/auth/login`, `/onboarding/profile`, `/onboarding`, `/households/add`, `/home`,
`/events/new`, `/events/:id`, `/grocery`, `/regulars`, and `/kitchen`.

A user is a username and a role, nothing more: `public.profiles` holds no name,
email or avatar. Supabase's own `auth` schema still stores the Google email,
because that is how GoTrue identifies an account.

Features not yet implemented include event editing/cancellation, cooked-status
automation, allergies editing, push notifications, mobile Tauri targets, and
production Supabase configuration. **The Tauri desktop/mobile shell currently has
no way to sign in** — Google rejects OAuth inside embedded WebViews, so it needs a
system-browser flow and a deep-link plugin first.

## CI and deployment

Pull requests and pushes to `main` run the web lint, test, and build checks,
Supabase pgTAP tests, and generated-type drift checks. Changes to `apps/web` or
shared packages deploy the web build to Cloudflare Pages. Changes under
`supabase/` can deploy migrations and Edge Functions through the Supabase CLI.
These workflows require repository secrets and a configured production
Supabase project; they do not make the placeholder production environment safe
to deploy by themselves.

`supabase db push` applies migrations only — **nothing in the `[auth]` section of
`config.toml` reaches production.** Set these by hand in the Supabase dashboard:

1. **Authentication → Providers → Google**: enable it, with a second OAuth client
   whose redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Authentication → Providers → Email**: turn off new sign-ups, and delete any
   password users the project already has.
3. **Authentication → URL Configuration**: set Site URL to the Cloudflare Pages
   origin and add it (plus `/**`) to the redirect allow-list.
4. Fill in `apps/web/src/environments/environment.production.ts`.

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
