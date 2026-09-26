# ADR-0001: Single ByeBro / ByeBride Engine

- Status: Accepted
- Date: 2026-09-26

## Context

ByeBi presents two brand variants for bachelor and bachelorette planning. Separate implementations would create behavior drift, duplicate fixes, and inconsistent provider and persistence rules.

## Decision

ByeBro and ByeBride use one behavioral product engine.

Canonical mapping:

- `byebro` -> `bachelor`
- `byebride` -> `bachelorette`

Brand differences may include accents, imagery, icons, copy, and tone. They do not justify separate feature engines.

## Consequences

- Shared journeys and contracts are implemented once.
- Brand-specific presentation is driven through tokens, props, and content.
- Any behavioral difference requires an explicit product decision, not a branding-only fork.
