BEGIN;

CREATE TABLE IF NOT EXISTS trips (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  participants integer NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  departure_city text NOT NULL,
  destinations text[],
  experience_type text NOT NULL,
  budget integer NOT NULL,
  activities text[],
  special_requests text,
  include_merch boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_groups (
  id serial PRIMARY KEY,
  owner_id text,
  trip_id integer,
  name text NOT NULL,
  description text,
  members json NOT NULL,
  total_amount integer DEFAULT 0,
  currency text DEFAULT 'EUR',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id serial PRIMARY KEY,
  group_id integer NOT NULL,
  description text NOT NULL,
  amount integer NOT NULL,
  paid_by text NOT NULL,
  split_between json NOT NULL,
  category text NOT NULL,
  date text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_itineraries (
  id serial PRIMARY KEY,
  user_id text,
  destination text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  participants integer NOT NULL,
  event_type text NOT NULL,
  selected_experiences text[],
  flights json,
  hotel json,
  daily_activities json,
  total_price integer NOT NULL,
  status text DEFAULT 'draft',
  created_at timestamp DEFAULT now()
);

ALTER TABLE expense_groups
  ADD COLUMN IF NOT EXISTS owner_id text,
  ADD COLUMN IF NOT EXISTS trip_id integer;

UPDATE expense_groups
SET owner_id = 'legacy-unowned:' || id::text
WHERE owner_id IS NULL;

ALTER TABLE expense_groups
  ALTER COLUMN owner_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expense_groups_trip_id_trips_id_fk'
  ) THEN
    ALTER TABLE expense_groups
      ADD CONSTRAINT expense_groups_trip_id_trips_id_fk
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_group_id_expense_groups_id_fk;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_group_id_expense_groups_id_fk
  FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE;

ALTER TABLE generated_itineraries
  ALTER COLUMN user_id TYPE text USING user_id::text;

UPDATE generated_itineraries
SET user_id = 'legacy-unowned:' || id::text
WHERE user_id IS NULL;

ALTER TABLE generated_itineraries
  ALTER COLUMN user_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id text PRIMARY KEY,
  session_id text NOT NULL,
  processed_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_groups_owner_id_idx
  ON expense_groups(owner_id);

CREATE INDEX IF NOT EXISTS trips_user_id_idx
  ON trips(user_id);

CREATE INDEX IF NOT EXISTS expense_groups_trip_id_idx
  ON expense_groups(trip_id);

CREATE INDEX IF NOT EXISTS expenses_group_id_idx
  ON expenses(group_id);

CREATE INDEX IF NOT EXISTS generated_itineraries_user_id_idx
  ON generated_itineraries(user_id);

COMMIT;
