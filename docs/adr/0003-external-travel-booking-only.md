# ADR-0003: Travel Booking Happens Externally

- Status: Accepted
- Date: 2026-09-26

## Context

ByeBi helps users plan and compare travel but does not own airline, accommodation, or activity inventory and does not process travel reservations.

## Decision

ByeBi may search, normalize, compare, select, and hand off travel options. Actual travel booking and payment occur on the identified external provider.

ByeBi must never fabricate provider price, availability, inventory, or booking confirmation.

## Consequences

- Provider CTAs identify the external destination.
- Redirect initiation is not reported as booking success.
- Provider failure produces unavailable or error states, not substitute inventory.
- ByeBi merchandise remains a separate Stripe commerce flow and is not covered by this travel decision.
