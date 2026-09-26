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
- A `review-ready` Planner is explicitly converted into `currentItinerary` before navigating to `/checkout`, with a small provenance marker tied to that Planner snapshot.
- The bridge removes the legacy `selectedFlight` value.
- Unknown or corrupt versioned Planner values are discarded rather than trusted.

The compatibility bridge is transitional. New work should not expand `currentItinerary` into a canonical cross-domain model.

The provider-options page now adapts these inputs into a narrow search context. It uses the valid `review-ready` Planner only when the checkout bridge carries matching Planner provenance. A bridge without matching provenance is treated as a legacy/Saved Trip flow even when its route, dates, and participant count happen to match a stored Planner. Provider Results and Selections are never written back into either input.

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

Booking.com and GetYourGuide are currently handoff destinations, not booking APIs. Aviasales receives the non-exact flight search handoff; Amadeus supplies current search data where available.

## Provider Results

Shared response contracts live in `shared/flightSchemas.ts` and `shared/hotelSchemas.ts`.

- Flight results include the provider-supplied Amadeus offer identifier, provider, segments, airlines, price/currency, searched-passenger price scope, requested group size, data status, fetch time, and a separate non-exact Aviasales search handoff.
- Hotel results include the Amadeus hotel/offer identifiers, provider, total-stay price/currency, stay dates, requested group size, and explicit quoted occupancy. Amadeus currently quotes at most two adults per room, so `priceTotal` is not represented as a full-group total.
- Results are sorted deterministically before presentation.
- In canonical product flows, provider failures or empty results must surface as empty, error, or explicit `unavailable` states; fabricated provider offers are forbidden.
- Hotel search returns real provider results, an empty live result, or an unavailable state. The former non-production synthetic hotel inventory fallback is no longer part of the search path.
- A valid handoff URL may still be provided when live flight data is unavailable; it must not be presented as confirmed availability.

Provider Results remain request-scoped UI/query data and are not saved as Planner or Saved Trip data. Only the small canonical display/handoff subset required for an explicit selection may be persisted; raw provider payloads are not persisted.

## Selection state

The shared, versioned Selection contract is `shared/providerSelectionSchemas.ts`, currently version 1, and browser persistence uses `byebi:providerSelections:v1`.

- Flight and hotel choices are explicit, independently optional, and contain only canonical display and handoff metadata.
- A deterministic provider-search fingerprint covers origin, destination, dates, and participants. Planner-only preference changes do not invalidate flight or hotel selections; material provider-search changes do. A corrupt, unknown-version, or non-matching persisted selection is discarded.
- After each successful live provider response, a restored selection is reconciled by provider identity. Matching selections are refreshed from the current normalized result and disappeared offers are cleared. Transient unavailable/error states retain persisted choices but do not present their stored prices or handoff actions as current live data.
- Selection does not modify Planner state, `currentItinerary`, or Saved Trip persistence and does not trigger authentication.
- The Aviasales handoff remains a search handoff (`exactOffer: false`), even when an Amadeus offer is selected.
- GetYourGuide remains a real city-level destination handoff. There is no persisted activity selection because no verified item-level inventory contract exists.

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
- Saved Trip storage names the per-person value `budget`, so the semantic relies on product and conversion invariants.
- The unused internal `bookHotel()` service, including legacy non-production mock-booking behavior, remains dead code with no public API route. It is outside the external-handoff flow and should be removed in a separately scoped cleanup.
- Some older UI surfaces use page-specific styling instead of only shared design primitives.

These are documentation findings, not authorization to refactor or migrate them.
