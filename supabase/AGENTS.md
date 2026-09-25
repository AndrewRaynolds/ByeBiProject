# Supabase and Migration Guidance

These instructions apply to `supabase/` and take precedence over repository-wide guidance when they are more specific.

- Represent production schema changes only as ordered, versioned migrations in `supabase/migrations/`.
- Never run `drizzle-kit push` against production or use it as the production deployment path.
- Prefer additive, predictable, and safely deployable changes.
- Do not create or execute destructive migrations without explicit authorization and a reviewed recovery or rollback approach.
- For new or changed tables, evaluate row-level security, grants and revokes, indexes, constraints, ownership, defaults, and compatibility with existing data.
- Deploy production migrations through the established Supabase/GitHub integration. Do not apply them directly or change that integration without an explicit request.
