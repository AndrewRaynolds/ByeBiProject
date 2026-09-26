# Server Guidance

These instructions apply to `server/` and take precedence over repository-wide guidance when they are more specific.

## API and Security

- Follow the existing Express and TypeScript structure.
- For server work, consult `docs/ARCHITECTURE.md` for API, provider, authentication, and persistence boundaries; `docs/PRD.md` for product semantics; and the relevant accepted ADRs.
- Validate untrusted input with Zod at API and external-system boundaries.
- Enforce authorization, resource ownership, and sensitive business rules server-side.
- Return sanitized errors. Do not expose stack traces, provider payloads, secrets, or sensitive internal details to clients.
- Do not place PII, credentials, tokens, complete provider payloads, or secrets in logs.

## Services and Providers

- Keep external integrations isolated in `server/services/` or the existing equivalent service boundary.
- Do not fabricate provider results or report success when a provider is unavailable or rejects an operation.
- Preserve Stripe webhook raw-body handling, signature verification, idempotency, and retry-safe processing.
- Preserve payment/order reconciliation, fulfillment safety, and refund/cancellation safeguards.
- Do not initiate any real payment, refund, cancellation, or fulfillment operation without an explicit request and authorization.

## Verification

Prefer focused endpoint or service tests for the changed behavior, including relevant validation, authorization, provider-failure, idempotency, and retry cases. Run only the relevant tests unless the change requires broader verification.
