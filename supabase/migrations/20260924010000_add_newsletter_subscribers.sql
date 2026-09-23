CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  brand text NOT NULL,
  locale text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  token_hash text NOT NULL,
  token_expires_at timestamp without time zone NOT NULL,
  confirmation_sent_at timestamp without time zone NOT NULL,
  confirmed_at timestamp without time zone,
  unsubscribed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  CONSTRAINT newsletter_subscribers_brand_check CHECK (brand IN ('byebro', 'byebride')),
  CONSTRAINT newsletter_subscribers_locale_check CHECK (locale IN ('it', 'en', 'es')),
  CONSTRAINT newsletter_subscribers_status_check CHECK (status IN ('pending', 'confirmed', 'unsubscribed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_uidx
  ON public.newsletter_subscribers (email);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_token_hash_uidx
  ON public.newsletter_subscribers (token_hash);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
  ON public.newsletter_subscribers (status);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.newsletter_subscribers FROM anon, authenticated;
