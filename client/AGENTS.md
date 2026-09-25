# Client Guidance

These instructions apply to `client/` and take precedence over repository-wide guidance when they are more specific.

## Stack and Boundaries

- Use the existing React, TypeScript, Vite, Tailwind CSS, TanStack Query, and Wouter patterns.
- Keep server-owned business rules and authorization on the server. Do not duplicate business logic in the client; shared contracts belong in `shared/`.
- Preserve existing analytics events, properties, and firing conditions unless the task explicitly changes tracking.

## UX and Content

- Preserve the established ByeBro / ByeBride design system and interaction patterns.
- Keep user-facing copy coherent across Italian, English, and Spanish. When copy changes, check the corresponding locale entries and avoid silently leaving one language inconsistent.
- Check mobile behavior for CTAs, dialogs, checkout, navigation, and other touched responsive surfaces.
- Do not redesign surrounding pages or components when addressing a local issue.

## Verification

Prefer focused Vitest and Testing Library coverage for the affected component, hook, or user flow. Verify user-visible behavior rather than implementation details, and run only the relevant tests unless broader verification is justified.
