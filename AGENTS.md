# AGENTS.md

# ByeBi

ByeBi is a full-stack bachelor/bachelorette trip planning application.

Production: https://byebi.it

GitHub `main` is the source of truth.
Replit is the deployment environment, not the canonical Git history.

## Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
- Backend: Node.js 20, Express, TypeScript
- Auth/Data: Supabase Auth, PostgreSQL, Drizzle ORM, Zod
- Tests: Vitest, Testing Library
- CI: GitHub Actions
- Deployment: Replit Autoscale

## Repository Map

- `client/` — React frontend
- `client/src/components/` — reusable UI/components
- `client/src/pages/` — application pages
- `client/src/lib/` — frontend business logic/helpers
- `server/` — Express API and backend
- `server/services/` — external service integrations
- `shared/` — shared schemas/contracts
- `supabase/migrations/` — versioned production database migrations
- `scripts/` — smoke/deployment helper scripts
- `.github/workflows/` — CI and production checks

Do not explore unrelated directories unless required by the task.

Avoid inspecting:
- `node_modules/`
- `dist/`
- historical `thoughts/` documents
- unrelated assets
- old project files

unless directly relevant.

## Main Product Flows

### Travel

User input
→ chat validation
→ checkout
→ flights / hotels / activities
→ external provider

Travel providers include:

- Amadeus
- Aviasales
- Booking.com
- GetYourGuide

Do not create fake travel results when providers are unavailable.

### Saved Trips

Checkout
→ explicit "Salva viaggio"
→ authentication if needed
→ Dashboard

Trips must NOT be automatically saved.

Preserve trip context across login/register.

Avoid duplicate saved trips.

### Merchandise

Stripe Checkout is used for merchandise.

`MERCHANDISE_SALES_MODE` must remain `test` unless the user explicitly authorizes a change.

Never activate Stripe live mode automatically.

## Development Commands

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

## Task Scope

Always make the smallest change that solves the requested problem.

Start with:
1. the file/component/route named in the task;
2. its direct dependencies;
3. additional files only when necessary.

Do NOT scan the entire repository by default.

Do NOT perform unrelated:
- refactors;
- renames;
- formatting;
- dependency upgrades;
- architecture changes;
- UI redesigns.

If a task can be solved in two files, do not inspect twenty.

## Verification

During normal development, run only checks relevant to the changed code.

Prefer targeted tests such as:

    npm test -- <relevant-test-file>

Do not run the full test suite/build repeatedly after small changes.

Run:

    npm run verify

only when:
- the change is broad;
- final verification is requested;
- preparing a release;
- targeted checks are insufficient.

Production smoke tests should only be run when production verification is explicitly required.

## Git Rules

Do NOT automatically:

- create branches;
- commit;
- push;
- open pull requests;
- merge pull requests;
- modify `main`.

These actions require an explicit user request.

A request such as:

    Fix the checkout bug

means:

    inspect → modify → targeted verification → report → STOP

It does NOT mean:

    commit → push → PR → merge

After completing a coding task, report:

1. files changed;
2. what changed;
3. checks run;
4. whether the change is ready to commit;
5. remaining risks.

Then STOP.

## Replit / Deployment Rules

Do NOT automatically:

- open Replit;
- synchronize Replit;
- pull GitHub changes into Replit;
- publish;
- republish;
- change deployment settings;
- inspect production through browser automation.

Deployment requires an explicit separate request.

GitHub `main` is authoritative.

Replit may create local commits named:

    Published your App

Do not push these commits to GitHub automatically.

If Replit and `origin/main` diverge, report the divergence and STOP rather than attempting to resolve or push it automatically.

## Database Rules

Production schema changes belong in:

    supabase/migrations/

Production migrations are deployed through the Supabase/GitHub integration.

Do NOT run:

    drizzle-kit push

after merges or against production.

Never perform destructive migrations without explicit authorization.

## Secrets and External Services

Never:
- expose secrets;
- print complete API keys;
- hard-code credentials;
- commit `.env`;
- modify production secrets without authorization.

External credentials must remain server-side where applicable.

Do not perform:
- real bookings;
- real purchases;
- live Stripe transactions;
- destructive operations on real user data

without explicit authorization.

## Dependencies

Do not install or upgrade dependencies unless necessary for the requested task.

Before adding a package, check whether the existing stack already solves the problem.

Never run broad dependency upgrades as part of an unrelated task.

## UI

Preserve the existing ByeBro / ByeBride design system.

Do not redesign surrounding pages when fixing a local problem.

Check mobile impact when changing:
- checkout;
- navigation;
- dialogs;
- CTAs;
- travel cards.

## Completion Rule

Default workflow:

    understand
    → inspect minimal relevant code
    → implement
    → targeted verification
    → concise report
    → STOP

Git operations and deployment are separate tasks.
