-- Candidate options are organizer-curated external links, not confirmed travel offers.
CREATE TABLE public.trip_candidate_options (
  id serial PRIMARY KEY,
  trip_id integer NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('flight', 'hotel', 'activities')),
  url text NOT NULL,
  title text NOT NULL,
  source text NOT NULL,
  description text,
  image_url text,
  price_note text,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE INDEX trip_candidate_options_trip_id_idx ON public.trip_candidate_options(trip_id);
-- Backend uses server-side owner checks; no browser-side direct table privileges.
ALTER TABLE public.trip_candidate_options ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trip_candidate_options FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.trip_candidate_options_id_seq FROM anon, authenticated;
