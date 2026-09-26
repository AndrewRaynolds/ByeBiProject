# ADR-0006: Separate Planner, Results, Selections, and Saved Trip

- Status: Accepted
- Date: 2026-09-26

## Context

A generic itinerary object previously mixed user intent, external responses, choices, and persistence. Those concepts have different owners, lifetimes, validation needs, and trust boundaries.

## Decision

Maintain distinct domain concepts:

- Planner — what the user wants.
- Provider Results — what external providers return.
- Selections — what the user chooses.
- Saved Trip — what the user explicitly persists.

Do not re-establish one generic itinerary object as canonical state.

## Consequences

- Transitions between domains are explicit and validated.
- Provider refreshes do not silently rewrite user intent.
- Selection does not imply save or booking.
- Compatibility objects may exist temporarily but must not expand into the target domain model.
