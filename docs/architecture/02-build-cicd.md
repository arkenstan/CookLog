# 2. Build & CI/CD Strategy

## One SPA build
CookLog ships as a web app only. Angular builds once and that output is deployed to Cloudflare Pages.

`apps/web/angular.json` (application builder):
```json
"outputPath": { "base": "dist/web", "browser": "browser" }
```
Result: `apps/web/dist/web/browser`.

## Turborepo graph
`gen:types` (Supabase → TS types) → `web#build`. Turbo caches `dist/**`, so unchanged web builds are reused.

## Environment
| Var | Where | Note |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | web build (public) | anon key is safe only because RLS is enforced |
| service-role key, Stripe/Twilio/push secrets | Edge Function secrets only | never in the client |

## Workflows
| File | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | PR | pnpm install, `turbo lint test build`, `supabase start` + `db test` (pgTAP) |
| `deploy-web.yml` | push main | build web, deploy to Cloudflare Pages |
| `supabase-deploy.yml` | push main, `supabase/**` | `supabase db push`, `functions deploy` |
