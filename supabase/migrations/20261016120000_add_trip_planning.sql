-- Additive: no backfill and no automatic import of browser drafts.
CREATE TABLE public.trip_planning (
  trip_id integer PRIMARY KEY REFERENCES public.trips(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision BETWEEN 1 AND 2147483646),
  plan jsonb NOT NULL CHECK (
    jsonb_typeof(plan) = 'object'
    AND plan @> '{"version":1}'::jsonb
    AND jsonb_typeof(plan->'allocations') = 'object'
    AND jsonb_typeof(plan->'plannedItems') = 'array'
  ),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);
-- Access only via the authenticated, owner-scoped Express API. Public sharing
-- deliberately excludes budget and program; no direct browser grants or policies.
ALTER TABLE public.trip_planning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trip_planning FROM PUBLIC, anon, authenticated;
-- The primary key is also the owner-trip lookup index. No sequence is needed.
