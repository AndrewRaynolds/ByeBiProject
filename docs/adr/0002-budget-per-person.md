# ADR-0002: Planner Budget Is Per Person

- Status: Accepted
- Date: 2026-09-26

## Context

A group trip budget is ambiguous unless its scope is explicit. Silent conversion between per-person and group totals would corrupt recommendations and saved-trip meaning.

## Decision

The canonical Planner field is `budgetPerPerson` and always represents one participant's budget.

Interfaces, AI tools, compatibility conversions, analytics, and persistence mappings must preserve that meaning. No layer may silently reinterpret it as total group budget.

## Consequences

- UI labels state “per person.”
- Group totals, when needed, are derived and labeled rather than stored in place of the canonical value.
- Legacy fields named `budget` require an explicit per-person mapping at their boundary.
