# ADR-0005: GitHub Main Is Canonical

- Status: Accepted
- Date: 2026-09-26

## Context

Development and deployment can produce history in both GitHub and Replit. Treating both as authorities creates ambiguous integration and unsafe divergence resolution.

## Decision

GitHub `main` is the canonical source. Replit is the deployment runtime.

The canonical delivery flow is:

```text
feature branch -> pull request -> CI/review -> main -> Replit sync -> manual republish
```

## Consequences

- Feature work starts from current GitHub `main`.
- Replit-local commits are not pushed or reconciled automatically.
- Sync and republish are explicit post-merge operations.
- Divergence is reported and resolved deliberately.
