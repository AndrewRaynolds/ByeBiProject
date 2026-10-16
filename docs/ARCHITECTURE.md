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

- `/` — neutral ByeBi brand choice on a fresh entry, then the selected branded homepage and Planner entry for the current session. Deep links retain the stored brand.
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

## Organizer-curated candidate links

`trip_candidate_options` is a child table of `trips` with cascade deletion. Each entry has a category, source URL, title, source label and optional descriptive fields/indicative price note. It belongs to the authenticated owner of the Saved Trip, enforced by Express routes and owner-scoped storage methods. PostgreSQL RLS is enabled and direct `anon`/`authenticated` table grants are revoked.

The `/api/trips/:tripId/options` family manages explicitly saved links. `POST /api/trips/:tripId/options/preview` attempts a metadata-only HTML preview of a user-provided public URL. It is authenticated, owner-checked and rate limited. The fetcher permits standard HTTP(S) ports, pins a validated public IPv4 DNS destination for each request, revalidates redirects, and enforces request timeout and response size limits. It never fetches stored preview image URLs, user credentials or provider private APIs. Metadata may be unavailable, in which case the editor falls back to manual fields. The parser reads a 262,144-character HTML prefix and at most eight values per metadata key. Image selection tries secure Open Graph, Open Graph image/image:url, then Twitter image/image:src, skipping syntactically prohibited targets. Relative URLs resolve against the final validated page URL; no image probes or JSON-LD parsing are added. The browser validates linked HTTP(S) image URLs, shows their actual host and switches to a category cover on load failure. The host label is computed, not a new persisted provenance field.

Candidate links are **neither Provider Results nor persisted verified Selections**, and must not mutate the Planner, Legacy `currentItinerary`, affiliate integrations or the separate manual booking checklist. Apply the versioned migration before the code is published.

## Planner contract

The canonical Planner contract is `shared/plannerSchemas.ts`.

The current implementation:

- uses `PLANNER_CONTRACT_VERSION = 1`;
- maps `byebro` to `bachelor` and `byebride` to `bachelorette`;
- models origin and destination as canonical locations with optional display labels;
- stores ISO date-only start and end values;
- validates 1–50 participants;
- optionally stores integer `budgetPerPerson` values from 1 to 100,000;
- optionally stores an archetype or interests;
- distinguishes `draft` from `review-ready`;
- rejects brand/party-type mismatches and invalid date order.

The version is an implementation fact, not a permanent architectural decision. Breaking persisted-contract changes require a new version or an explicit migration/compatibility strategy. See [ADR-0004](adr/0004-versioned-planner-contract.md).

Editorial preference outlines live in the shared client review editor, not in a separate brand engine or provider integration. The editor holds temporary text fields; applying an outline is local to the edit form and requires the existing explicit review save to produce validated Planner preferences. Existing archetype/interests strings are reused, with no new persisted IDs, keys, schema version or migration. Text retains the language in which the user applied/edited it; changing locale does not rewrite existing intent. Brand-specific introduction/order and model voice do not change validation, required fields, provider behavior or the available outline catalog.

## Editorial program contract foundation

`shared/programSchemas.ts` and `shared/programTransitions.ts` define an independent `editorial_program` v1 proposal and pure validated actions. The optional shared EditorialProgram component consumes these transitions in Planner review; provider adapters, AI tools and Saved Trip serialization do not consume the program. The existing Planner v1 and persisted contracts remain unchanged; no migration is introduced. Program drafts use independent browser keys described below.

The program binds to Planner brand/createdAt and a snapshot of canonical origin/destination, dates and participants. Read validation checks real calendar dates within the existing date utility's supported years (2024–2100), without requiring program dates to be future dates. Creation and transitions require the current validated review-ready Planner. Ideas and scheduled items have separate IDs and bounded arrays (12/100). Every action carries expectedRevision; stale actions and revision overflow are rejected. This in-process check is not an atomic cross-tab/database write: future persistence must compare revisions atomically within its own boundary.

Ideas carry a bounded editorial catalog ID/version; scheduled items copy their source lineage, optional duration and a literal not_checked feasibility value. Titles are descriptive text and provenance is lineage, not proof of verified facts or a live provider result. Rotating ideas preserves already chosen items and their originating idea ID, even when the original idea is no longer in the current catalog view. The next UI must render editorial content from its trusted catalog and preserve user edits rather than trusting arbitrary generated source claims.

Context assessment exposes association, changed route/date/group, changed Planner timestamp and invalid item IDs. A timestamp difference alone does not identify a preference change and does not infer one. Explicit rebase can atomically confirm the new context and apply supplied item date/slot corrections; it preserves all item IDs, titles, durations and provenance and cannot silently delete items. Invalid or colliding corrections reject the whole transition. Budget/preference-only edits do not reschedule chosen items. No new canonical data is stored in legacy activities or currentItinerary.

## Local program editor and persistence

`client/src/lib/programStorage.ts` validates independent per-brand keys `byebi:programDraft:v1:byebro` and `...:byebride`. Invalid/unknown-version or foreign-Planner bytes remain untouched until explicit replacement. Writes require Web Locks, compare the raw saved snapshot inside the exclusive lock (not only its numeric revision), revalidate the current stored Planner, and commit only validated transitions. A failed write is not announced as saved. Unsupported browsers can read drafts and use the core Planner, but cannot write programs; an attempted program write explains the limitation. No unsafe localStorage lock emulation is used.

Storage events block stale program edits without automatically applying or discarding unsent text. Explicit Reload brief and program refreshes the current validated Planner and program, clearing the unsent form. Changing travel context uses an atomic rebase transition with visible per-item date/slot corrections. The shared New trip UI serializes program removal and Planner reset through the same lock; the unsupported-browser path preserves core reset behavior. This is coordination for program writes/reset, not a cross-domain transaction for all existing Planner writes.

The editor is outside the brief edit form, hidden while editing essential details and reset for another brand/Planner identity. The five generic idea titles originate in local translations; existing user/scheduled text is preserved across locale changes. Explicit Refresh ideas in this language updates only the idea catalog and preserves both scheduled items and unsent item form text. Programs contain no provider credentials, prices, inventory, booking states or expense records; no new analytics events carry their contents. Device-local drafts follow the existing Planner’s local browser scope, not a new authenticated account scope.

## Owner-scoped saved preference updates

`shared/tripPreferencesSchemas.ts` defines an additive strict PATCH body (`notes`, `expectedRevision`) and a read snapshot (`notes`, `revision`). New notes are trimmed, nonempty, at most 20 strings of 100 characters; an empty array explicitly removes them. Historical read notes remain intact, including null. The Planner v1, Saved Trip table shape and deduplication identity are unchanged; no migration is required.

`GET /api/trips/:tripId/preferences` and `PATCH` at the same path require authentication and owner scope. `server/tripPreferences.ts` derives a SHA-256 content revision bound to trip ID, owner ID and raw stored notes. PostgreSQL updates run in a transaction with an owner-scoped row lock, compare the revision and write only activities. MemStorage applies the same conflict policy synchronously. Identical already-applied retries succeed safely; other stale edits return 409 without writing. A content revision detects a different current value, not a history of all intervening edits. Missing or non-owned trips return 404; responses are not cached. There is no new opaque token that grants access.

Checkout retains the matched existing trip ID separately; POST save HTTP 200 must carry a valid ID before preference comparison can proceed. The shared client confirmation component reloads on conflicts without automatically retrying writes, rejects malformed acknowledgements, blocks duplicate sends and ignores obsolete responses after account/context changes. Successful edits invalidate owner trip lists, trip detail, organization overview and cached public shared-trip views; they do not create trip_saved events. Draft preferences and existing Saved Trip notes have separate owners and update explicitly.

## Planner persistence and compatibility

The versioned Planner draft is stored locally by `client/src/lib/plannerStorage.ts`. `byebi:plannerDraft:v1` remains the active/backward-compatible value used by the checkout bridge, while brand-isolated resumable drafts use `byebi:plannerDraft:v1:byebro` and `byebi:plannerDraft:v1:byebride`.

The v1 field shape is preserved. Resumable drafts with valid essential route/date/participant details are promoted to review-ready even if budget or preferences remain null. Existing supplied values remain unchanged. Required details still validate normally. Saved-trip budget is nullable via migration `20261013090000_make_trip_budget_optional.sql`, which must deploy before application code; no values are fabricated. Older application versions require a reload to use the relaxed readiness rule.

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

Expense groups can be deleted through authenticated `DELETE /api/expense-groups/:id`. Storage scopes deletion to the owner; the existing expense foreign key cascades without a new migration. Linked Saved Trips remain intact.

## OpenAI boundary

`/api/chat/openai-stream` accepts a request validated by `shared/chatSchemas.ts` and streams server-sent events. `server/services/openai.ts` provides the tool loop.

- OpenAI tool arguments are untrusted input.
- Planner updates are parsed by shared Zod schemas before becoming application state.
- Tool execution is bounded and provider/service errors are sanitized.
- Chat text and raw model output are not canonical state.
- `shared/plannerSuggestions.ts` defines a bounded editorial ID catalog, additive `plannerAction` requests and version-1 SSE `suggestions` packets. Packets contain at most two unique allowlisted IDs plus brand and draft timestamps; clients derive labels/reasons from local translations, not generated text or URLs. This version is an ephemeral event version, not a new persisted Planner version.
- Destination actions on `/api/chat/openai-stream` are validated by `chatStreamRequestSchema` and handled by `server/services/plannerSuggestions.ts` without OpenAI credentials or calls. They require a draft with no destination, reject unsupported/same-origin choices and never save a trip. More ideas skips already shown IDs and restarts after the catalog is exhausted. Selection applies only the canonical destination through the existing Planner update contract.
- Ordinary chat appends suggestions for its final validated Planner snapshot. Request-generation/brand guards, event validation and draft matching prevent stale packets from becoming current choices. Displaying or rotating suggestions does not write Planner state. Selecting a destination returns the existing validated `update_planner` tool-result shape, preserving older client compatibility; ordinary chat without model configuration still returns unavailable.
- The shared update tool accepts optional `clearFields` (`budgetPerPerson`, `preferences`); omitted/null/empty preserves the original null-as-no-change semantics. Explicit clearing requires null update values for the named optional fields. The persisted Planner v1 shape is unchanged.
- `server/services/plannerConversation.ts` builds local follow-ups from the validated before/after snapshots, without another model call. It acknowledges actual changes, requests only the next essential detail, and does not mutate the Planner when presenting editorial destination ideas. Free-form model replies still depend on prompt adherence.
- The legacy checkout `activities` array is an adapter for preference notes, not selected or scheduled activities. `getPlannerPreferenceNotes` centralizes that conversion; no legacy values are reclassified. Qualitative legacy budget bands are not converted into numeric save payloads; they require review. Previously saved numeric budgets are unchanged.
- The optional validated request `locale` (`it`, `en`, `es`) controls model instructions and local follow-ups/errors. Legacy clients without it fall back to user-message language detection.
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
- Protected routes preserve their current safe internal path in the `next` query parameter so an expired or missing session returns the user to the originally requested Dashboard, Trip Hub, or Splitta route after authentication. External redirect targets remain rejected by `getSafePostAuthPath`.

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

### Local budget allocation boundary

`shared/budgetAllocationSchemas.ts` owns the strict version-1 `budget_allocation` contract, nullable integer EUR allocations and pure summary rules. This additive contract does not change Planner, Saved Trip, expense or program schemas and requires no database migration. Its source is user input, its scope is per person for the whole trip, and its basis records cap, participants, route and dates for explicit review. Brand plus Planner creation identity prevents attaching another trip's draft.

`budgetAllocationStorage.ts` uses the separate `byebi:budgetAllocation:v1:<brand>` key. Reads preserve invalid/unknown-version/foreign data; only an explicit replacement writes new data. Writes compare exact stored bytes and current Planner inside the same native Web Lock used by program writes and New trip. A stale tab must reload, storage failure never confirms success, and unsupported locking disables allocation writes while core planning remains available. Reset clears both current-brand optional drafts under that lock. This is browser-origin storage following existing Planner scope, not account-isolated or server-synced persistence. No analytics or external provider payload includes these allocations.

### Google OAuth client boundary

`VITE_GOOGLE_AUTH_ENABLED=true` opts in at build time; absent/false keeps the entry hidden. `googleAuth.ts` creates a lazy second Supabase client solely for Google PKCE, with the unique `byebi:googleOAuth:v1` namespace in sessionStorage, auto-refresh and automatic URL detection disabled. This isolates per-tab code verifiers from the existing email/password/recovery client and avoids globally changing its implicit-flow behavior. Web Crypto is required, preventing a plain PKCE fallback. Only basic `openid email profile` scopes are requested, without offline Google access.

A strict version-1 per-tab attempt stores a UUID, timestamp and safe internal return path, not trip data. Only its nonce is included in the same-origin `/auth/callback` redirect. Supabase owns the OAuth state and PKCE challenge; the application nonce additionally correlates the tab context. The attempt expires after ten minutes. A new attempt replaces the previous verifier, while separate tabs keep independent sessionStorage. Code exchange is single-flight per callback document, including StrictMode effect replay. A mismatched callback cannot clear a newer attempt.

The callback is rendered by App before the brand-selection gate and outside AuthProvider, so a prior user session cannot bypass the exchange. The primary client disables URL session detection only on this callback path. After a successful exchange the callback transfers only Supabase access/refresh tokens through the existing client's setSession, checks the returned identity, removes temporary OAuth storage and performs a full internal navigation so AuthProvider reloads normally. No custom user or role is written; server bearer validation and app_metadata role checks remain authoritative. Google provider tokens are not transferred into the primary session.

Callback query/fragment values are removed before awaited exchange; raw provider errors are neither rendered nor logged by this flow. Invalid/expired/missing codes never fall back to an existing session as proof of success. getSafePostAuthPath rejects external/ambiguous targets, backslashes, controls, normalized protocol-relative paths and auth-route loops. No post-auth autosave or new analytics event is added. See `docs/google-auth-setup.md` for external setup and remaining staging checks.

## Durable Trip Hub planning

`shared/tripPlanningSchemas.ts` is the Saved Trip planning v1 contract. `trip_planning` stores one JSONB plan and a monotonically increasing integer revision per trip, with cascading deletion. Reuse of the existing program item/provenance schema and budget allocation schema does not carry over browser Planner identity or storage.

- Owner-only `GET/PUT /api/trips/:tripId/planning` return `Cache-Control: no-store`. Missing plans produce revision 0 and empty allocations/items, with the existing trip's nullable per-person budget, without writing.
- PUT validates the full snapshot, `expectedRevision`, and `expectedContextRevision` (SHA-256 of trip ID, route, dates, participants, party type and saved budget). Activities must fit the trip dates and have unique IDs and day/slot positions.
- DatabaseStorage locks the owner-scoped parent trip row before reading/comparing the planning revision, including on first creation. Plan/revision and `trips.budget` update in the same transaction. Mismatch returns 409 without mutation. Reads use one joined statement for a consistent trip/plan snapshot.
- Client queries refetch on focus/reconnect with staleTime 0. Planning query caches are scoped by authenticated owner and removed when unused; the editor is hidden when the session no longer owns the trip. Fresh query results never replace unsaved edits; changed revision/context blocks saving until explicit reload. Successful writes update planning cache and invalidate trip/detail and owner list queries. Failed or uncertain writes preserve edits and require a read before resubmitting.
- Migration `20261016120000_add_trip_planning.sql` enables RLS and revokes direct PUBLIC/anon/authenticated access, following the API-only organization-checklist pattern. No anonymous or authenticated direct-table policy grants access. The existing server database role must own the table or retain its established privileged access. Public invite responses are unchanged and exclude this private plan.
- `tripPlanningImport.ts` reads local drafts only on a preview click. Single-destination route/date/participant/brand and budget must match, and paired drafts must share Planner identity. Matching context is not proof of identity: the UI shows the data and requires explicit use followed by save at revision 0. Local drafts are never removed.

Production migration and deployment remain separate authorized operations. Deploy the additive migration before application code through the existing Supabase/GitHub integration; never schema-push or apply it directly to production. No existing rows are backfilled. To roll back the application, retain the additive table and data rather than dropping it.

Real PostgreSQL regression: `node scripts/test-trip-planning-postgres.mjs --pg-bin /absolute/path/to/postgres/bin` creates a disposable loopback-only cluster, applies the actual migration there, verifies persistence, two-connection concurrency, atomic rollback, cascade and RLS/grants, then removes only that temporary cluster. It ignores DATABASE_URL and application PG configuration.
