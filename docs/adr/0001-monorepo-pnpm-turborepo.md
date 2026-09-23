# ADR 0001: Monorepo tooling — pnpm workspaces + Turborepo

Status: accepted

## Context
The repo mixes Angular (TS) and Supabase (SQL, Deno Edge Functions). We need one repo, cached task orchestration, and no lock-in to Angular-specific tooling.

## Decision
pnpm workspaces for dependency management; Turborepo as task runner. Angular CLI is used as-is (`ng build`).

## Alternatives
- **Nx**: best-in-class Angular generators and `affected` graph, but heavier config, plugin-coupled upgrades, and little value for the SQL/Deno parts.
- **Plain pnpm scripts**: no caching or task graph.

## Consequences
- No generators; use Angular CLI and Spartan CLI directly.
- Module boundaries enforced by ESLint `no-restricted-imports` and TS path aliases rather than Nx tags.
- `packages/*` are consumed as source via path aliases (no build step) to keep the dev loop fast.

## Stack precedence
The PRD's suggested React Native + Firebase/FCM is superseded by the HLD and tech spec: Angular + Supabase. (A Tauri 2 desktop/mobile shell was dropped on 2026-09-24; the app is web-only.)
