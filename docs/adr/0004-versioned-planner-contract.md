# ADR-0004: Versioned Planner Contract

- Status: Accepted
- Date: 2026-09-26

## Context

Planner state crosses conversational AI, browser persistence, UI review, provider handoff, and saved-trip conversion. Unversioned or model-defined state would make compatibility and validation unreliable.

## Decision

Planner state uses a shared, versioned application contract.

OpenAI output is not trusted application state until validated by application-owned schemas. Breaking persisted-contract changes require an explicit versioning, compatibility, or migration strategy.

## Consequences

- Client and server share the Planner schema.
- Unknown or invalid persisted versions are not silently accepted.
- The current contract version belongs in Architecture and code, not in this durable decision.
- Model prompts and tools adapt to the application contract, never the reverse.
