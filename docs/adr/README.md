# Architecture Decision Records

ADRs capture the rationale for durable decisions. They do not replace the product requirements, architecture guide, design system, or current code documentation.

## Statuses

- **Proposed** — under consideration; not yet authoritative.
- **Accepted** — current durable decision.
- **Superseded** — replaced by a newer ADR, which must be linked.
- **Deprecated** — no longer recommended and not replaced by one specific decision.

When reversing an accepted decision, create a new ADR and mark the earlier record **Superseded**. Do not rewrite history to make the old rationale disappear.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-single-bro-bride-engine.md) | Accepted | Single ByeBro / ByeBride engine |
| [0002](0002-budget-per-person.md) | Accepted | Planner budget is per person |
| [0003](0003-external-travel-booking-only.md) | Accepted | Travel booking happens externally |
| [0004](0004-versioned-planner-contract.md) | Accepted | Versioned Planner contract |
| [0005](0005-github-main-canonical.md) | Accepted | GitHub `main` is canonical |
| [0006](0006-domain-state-separation.md) | Accepted | Separate Planner, Results, Selections, and Saved Trip |

## Format for new ADRs

```md
# ADR-NNNN: Decision title

- Status: Proposed
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```

Keep records short. Link to the authoritative domain document instead of duplicating requirements or implementation inventories.
