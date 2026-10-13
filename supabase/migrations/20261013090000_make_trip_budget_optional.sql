-- Preserve all existing budget values; unknown budgets are NULL, never invented.
ALTER TABLE public.trips ALTER COLUMN budget DROP NOT NULL;
-- Deploy this migration before the application release. No RLS, grants or indexes change.
-- Rollback must first account for trips created with NULL budgets; do not invent values.
