# Shared Contracts Guidance

These instructions apply to `shared/` and take precedence over repository-wide guidance when they are more specific.

- Consult `docs/ARCHITECTURE.md`, the relevant product semantics in `docs/PRD.md`, and applicable ADRs before changing shared contracts.
- Treat every shared change as a contract change: inspect client and server consumers plus persistence and versioning consequences.
- Treat `shared/schema.ts` and other shared contracts as the interface between client and server.
- Before changing a shared contract, inspect and account for consumers on both sides.
- Keep Zod schemas, Drizzle definitions, and TypeScript types aligned.
- Avoid silent breaking changes. Make compatibility decisions explicit and update all affected consumers within the requested scope.
- Never silently break a persisted contract; add an explicit compatibility, migration, or versioning strategy.
- For persistence-related changes, determine whether a versioned migration is required; do not rely on schema push as a substitute for production migrations.
- Prefer additive, backward-compatible contract evolution when practical.
