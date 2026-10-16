# ByeBi Product Requirements

## Purpose

This document is the product authority for ByeBi. It defines intended behavior, scope, boundaries, and user journeys. Implementation details belong in [ARCHITECTURE.md](ARCHITECTURE.md); UI rules belong in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); durable rationale belongs in [adr/](adr/README.md).

## Product vision

ByeBi helps groups turn an early bachelor or bachelorette trip idea into a clear, actionable travel brief. It combines guided discovery, conversational planning, transparent external provider handoffs, and an optional saved Trip Hub. Live provider options and explicit result selection may be added again only when a verified provider integration is available.

The product should reduce coordination work without pretending to be a travel agency or booking engine.

## Target users

- Organizers planning a bachelor or bachelorette trip for a group.
- Participants comparing destinations, dates, activities, and travel options.
- Users who want inspiration before they know the destination.
- Users who want a structured plan before visiting external booking providers.

## One product, two brands

ByeBro and ByeBride are brand variants of one product and one behavioral engine.

| Brand | Canonical party type |
| --- | --- |
| `byebro` | `bachelor` |
| `byebride` | `bachelorette` |

Brand variants may change accents, imagery, icons, examples, copy, and tone. They must not create separate feature engines, state models, provider logic, or product capabilities solely for branding. See [ADR-0001](adr/0001-single-bro-bride-engine.md).

The editorial positioning differs without restricting user choice: ByeBro uses a direct, playful voice centered on group camaraderie; ByeBride uses an attentive, imaginative voice centered on the person being celebrated and shared memories. Neither positioning implies interests, gender composition, budget or preferred activities.

In review edit mode, both brands offer the same optional editorial preference outlines: group camaraderie, a moment for the guest of honor, and exploration/local culture or food. Presentation order and introduction may differ by brand; no outline is selected automatically. Previewing changes nothing. Explicitly using an outline replaces only the two editable preference fields, with a visible warning; users may customize, combine or clear the notes. Only Save changes validates and updates the draft. These are intent notes, not packages, selected activities, schedules or provider filters. Cancel preserves the prior draft.

## Core journey

1. A fresh visit to `/` shows the neutral ByeBi brand choice, even when a previous brand is stored. The user chooses ByeBro or ByeBride; deep links retain the stored brand and selecting a brand does not clear Planner drafts.
2. The user discovers destinations or experiences, or starts with the AI Planner.
3. The Planner collects and validates the trip intent.
4. The product presents a reviewable travel brief before provider handoff.
5. The product presents transparent external handoffs for flights, hotels, and activities using the validated trip context.
6. The user continues to the identified external provider to inspect current prices, availability, and options.
7. Travel booking and payment take place on that external provider.
8. The user may explicitly save the trip; authentication is requested only when persistence requires it.
9. Saved trips are available in the Trip Hub for later coordination and related tools.

Discovery and planning must remain useful even when a provider is unavailable. A provider failure must not become invented availability or a false booking success.

## Discovery

Discovery helps users explore destinations and experiences before or during planning.

- Destination and experience pages may filter, compare, and explain available ideas.
- Discovery can hand selected context into the Planner.
- Discovery content must distinguish inspiration from live provider inventory.
- The primary action on entry and discovery surfaces is the AI Planner; exploration and comparison are secondary actions.
- The homepage Planner action accepts an optional initial message. Empty or whitespace-only input opens guided planning without sending a message or resetting an existing draft; typed input retains the explicit chat-start behavior. Opening alone does not save a trip, require authentication or count as a chat message.
- Discovery must preserve the selected brand and current locale.

## Planner

The Planner represents what the user wants, not what a provider offers.

Required planning concepts are:

- origin;
- destination;
- start and end dates;
- participant count;
- brand and its canonical party type.

Budget and group preferences are optional notes. The Planner does not ask for them or block review, partner handoffs or explicit save when they are absent. They do not select activities or filter external partner searches. Unknown budget remains null; preferences remain absent rather than invented.

Conversational planning acknowledges validated changes and asks at most one useful question per controlled follow-up. Destination inspiration is editorial, does not claim current prices or availability, and never updates intent until the user chooses a destination. Both brands use the same policy and offer the same options without inferring interests from gender.

While the destination is unknown, the Planner offers Inspire me and up to two editorial destination choices with short reasons. More ideas rotates through a bounded catalog, excluding the known origin; it never changes the draft. Choosing a destination is an explicit, validated action that updates only that field and may make the brief ready for review. These actions do not require a model call, authentication or Saved Trip persistence. Suggestions are transient, tied to the current draft and request, and discarded on close, New trip or brand change. The initial catalog is generic inspiration, not a claim of personalization by budget, interests, price or availability.

Volunteered budgets refer to one person for the whole trip. Ambiguous scope requires clarification; a group-total conversion is proposed for confirmation rather than silently applied. Qualitative legacy bands such as low/medium/high are not numeric amounts: partner searches remain usable, but explicit save requires reviewing that legacy budget, entering a confirmed amount in the Planner or explicitly discarding the band with Continue without a budget. Existing Saved Trip numeric budgets retain their meaning. Users may explicitly remove optional budget or preference notes during chat or clear them in review.

`budgetPerPerson` is always the budget for one participant. It must never be silently interpreted as the total group budget. See [ADR-0002](adr/0002-budget-per-person.md).

The Planner may use conversational AI to collect or clarify intent. AI output is a proposal until validated by the application contract. Missing, invalid, contradictory, or unsupported values require correction or clarification.

## Explicit updates to saved preferences

Changing a Planner draft does not overwrite an existing Saved Trip. Checkout compares saved and draft preference notes for an equivalent owned trip, including when a concurrent explicit save returns an existing trip. Only the separate Update saved preferences action replaces the notes; an empty draft uses an explicit Remove saved preferences action. Show both versions and explain that preferences on an existing shared link also change. Neither action creates a duplicate trip, changes budget, checklist, candidate links or expenses, nor emits a new-trip save event. A concurrent conflicting edit reloads the current version and requires another explicit confirmation. Historical notes remain readable without truncation; new writes follow bounded validated notes. The legacy activities column remains preference notes, not scheduled activities.

## Optional local editorial program

The review summary exposes an optional collapsible program editor backed by the separate version-1 editorial program contract and pure transitions. Ideas do not become scheduled activities until an explicit add action supplies a day and morning/afternoon/evening slot. Custom items, edits and removal are explicit. Both brands use the same operations; preferences are never reclassified as activities. The contract admits no price, availability, booking or verified-feasibility fields. A duration is optional and unverified; a calendar slot does not establish practical feasibility.

Opening the editor reads without writing. Creating/replacing a draft, adding, editing, removing and refreshing editorial ideas require explicit actions. Five generic ideas and all controls are available in IT/EN/ES for both brands. The program is a device-local draft, not part of Save trip, Trip Hub or a shared link; this boundary is stated in the editor and on Checkout. Closing/reopening and refresh resume it; New trip clears only that brand’s program draft. There is no program API or server synchronization, and partner handoffs do not consume it. An occupied slot requires a different choice or separate explicit removal; it is never silently replaced. Changed route/dates/group require explicit context review, with corrections for out-of-range items and without automatic rescheduling or deletion.

## Travel brief

When all essential Planner fields are valid, the product produces a reviewable travel brief.

- The brief summarizes user intent in plain language.
- The user can review and edit it before continuing.
- Completion of a brief does not book or save a trip.
- Provider data must not be inserted into the Planner as though it were user intent.
- Prices shown in the brief must be clearly identified as budgets or estimates, never confirmed inventory.

## Providers and results

The current runtime does not expose live flight or hotel inventory inside ByeBi. The active travel integrations are external handoffs to Aviasales, Booking.com, and GetYourGuide.

- Flight search context is handed to Aviasales; ByeBi does not display or guarantee a live fare.
- Hotel search context is handed to Booking.com; ByeBi does not display or guarantee live hotel prices or availability.
- Activities use a real GetYourGuide destination-level handoff; ByeBi does not invent item-level inventory.
- Prices, availability, terms, and final booking details are confirmed on the external provider.
- Provider failure or retirement must never be replaced with fabricated prices, availability, inventory, or booking confirmation.

The Provider Results domain remains an architectural boundary for a future verified live provider integration. If live results return in the future, they must remain separate from Planner intent and carry truthful provider, price-scope, freshness, and availability semantics.

## Selections

There is currently no persisted flight or hotel selection because ByeBi does not expose verified live flight or hotel inventory.

If live Provider Results are reintroduced later:

- selection must be explicit and separate from viewing or ranking a result;
- selection must not mutate Planner intent;
- selection must not create a Saved Trip automatically;
- selection must not imply an external booking;
- stale or invalidated selections must never be presented as current.

## Candidate links saved for consideration

Organizers may explicitly attach external flight, accommodation and activity URLs from any public website to an existing Saved Trip. A best-effort server-side preview can suggest title, source, description and an image based on publicly available HTML metadata. Failed or incomplete previews must still allow manual entry, editing and removal. Image metadata alternatives are considered only when they are explicitly present in the page. Cards display the linked image host, not a claim of authorship, licensing or verified property identity. Missing or failed images use a labeled illustrative category cover; a user-supplied or explicitly cleared image is never overwritten by a late preview. A Saved Trip can hold multiple candidates of each category.

These curated candidate links are not Provider Results or verified selections. They never represent live availability, booking or payment. Optional user-entered price notes are historical observations and must not be presented as refreshed provider prices. Saving a link never saves a Planner draft, changes a booking checklist status, or books travel. Only the authenticated Saved Trip owner can manage candidate links; partner handoffs and affiliate tracking remain unchanged. This extension must remain separate from the beta-critical core journey.

## External travel booking boundary

Travel booking and payment happen on the external provider's site. ByeBi does not confirm travel reservations or charge for travel.

- External calls to action name their destination provider.
- The handoff clearly communicates that the user is leaving ByeBi.
- On provider-option surfaces, the primary action may be the next explicit action for the selected option, including an external handoff.
- Success means a valid handoff was initiated, not that a booking was completed.

This boundary does not apply to ByeBi merchandise, which is a separate Stripe Checkout flow and is outside the travel-booking model. See [ADR-0003](adr/0003-external-travel-booking-only.md).

## Explicit save and authentication boundary

Planning, reviewing, and comparing travel options do not require a trip to be saved.

- Persist a trip only after the user explicitly chooses **Save trip**.
- If the user is not authenticated, preserve the valid trip context and route through authentication before saving.
- Do not create duplicate saved trips for the same user intent when an equivalent saved trip already exists.
- Authentication protects user-owned resources; it must not be presented as external travel booking.
- When authentication is required to open a protected internal page, preserve that safe internal destination and return the user there after successful authentication.

## Trip Hub

The Trip Hub is the authenticated home for an explicitly saved trip.

It may provide:

- the saved trip summary;
- links back to provider options;
- sharing through revocable invite links;
- group coordination and expense tools with durable, internally consistent monetary totals and a clear return path to the owning Trip Hub;
- an owner-controlled manual organization checklist for flights, hotels, and activities;
- clear status that distinguishes planning from external booking.

The organization checklist is durable coordination state for the authenticated owner. The Dashboard may summarize its completion progress so organizers can see which Saved Trips still need attention without opening each Trip Hub. Progress remains coordination language, not provider-verified booking data, and is not included in the public shared-trip payload.

Expense-group owners can explicitly delete a group after confirmation. Deletion removes its expenses but preserves the linked Saved Trip.

The Trip Hub must not infer that a provider option was booked merely because it was selected, opened, or manually marked as handled. Saved Trip data is durable user intent and coordination context, not a booking record.

## Localization

The supported interface locales are Italian, English, and Spanish.

- Equivalent user journeys must remain available in all supported locales.
- User-facing copy changes must update all locale files together.
- Locale affects presentation, not canonical domain values.
- Provider names, prices, currencies, place names, and dates must be formatted without changing their meaning.

## Accessibility

Core discovery, planning, provider, save, authentication, and Trip Hub journeys must be usable with keyboard and assistive technology.

- Use semantic structure, labels, focus management, and visible focus indicators.
- Do not communicate state, brand, price status, or errors through color alone.
- Loading, error, empty, selected, disabled, and external-handoff states need accessible text.
- Responsive layouts must preserve content order and action clarity.

## Analytics

Analytics measure the journey without changing it.

- Track funnel milestones, discovery interactions, saved-trip milestones, and provider handoffs using validated event names.
- Provider click analytics must identify provider, placement, brand, monetization status, and destination only when appropriate.
- Tracking is best effort and must never block navigation, planning, saving, or external handoff.
- Do not include authentication tokens, chat content, complete outbound URLs, or provider payloads in analytics.

## Product boundaries and non-goals

ByeBi does not:

- sell, reserve, ticket, or confirm travel;
- guarantee external price or availability;
- silently save plans or selections;
- treat an AI response as validated application state;
- use one generic itinerary object as canonical state for Planner, Provider Results, Selections, and Saved Trips;
- split ByeBro and ByeBride into independent behavioral products;
- replace provider terms, support, payment, or cancellation processes;
- require durable persistence for transient search results unless a future requirement explicitly introduces it.

## Roadmap

- Phase 1 — Design System + Navigation
- Phase 2 — Homepage
- Phase 3 — Discovery
- Phase 4 — Planner + Provider Flow
- Phase 5 — Dashboard + Trip Hub
- Phase 6 — Beta Readiness

Current development focus: **Phase 6 — Beta Readiness**.

Beta Readiness focuses on production truthfulness and tester confidence: release checks must match the current product model, documentation must not describe retired integrations as active, production smoke tests must verify only behavior ByeBi actually owns, critical tester journeys such as authentication must expose localized, actionable errors rather than raw provider messages, and testers must have a lightweight way to send contextual feedback without exposing private route tokens or account data.

GitHub is the operational source for current tasks and pull-request status. Volatile delivery status does not belong in this document.

### Optional local budget allocation

Planner review offers a separate optional allocation editor, shared by ByeBro and ByeBride. Users enter whole EUR amounts per person for the whole trip in six categories: main transport, accommodation, local transport, food, activities and buffer. Each amount is 0–100,000 or undecided (null); zero does not assert a free service. No amounts or percentages are suggested automatically. The summary displays assigned amounts, incomplete categories, unassigned cap and any excess. An unknown cap stays unknown; a group cap is derived only as the per-person cap multiplied by participants. Exceeding the cap warns but does not block explicit saving or change the Planner cap.

Allocations are device-local drafts, separate from actual expenses, planned activities, Saved Trips and partner handoffs. Saving a trip saves its brief, not these allocations. Changed cap, group, route or dates requires explicit review with previous/current context; amounts are preserved without redistribution. New trip clears the current brand's local program and allocations.

### Optional Google sign-in

When explicitly enabled by configuration, both brands offer Continue with Google on the authentication page, independently of the login/register tab. Supabase owns Google authentication and account identity. The app asks only for basic identity scopes, does not manually merge accounts or derive privileges from Google profile metadata, and never requests mailbox, Drive or offline Google access.

The callback restores the validated internal return destination without changing the trip draft or saving it. The user must still explicitly Save trip. Missing, expired, denied or invalid callbacks show localized recovery, not an existing-session success. A failed Google attempt leaves email/password available. The feature is hidden by default until the external provider setup and real staging sign-in have been verified.
