# Collaboration Guide

CookLog is a pnpm and Turborepo monorepo for a household meal-coordination
app. Keep changes small, testable, and consistent with the existing Angular and
Supabase boundaries. CookLog ships as a web app only; do not add desktop or
mobile shells or native build targets.

## Before you start

```bash
corepack enable
pnpm install
```

For database work, start the local Supabase stack with `pnpm db:start`.

Read the relevant product or architecture document in `docs/` before changing
the domain model or security behavior.

## Where code belongs

- Put pages, route guards, and application composition in `apps/web`.
- Put reusable presentational components in `packages/ui`.
- Put Supabase access, stores, generated types, and realtime helpers in `packages/data-access`.
- Put shared styling tokens in `packages/design-tokens`.
- Put schema, RPC, grants, and RLS changes in a new timestamped migration under `supabase/migrations`.
- Put database security and RPC coverage in `supabase/tests`.

Pages must not import Supabase directly. Use the data-access stores and keep
write operations optimistic with rollback when the request fails or affects no
rows.

## Database and security rules

Every schema or RPC change should include the matching pgTAP coverage. Run:

```bash
pnpm db:reset
pnpm db:test
pnpm gen:types
```

The generated database types must be committed when the schema changes. CI
checks this with `git diff --exit-code packages/data-access` after generating
types.

Do not bypass the domain RPCs for meal creation, availability, or active
household changes. Preserve the `authenticated`-only model, active-household
scoping, and `security definer` helper functions with an explicit empty search
path.

## Application conventions

- Use standalone Angular components, Signals, `OnPush`, and the existing store patterns.
- Import `FormsModule` when a template uses `(ngSubmit)`.
- Reload household-scoped pages when the active household changes.
- Use `watchTables` for realtime subscriptions where the feature already supports live updates.
- Preserve count items as whole units and portion items in 0.5 steps.
- Keep browser-local event phases consistent with the documented active, upcoming, and completed rules.

## Verification

Run the smallest relevant check first, then the broader checks needed by the
change:

```bash
pnpm --filter web test --watch=false
pnpm --filter web build
pnpm db:test
```

If database types or migrations changed, `pnpm gen:types` must leave the
generated file up to date. Mention unavailable checks in the pull request.

The GitHub Actions workflows also deploy the web build to Cloudflare Pages and
Supabase migrations/functions from `main` when their relevant paths change.
Do not add production credentials to source files; deployment uses repository
secrets.

## Changes and pull requests

Use concise commit messages such as `feat(web): add meal editing` or
`fix(db): scope docket items to active household`. Keep each commit focused.

Pull requests should explain the user-visible behavior, list database or RLS
changes, and include the commands that were run. Include screenshots for
meaningful UI changes and call out any migration, generated-type, or local
Supabase setup requirements.

Keep the README and this guide aligned with current routes, scripts, and
feature status. Link to `docs/` for detailed product and architecture material
instead of duplicating it here.

Do not commit secrets, local Supabase credentials, or generated build output.

## License

No license has been declared yet. Treat the repository as all-rights-reserved
until the project adds a license file.
