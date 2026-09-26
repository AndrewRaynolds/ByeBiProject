CREATE TABLE public.trip_organization_statuses (
  trip_id integer PRIMARY KEY REFERENCES public.trips(id) ON DELETE CASCADE,
  flight_status text NOT NULL DEFAULT 'pending'
    CHECK (flight_status IN ('pending', 'done')),
  hotel_status text NOT NULL DEFAULT 'pending'
    CHECK (hotel_status IN ('pending', 'done')),
  activities_status text NOT NULL DEFAULT 'pending'
    CHECK (activities_status IN ('pending', 'done')),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_organization_statuses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trip_organization_statuses FROM anon, authenticated;
