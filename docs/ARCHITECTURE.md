# ByeBi Architecture

## Purpose

This document is the technical authority for ByeBi. It describes current structure and intended boundaries. Product behavior belongs in [PRD.md](PRD.md), UI behavior in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), and durable rationale in [adr/](adr/README.md).

Where current implementation is transitional, this document labels it explicitly rather than treating it as the target architecture.

## Repository responsibilities

| Area | Responsibility |
| --- | --- |
| `client/` | React UI, Wouter routes, client orchestration, local transient state, TanStack Query, localization, and Supabase browser session |
| `server/` | Express API, authorization enforcement, persistence orchestration, provider calls, OpenAI orchestration, and secret-bearing integrations |
| `server/services/` | External provider adapters and service-specific normalization |
| `shared/` | Zod, Drizzle, and TypeScript contracts shared across client and server |
| `supabase/migrations/` | Ordered PostgreSQL production schema history |
| `.github/workflows/` | CI and production smoke workflows |
| `scripts/` | Local task, shipping, and smoke helpers |

The client must not own server authorization or secret-bearing provider logic. The server must not make UI decisions. Shared contracts must not import runtime code from client or server.

## Runtime shape

- React 18 and Vite render the browser application.
- Wouter defines client routes in `client/src/BrandedApp.tsx`.
- TanStack Query coordinates API data and invalidation.
- Express serves `/api/*` routes and the client runtime.
- PostgreSQL is accessed through Drizzle-backed storage.
- Supabase Auth provides browser sessions; server middleware validates bearer tokens for protected operations.
- Zod validates shared application, request, provider, and analytics boundaries.

## Current routes relevant to planning

- `/` — branded homepage and Planner entry.
- `/destinations`, `/destinations/:id`, `/experiences` — discovery.
- `/checkout` — current travel provider-option and external-handoff surface.
- `/itinerary` and `/itinerary/:id` — compatibility redirects to `/checkout`.
- `/auth` — authentication, including `next=/checkout` return intent.
- `/dashboard` — authenticated saved-trip list and account surface.
- `/trips/:id` — authenticated Trip Hub.
- `/trips/shared/:token` — public, token-scoped shared-trip view.

`/checkout` is a historical route name. It does not mean ByeBi completes travel booking or payment.

## Domain state ownership

Keep four concepts separate:

| Domain | Meaning | Intended owner |
| --- | --- | --- |
| Planner | What the user wants | Shared versioned contract; editable client state |
| Provider Results | What external providers returned | Provider-specific server adapters, normalized API response, query/UI state |
| Selections | Which returned option the user chose | Explicit client flow state; persist only with a defined product need |
| Saved Trip | What the user explicitly persists | Authenticated server/API and PostgreSQL |

No generic `itinerary` object is canonical across these domains. Conversions between domains must be explicit and validated. See [ADR-0006](adr/0006-domain-state-separation.md).

## Planner contract

The canonical Planner contract is `shared/plannerSchemas.ts`.

The current implementation:

- uses `PLANNER_CONTRACT_VERSION = 1`;
- maps `byebro` to `bachelor` and `byebride` to `bachelorette`;
- models origin and destination as canonical locations with optional display labels;
- stores ISO date-only start and end values;
- validates 1–50 participants;
- stores integer `budgetPerPerson` values from 1 to 100,000;
- requires an archetype or interests;
- distinguishes `draft` from `review-ready`;
- rejects brand/party-type mismatches and invalid date order.

The version is an implementation fact, not a permanent architectural decision. Breaking persisted-contract changes require a new version or an explicit migration/compatibility strategy. See [ADR-0004](adr/0004-versioned-planner-contract.md).

## Planner persistence and compatibility

The versioned Planner draft is stored locally by `client/src/lib/plannerStorage.ts`. `byebi:plannerDraft:v1` remains the active/backward-compatible value used by the checkout bridge, while brand-isolated resumable drafts use `byebi:plannerDraft:v1:byebro` and `byebi:plannerDraft:v1:byebride`.

Current compatibility behavior:

- `currentItinerary` is the legacy checkout context.
- A valid legacy value may be migrated into a Planner draft.
- A `review-ready` Planner is explicitly converted into `currentItinerary` before navigating to `/checkout`, with a small provenance marker tied to that Planner snapshot.
- The bridge removes the legacy `selectedFlight` value.
- Unknown or corrupt versioned Planner values are discarded rather than trusted.
- Closing the Planner preserves the current brand's draft. The explicit **New trip** action replaces only that brand's draft with a fresh one and clears the transient `currentItinerary`, retired `byebi:providerSelections:v1` data, legacy `selectedFlight`, and in-memory chat/review-edit state. It never deletes Saved Trips.

The compatibility bridge is transitional. New work should not expand `currentItinerary` into a canonical cross-domain model.

The provider-options page now adapts these inputs into a narrow handoff context. It uses the valid `review-ready` Planner only when the checkout bridge carries matching Planner provenance. A bridge without matching provenance is treated as a legacy/Saved Trip flow even when its route, dates, and participant count happen to match a stored Planner. External handoff state is never written back into either input.

Other current browser keys include `selectedBrand`, `byebi_locale`, the retired per-trip booking-status key used only for one-time migration, and a session-scoped analytics identifier. Each has a narrow owner and must not become a substitute for domain contracts.

## OpenAI boundary

`/api/chat/openai-stream` accepts a request validated by `shared/chatSchemas.ts` and streams server-sent events. `server/services/openai.ts` provides the tool loop.

- OpenAI tool arguments are untrusted input.
- Planner updates are parsed by shared Zod schemas before becoming application state.
- Tool execution is bounded and provider/service errors are sanitized.
- Chat text and raw model output are not canonical state.
- Provider credentials and OpenAI credentials remain server-side.

## Provider architecture

ByeBi currently uses an external-handoff-only travel model. No live flight or hotel inventory provider is active in the runtime.

- `/api/flights/search` is retained as a backward-compatible URL-construction endpoint. It validates trip search inputs, resolves IATA codes, applies Aviasales' 9-adult search cap, and returns a non-exact Aviasales search handoff. It performs no external inventory request.
- `client/src/lib/affiliateLinks.ts` builds the Booking.com hotel search handoff from destination, dates, and the real group size.
- `client/src/lib/getyourguide.ts` resolves the approved GetYourGuide destination-level handoff.
- The active Travel Options UI does not display internal flight or hotel prices, availability, offer cards, or booking confirmations.
- Aviasales, Booking.com, and GetYourGuide own current price, availability, terms, and booking confirmation on their external sites.

The retired Amadeus Self-Service runtime, OAuth/configuration helpers, flight/hotel search adapters, normalized Amadeus result contracts, and internal hotel-booking dead code are not part of the current codebase.

## Provider Results

There is no active live Provider Results contract for flights or hotels. The Provider Results domain remains a durable architectural boundary so that a future verified provider can be integrated without placing provider data inside the Planner or Saved Trip.

Any future live provider integration must:

- normalize untrusted provider data at a validated boundary;
- identify provider and freshness;
- state price scope and currency precisely;
- distinguish live, empty, unavailable, and stale states;
- never fabricate prices, availability, inventory, or booking success;
- keep raw provider payloads out of Planner and Saved Trip persistence.

## Selection state

There is no active persisted flight or hotel Selection contract because there are no verified live flight or hotel results to select.

The former browser key `byebi:providerSelections:v1` is retired. Current Travel Options ignores and removes stale values from that key, and **New trip** also clears it. A future provider selection contract must be introduced deliberately and versioned rather than reusing stale Amadeus-era data.

## Saved Trip persistence

Saved Trips are represented by the `trips` table and `shared/schema.ts`.

- `POST /api/trips` requires authentication and supplies the authenticated user ID server-side.
- The save action converts validated planning context into a Saved Trip payload.
- Equivalent saved trips are detected to avoid duplicates.
- User trip reads, deletes, and invite management enforce ownership.
- Public sharing exposes a constrained `publicSharedTripSchema` through a revocable token.
- Manual Trip Hub organization state is stored separately in `trip_organization_statuses`, one row per trip, with `pending | done` values for flight, hotel, and activities.
- `GET/PUT /api/trips/:tripId/organization-status` require authentication and enforce ownership through the Saved Trip.
- `GET /api/trips/organization-statuses` returns one owner-scoped batch overview for Dashboard progress, including non-persisted all-`pending` defaults without creating rows.
- A missing organization-status row is represented as a non-persisted all-`pending` default; the first user change creates the durable row.
- The retired browser key `byebi:trip-booking-status:v1:<tripId>` is migrated once only when no server status exists, then removed.
- Public shared-trip responses never include the owner's organization checklist.

The current Saved Trip schema uses a `budget` column. At the product boundary this value is per person; future schema evolution should make that semantic explicit without silently changing stored meaning.

## Expense coordination

Splitta expense persistence uses integer minor currency units.

- `expenses.amount` is stored in cents (or the corresponding minor unit).
- `expense_groups.total_amount` uses the same minor-unit semantics and is server-authoritative.
- Expense create, update, and delete operations update the group total atomically with the expense mutation.
- Migration `20260926170000_repair_expense_group_totals.sql` backfills existing totals from persisted expenses and makes `total_amount` non-null.
- Client surfaces format minor units for display and must not persist euro-denominated floating-point totals.

## Authentication boundary

Supabase Auth owns sign-up, sign-in, password recovery, browser session refresh, and sign-out.

- The browser attaches the current access token to API requests.
- Server middleware validates tokens and resolves the authenticated user.
- Protected routes include saved trips, Trip Hub ownership, expenses, and administrative operations.
- Browsing, Planner drafting, Travel Options, and external handoff do not require Saved Trip persistence.
- Unauthenticated **Save trip** sends the user to `/auth?next=/checkout`; the valid browser context remains available for the explicit post-auth save.

## Integrations

- OpenAI — conversational planning tool loop.
- Aviasales, Booking.com, GetYourGuide — approved external travel handoffs. No live flight or hotel inventory provider is currently active.
- Supabase — authentication and hosted PostgreSQL integration.
- Stripe and Printful — separate merchandise checkout and fulfillment flow.
- Resend — transactional and newsletter email.
- Zapier — authenticated administrative webhook management.

Travel-provider behavior must not be conflated with merchandise payment behavior.

## Analytics

`shared/analyticsSchemas.ts` is the event-name and payload authority. The client sends validated-shape events to `/api/analytics/events` and `/api/analytics/affiliate-clicks`.

- Core funnel and discovery events use an anonymous session ID.
- Affiliate clicks support Aviasales, Booking.com, and GetYourGuide placements.
- Tracking is best effort and must not block product actions.
- Server persistence excludes chat content, full outbound URLs, tokens, and provider payloads.

## Localization

`client/src/contexts/LanguageContext.tsx` supports `it`, `en`, and `es`. Italian loads eagerly; English and Spanish locale JSON files load on demand. Locale is stored in `byebi_locale`, and the document language is updated.

Canonical enums, IDs, city mappings, provider payloads, and stored domain values must remain locale-independent. Copy changes require aligned keys in all three locale files.

## Security

- Validate untrusted input with shared or server-owned Zod schemas.
- Keep API keys, service roles, and provider secrets on the server.
- Enforce resource ownership server-side, never only in routing or UI.
- Sanitize errors and avoid logging PII, credentials, tokens, or provider payloads.
- Restrict external navigation to approved HTTPS providers.
- Preserve Stripe webhook signature verification and idempotency for merchandise.
- Treat public trip-sharing tokens as secrets and expose only the public schema.

## Testing and verification

The repository uses Vitest and Testing Library plus integration tests for routes and services.

- `npm run check` — TypeScript validation.
- `npm test` — test suite.
- `npm run build` — Vite client plus bundled Express server.
- `npm run verify` — check, tests, and build.
- `npm run smoke:production -- https://byebi.it` — explicitly requested production smoke.
- `npm run smoke:travel:production -- https://byebi.it` — explicitly requested travel-handoff smoke. It validates the Travel Options application shell and the Aviasales handoff contract; it does not require retired live flight/hotel inventory APIs.

CI runs `npm run verify` on pull requests and pushes to `main` with Node.js 20.

## Deployment

GitHub `main` is canonical. Replit is the deployment runtime.

```text
feature branch -> pull request -> CI/review -> main -> Replit sync -> manual republish
```

Do not treat Replit-local history as canonical, and do not automatically sync, publish, or resolve divergence. See [ADR-0005](adr/0005-github-main-canonical.md).

## Known technical debt and transition points

- `/checkout` is named like an internal checkout but functions as a provider-options and external-handoff page.
- `currentItinerary` remains the compatibility input for `/checkout` while the versioned Planner uses its own key.
- Saved Trip storage names the per-person value `budget`, so the semantic relies on product and conversion invariants.
- Some older UI surfaces use page-specific styling instead of only shared design primitives.

These are documentation findings, not authorization to refactor or migrate them.
