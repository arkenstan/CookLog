# 5. Step-by-Step Milestones

| # | Milestone | Outcome |
| --- | --- | --- |
| M0 | Environment | pnpm/corepack, Supabase CLI + Docker local stack, Tauri prerequisites (Linux: webkit2gtk; Android SDK/NDK; Xcode), repo scaffold, CI lint/test |
| M1 | Foundation | Angular app, design tokens, Spartan UI, app shell, theme toggle, Supabase client, generated types |
| M2 | Auth & household | Google SSO, username + role setup, household + invite flow, RLS + pgTAP tests |
| M3 | Resident core | Multi-household, meal events (active/upcoming/completed), availability with cutoff lock, count/portion items, regulars, Realtime **(done)** |
| M4 | Event lifecycle | Edit/cancel events, `lock-meals` cron and cooked status, allergies editor, leave household |
| M5 | Cook KDS | Docket view **(done)**, shared pantry ledger **(done)**, one-tap action grid, missing-ingredient grid, cook availability per event, KDS lock (no pull-to-refresh / back) |
| M6 | Notifications | Edge Functions (`lock-meals` cron, `notify`), push, WhatsApp/Telegram fallback |
| M7 | Native | Tauri desktop builds, iOS/Android targets, **OAuth via the system browser + a deep-link plugin** (the shell cannot sign in without it), native notifications, biometrics via `platform` |
| M8 | Hardening & release | Playwright e2e, a11y audit (keyboard + screen-reader basics already landed: skip link, `aria-current`, menu/radiogroup keyboard contracts, route focus), performance, staging → prod Supabase, web + store deploys |

## Backlog
- Expense-split webhook (Dutch / Splitwise) on purchased pantry items
- Cook UI localization (Hindi, Kannada, Tamil)
