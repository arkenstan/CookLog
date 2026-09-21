# 2. Build & CI/CD Strategy

## One SPA build, three targets
Angular builds once; Tauri packages that output for desktop and mobile, and the same output is deployed as the web app.

`apps/web/angular.json` (application builder):
```json
"outputPath": { "base": "dist/web", "browser": "browser" }
```
Result: `apps/web/dist/web/browser`.

`apps/desktop-mobile/src-tauri/tauri.conf.json`:
```json
{
  "build": {
    "devUrl": "http://localhost:4200",
    "frontendDist": "../../web/dist/web/browser",
    "beforeDevCommand": "pnpm --filter web start",
    "beforeBuildCommand": "pnpm --filter web build"
  }
}
```
Tauri serves `index.html` as the fallback for unknown paths, so Angular's default path routing works inside the shell without hash routing.

## Turborepo graph
`gen:types` (Supabase → TS types) → `web#build` → `desktop-mobile#tauri build`. Turbo caches `dist/**`, so unchanged web builds are reused by the Tauri jobs.

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
| `release-tauri.yml` | tag `v*` | `tauri-action` matrix: macOS (arm64/x64), Windows, Linux; Android APK/AAB; iOS on macOS runner |

Signing (Apple cert, Windows cert, Android keystore, Tauri updater key) lives in GitHub secrets.
