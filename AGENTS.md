# ByeBi Agent Guidance

ByeBi is a full-stack bachelor/bachelorette trip planning application.

Production: https://byebi.it

GitHub `main` is the source of truth. Replit is the deployment environment, not the canonical Git history.

## Instruction Scope

This file applies repository-wide. More specific `AGENTS.md` files under `client/`, `server/`, `shared/`, and `supabase/` add or override guidance for those subtrees. Follow every applicable file, with the closest file taking precedence when instructions differ.

## Stack and Repository Map

- `client/` — React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, and Wouter frontend; see `client/AGENTS.md`.
- `server/` — Node.js 20, Express, TypeScript, and external integrations; see `server/AGENTS.md`.
- `server/services/` — external service integrations.
- `shared/` — shared Drizzle, Zod, and TypeScript schemas/contracts; see `shared/AGENTS.md`.
- `supabase/migrations/` — versioned production database migrations; see `supabase/AGENTS.md`.
- `scripts/` — smoke and deployment helper scripts.
- `.github/workflows/` — CI and production checks.

Do not explore unrelated directories unless the task requires it. Avoid `node_modules/`, `dist/`, historical `thoughts/`, unrelated assets, and old project files unless directly relevant.

## Product Invariants

### Travel

Travel providers include Amadeus, Aviasales, Booking.com, and GetYourGuide. Do not create fake travel results when providers are unavailable.

### Saved Trips

Trips are saved only after the explicit "Salva viaggio" action, with authentication when needed. Preserve trip context across login or registration and avoid duplicate saved trips. Do not save trips automatically.

### Merchandise

Stripe Checkout is used for merchandise. Do not change `MERCHANDISE_SALES_MODE`, Stripe environment, or Printful confirmation/payment configuration without an explicit request.

Do not perform any real payment, refund, cancellation, or fulfillment operation without explicit authorization. Preserve webhook idempotency and retry safety, payment/order reconciliation, fulfillment safety, and refund/cancellation safeguards.

## Standard Commands

Development:

    npm run dev

TypeScript:

    npm run check

Tests:

    npm test

Build:

    npm run build

Full verification:

    npm run verify

Production smoke:

    npm run smoke:production -- https://byebi.it

Travel production smoke:

    npm run smoke:travel:production -- https://byebi.it

## Scope and Dependencies

Make the smallest change that solves the requested problem. Start with the named file, component, or route, then its direct dependencies, and inspect additional files only when necessary.

Do not perform unrelated refactors, renames, formatting, dependency upgrades, architecture changes, or redesigns. Do not install or upgrade dependencies unless the task requires it and the existing stack cannot solve it.

## Safety and External Systems

- Never expose secrets, print complete API keys, hard-code credentials, commit `.env`, or modify production secrets without authorization.
- Keep external credentials server-side where applicable.
- Do not perform real bookings, purchases, payments, refunds, cancellations, fulfillments, or destructive operations on real user data without explicit authorization.
- Do not fabricate successful results from unavailable external providers.

## Verification

Run checks relevant to the changed files. Prefer targeted tests such as:

    npm test -- <relevant-test-file>

Do not repeatedly run the full suite or build after small changes. Use `npm run verify` only for broad changes, requested final verification, release preparation, or when targeted checks are insufficient. Run production smoke tests only when explicitly requested.

If no relevant automated check exists, do not invent one; report the inspection performed.

## Git Rules

Do not automatically create branches, commit, push, open or merge pull requests, or modify `main`. Each action requires an explicit user request.

A coding request means: inspect, make the scoped change, run targeted verification, report, and stop. Git publication and integration are separate tasks.

## Replit and Deployment

Do not automatically open or synchronize Replit, pull GitHub changes into it, publish, republish, change deployment settings, or inspect production through browser automation. Deployment requires an explicit separate request.

Replit may create local commits named `Published your App`. Do not push them automatically. If Replit and `origin/main` diverge, report the divergence and stop rather than resolving or pushing it automatically.

## Completion Rule

Default workflow:

    understand
    → inspect minimal relevant files
    → implement the smallest change
    → run targeted verification
    → report files, changes, checks, readiness, and remaining risks
    → STOP

Commit, push, pull request, merge, and deployment actions remain separate and require explicit requests.
