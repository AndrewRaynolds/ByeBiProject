ALTER TABLE merchandise_orders
  ADD COLUMN IF NOT EXISTS legal_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp without time zone;

-- Existing test orders predate recorded consent. The explicit marker avoids
-- presenting their creation timestamp as proof of a consent that was not stored.
UPDATE merchandise_orders
SET legal_version = 'legacy-no-recorded-consent'
WHERE legal_version IS NULL;

UPDATE merchandise_orders
SET terms_accepted_at = created_at
WHERE terms_accepted_at IS NULL;

ALTER TABLE merchandise_orders
  ALTER COLUMN legal_version SET NOT NULL,
  ALTER COLUMN terms_accepted_at SET NOT NULL;
