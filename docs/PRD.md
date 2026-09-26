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

## Core journey

1. The user chooses ByeBro or ByeBride.
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
- Discovery must preserve the selected brand and current locale.

## Planner

The Planner represents what the user wants, not what a provider offers.

Required planning concepts are:

- origin;
- destination;
- start and end dates;
- participant count;
- budget per person;
- at least one explicit preference, such as an archetype or interests;
- brand and its canonical party type.

`budgetPerPerson` is always the budget for one participant. It must never be silently interpreted as the total group budget. See [ADR-0002](adr/0002-budget-per-person.md).

The Planner may use conversational AI to collect or clarify intent. AI output is a proposal until validated by the application contract. Missing, invalid, contradictory, or unsupported values require correction or clarification.

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

## Trip Hub

The Trip Hub is the authenticated home for an explicitly saved trip.

It may provide:

- the saved trip summary;
- links back to provider options;
- sharing through revocable invite links;
- group coordination and expense tools with durable, internally consistent monetary totals;
- an owner-controlled manual organization checklist for flights, hotels, and activities;
- clear status that distinguishes planning from external booking.

The organization checklist is durable coordination state for the authenticated owner. The Dashboard may summarize its completion progress so organizers can see which Saved Trips still need attention without opening each Trip Hub. Progress remains coordination language, not provider-verified booking data, and is not included in the public shared-trip payload.

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

Current development focus: **Phase 5 — Dashboard + Trip Hub**.

GitHub is the operational source for current tasks and pull-request status. Volatile delivery status does not belong in this document.
