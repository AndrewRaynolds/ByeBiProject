CREATE TABLE public.trip_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id integer NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  token_hash text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  revoked_at timestamp without time zone
);

CREATE UNIQUE INDEX trip_invites_token_hash_idx
  ON public.trip_invites (token_hash);

CREATE UNIQUE INDEX trip_invites_one_active_per_trip_idx
  ON public.trip_invites (trip_id)
  WHERE revoked_at IS NULL;

CREATE INDEX trip_invites_owner_id_idx
  ON public.trip_invites (owner_id);

ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trip_invites FROM anon, authenticated;
