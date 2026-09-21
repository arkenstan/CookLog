# 5. Step-by-Step Milestones

| # | Milestone | Outcome |
| --- | --- | --- |
| M0 | Environment | pnpm/corepack, Supabase CLI + Docker local stack, Tauri prerequisites (Linux: webkit2gtk; Android SDK/NDK; Xcode), repo scaffold, CI lint/test |
| M1 | Foundation | Angular app, design tokens, Spartan UI, app shell, theme toggle, Supabase client, generated types |
| M2 | Auth & household | Email sign-up, profiles, household + invite flow, RLS + pgTAP tests |
| M3 | Resident core | Preferences, RSVP board with cutoff lock, Realtime updates |
| M4 | Menu system | Menu bank, rotating picker |
| M5 | Cook KDS | Docket view, one-tap action grid, missing-ingredient grid, pantry ledger, KDS lock (no pull-to-refresh / back) |
| M6 | Notifications | Edge Functions (`lock-meals` cron, `notify`), push, WhatsApp/Telegram fallback |
| M7 | Native | Tauri desktop builds, iOS/Android targets, native notifications, biometrics via `platform` |
| M8 | Hardening & release | Playwright e2e, a11y, performance, staging → prod Supabase, web + store deploys |

## Backlog
- Expense-split webhook (Dutch / Splitwise) on purchased pantry items
- Cook UI localization (Hindi, Kannada, Tamil)
