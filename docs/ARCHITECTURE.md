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

The versioned Planner draft is stored locally under `byebi:plannerDraft:v1` by `client/src/lib/plannerStorage.ts`.

Current compatibility behavior:

- `currentItinerary` is the legacy checkout context.
- A valid legacy value may be migrated into a Planner draft.
- A `review-ready` Planner is explicitly converted into `currentItinerary` before navigating to `/checkout`.
- The bridge removes the legacy `selectedFlight` value.
- Unknown or corrupt versioned Planner values are discarded rather than trusted.

The compatibility bridge is transitional. New work should not expand `currentItinerary` into a canonical cross-domain model.

Other current browser keys include `selectedBrand`, `byebi_locale`, per-trip booking-status keys, and a session-scoped analytics identifier. Each has a narrow owner and must not become a substitute for domain contracts.

## OpenAI boundary

`/api/chat/openai-stream` accepts a request validated by `shared/chatSchemas.ts` and streams server-sent events. `server/services/openai.ts` provides the tool loop.

- OpenAI tool arguments are untrusted input.
- Planner updates are parsed by shared Zod schemas before becoming application state.
- Tool execution is bounded and provider/service errors are sanitized.
- Chat text and raw model output are not canonical state.
- Provider credentials and OpenAI credentials remain server-side.

## Provider architecture

Provider responsibilities are isolated from UI rendering:

- `server/services/amadeus-flights.ts` and `amadeus-hotels.ts` call Amadeus.
- `server/services/flightSearch.ts` normalizes and deterministically ranks live flight results, while building an Aviasales handoff URL.
- `server/services/hotelSearch.ts` normalizes and sorts live hotel results.
- `/api/flights/search` and `/api/hotels/search` validate queries with shared schemas.
- `client/src/lib/affiliateLinks.ts` and `aviasales.ts` build approved external handoffs.
- `client/src/lib/getyourguide.ts` resolves curated GetYourGuide city links.

Booking.com and GetYourGuide are currently handoff destinations, not booking APIs. Aviasales receives the flight booking handoff; Amadeus supplies current search data where available.

## Provider Results

Shared response contracts live in `shared/flightSchemas.ts` and `shared/hotelSchemas.ts`.

- Flight results include provider price/currency, schedule summary, stops, data status, and an external redirect flow.
- Hotel results include total-stay price/currency and stay metadata.
- Results are sorted deterministically before presentation.
- In canonical product flows, provider failures or empty results must surface as empty, error, or explicit `unavailable` states; fabricated provider offers are forbidden.
- Known exception: legacy non-production hotel-search fallback code can synthesize mock hotel results and prices when Amadeus returns no hotel IDs, and may label them `live`. This is transitional technical debt, not valid provider inventory or a pattern for production semantics or new feature work.
- A valid handoff URL may still be provided when live flight data is unavailable; it must not be presented as confirmed availability.

Provider Results are currently request-scoped. Hotel results are held in component state, while the checkout consumes the flight handoff URL and does not persist the returned flight list. Results are not saved as Planner or Saved Trip data.

## Selection state

The current `/checkout` implementation stores hotel selection in component state. A flight handoff URL is derived from the validated trip context or recovered through `/api/flights/search`. Activity handoff is destination-based.

There is not yet a shared, versioned Selection contract. Until one is intentionally introduced:

- do not persist raw provider payloads;
- do not infer selection from a displayed result;
- do not place provider selections inside the Planner contract;
- do not claim selection or redirect as booking confirmation.

## Saved Trip persistence

Saved Trips are represented by the `trips` table and `shared/schema.ts`.

- `POST /api/trips` requires authentication and supplies the authenticated user ID server-side.
- The save action converts validated planning context into a Saved Trip payload.
- Equivalent saved trips are detected to avoid duplicates.
- User trip reads, deletes, and invite management enforce ownership.
- Public sharing exposes a constrained `publicSharedTripSchema` through a revocable token.

The current Saved Trip schema uses a `budget` column. At the product boundary this value is per person; future schema evolution should make that semantic explicit without silently changing stored meaning.

## Authentication boundary

Supabase Auth owns sign-up, sign-in, password recovery, browser session refresh, and sign-out.

- The browser attaches the current access token to API requests.
- Server middleware validates tokens and resolves the authenticated user.
- Protected routes include saved trips, Trip Hub ownership, expenses, and administrative operations.
- Browsing, Planner drafting, Provider Results, and external handoff do not require Saved Trip persistence.
- Unauthenticated **Save trip** sends the user to `/auth?next=/checkout`; the valid browser context remains available for the explicit post-auth save.

## Integrations

- OpenAI — conversational planning tool loop.
- Amadeus — flight and hotel search.
- Aviasales, Booking.com, GetYourGuide — approved external travel handoffs.
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
- `npm run smoke:travel:production -- https://byebi.it` — explicitly requested travel smoke.

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
- Provider Results and Selections are separate in runtime behavior but do not yet share first-class cross-layer domain contracts.
- Hotel selection is transient component state and is not included in Saved Trip persistence.
- Saved Trip storage names the per-person value `budget`, so the semantic relies on product and conversion invariants.
- **Non-production hotel mock fallback** — Legacy development/test hotel fallback can synthesize hotel results and prices and may mark them `live`. Remove or isolate it in a future functional task before treating hotel result provenance as trustworthy across all environments.
- Some older UI surfaces use page-specific styling instead of only shared design primitives.

These are documentation findings, not authorization to refactor or migrate them.
