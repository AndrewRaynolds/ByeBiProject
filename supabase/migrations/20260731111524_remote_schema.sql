-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE SEQUENCE public.blog_posts_id_seq AS integer;

CREATE SEQUENCE public.destinations_id_seq AS integer;

CREATE SEQUENCE public.expense_groups_id_seq AS integer;

CREATE SEQUENCE public.expenses_id_seq AS integer;

CREATE SEQUENCE public.experiences_id_seq AS integer;

CREATE SEQUENCE public.generated_itineraries_id_seq AS integer;

CREATE SEQUENCE public.itineraries_id_seq AS integer;

CREATE SEQUENCE public.merchandise_id_seq AS integer;

CREATE SEQUENCE public.trips_id_seq AS integer;

CREATE SEQUENCE public.users_id_seq AS integer;

CREATE FUNCTION public.set_updated_at_metadata()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return NEW;
end;
$function$;

GRANT ALL ON FUNCTION public.set_updated_at_metadata() TO anon;

GRANT ALL ON FUNCTION public.set_updated_at_metadata() TO authenticated;

GRANT ALL ON FUNCTION public.set_updated_at_metadata() TO service_role;

CREATE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new._updated_at = now();
  return NEW;
end;
$function$;

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;

GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

CREATE TABLE public.blog_posts (
  id         integer                     DEFAULT nextval('public.blog_posts_id_seq'::regclass) NOT NULL,
  title      text                        NOT NULL,
  content    text                        NOT NULL,
  image      text                        NOT NULL,
  is_premium boolean                     DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  location   text,
  category   text                        NOT NULL
);

ALTER SEQUENCE public.blog_posts_id_seq OWNED BY public.blog_posts.id;

GRANT ALL ON SEQUENCE public.blog_posts_id_seq TO anon;

GRANT ALL ON SEQUENCE public.blog_posts_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.blog_posts_id_seq TO service_role;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_category_check CHECK (category = ANY (ARRAY['sex'::text, 'drink'::text, 'weird'::text]));

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);

GRANT ALL ON public.blog_posts TO anon;

GRANT ALL ON public.blog_posts TO authenticated;

GRANT ALL ON public.blog_posts TO service_role;

CREATE INDEX blog_posts_created_at_idx ON public.blog_posts (created_at DESC);

CREATE TABLE public.destinations (
  id           integer DEFAULT nextval('public.destinations_id_seq'::regclass) NOT NULL,
  name         text    NOT NULL,
  country      text    NOT NULL,
  image        text    NOT NULL,
  description  text    NOT NULL,
  tags         text[],
  rating       text    NOT NULL,
  review_count integer NOT NULL
);

ALTER SEQUENCE public.destinations_id_seq OWNED BY public.destinations.id;

GRANT ALL ON SEQUENCE public.destinations_id_seq TO anon;

GRANT ALL ON SEQUENCE public.destinations_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.destinations_id_seq TO service_role;

ALTER TABLE public.destinations
  ADD CONSTRAINT destinations_pkey PRIMARY KEY (id);

GRANT ALL ON public.destinations TO anon;

GRANT ALL ON public.destinations TO authenticated;

GRANT ALL ON public.destinations TO service_role;

CREATE TABLE public.expense_groups (
  id           integer                     DEFAULT nextval('public.expense_groups_id_seq'::regclass) NOT NULL,
  name         text                        NOT NULL,
  description  text,
  members      json                        NOT NULL,
  total_amount integer                     DEFAULT 0,
  currency     text                        DEFAULT 'EUR'::text,
  created_at   timestamp without time zone DEFAULT now(),
  owner_id     text                        NOT NULL,
  trip_id      integer
);

ALTER SEQUENCE public.expense_groups_id_seq OWNED BY public.expense_groups.id;

GRANT ALL ON SEQUENCE public.expense_groups_id_seq TO anon;

GRANT ALL ON SEQUENCE public.expense_groups_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.expense_groups_id_seq TO service_role;

ALTER TABLE public.expense_groups
  ADD CONSTRAINT expense_groups_pkey PRIMARY KEY (id);

GRANT ALL ON public.expense_groups TO anon;

GRANT ALL ON public.expense_groups TO authenticated;

GRANT ALL ON public.expense_groups TO service_role;

CREATE INDEX expense_groups_owner_id_idx ON public.expense_groups (owner_id);

CREATE INDEX expense_groups_trip_id_idx ON public.expense_groups (trip_id);

CREATE TABLE public.expenses (
  id            integer                     DEFAULT nextval('public.expenses_id_seq'::regclass) NOT NULL,
  group_id      integer                     NOT NULL,
  description   text                        NOT NULL,
  amount        integer                     NOT NULL,
  paid_by       text                        NOT NULL,
  split_between json                        NOT NULL,
  category      text                        NOT NULL,
  date          text                        NOT NULL,
  created_at    timestamp without time zone DEFAULT now()
);

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;

GRANT ALL ON SEQUENCE public.expenses_id_seq TO anon;

GRANT ALL ON SEQUENCE public.expenses_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.expenses_id_seq TO service_role;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_group_id_expense_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.expense_groups(id) ON DELETE CASCADE;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

GRANT ALL ON public.expenses TO anon;

GRANT ALL ON public.expenses TO authenticated;

GRANT ALL ON public.expenses TO service_role;

CREATE INDEX expenses_group_id_idx ON public.expenses (group_id);

CREATE TABLE public.experiences (
  id          integer DEFAULT nextval('public.experiences_id_seq'::regclass) NOT NULL,
  name        text    NOT NULL,
  description text    NOT NULL,
  image       text    NOT NULL
);

ALTER SEQUENCE public.experiences_id_seq OWNED BY public.experiences.id;

GRANT ALL ON SEQUENCE public.experiences_id_seq TO anon;

GRANT ALL ON SEQUENCE public.experiences_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.experiences_id_seq TO service_role;

ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_pkey PRIMARY KEY (id);

GRANT ALL ON public.experiences TO anon;

GRANT ALL ON public.experiences TO authenticated;

GRANT ALL ON public.experiences TO service_role;

CREATE TABLE public.generated_itineraries (
  id                   integer                     DEFAULT nextval('public.generated_itineraries_id_seq'::regclass) NOT NULL,
  user_id              text                        NOT NULL,
  destination          text                        NOT NULL,
  start_date           text                        NOT NULL,
  end_date             text                        NOT NULL,
  participants         integer                     NOT NULL,
  event_type           text                        NOT NULL,
  selected_experiences text[],
  flights              json,
  hotel                json,
  daily_activities     json,
  total_price          integer                     NOT NULL,
  status               text                        DEFAULT 'draft'::text,
  created_at           timestamp without time zone DEFAULT now()
);

ALTER SEQUENCE public.generated_itineraries_id_seq OWNED BY public.generated_itineraries.id;

GRANT ALL ON SEQUENCE public.generated_itineraries_id_seq TO anon;

GRANT ALL ON SEQUENCE public.generated_itineraries_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.generated_itineraries_id_seq TO service_role;

ALTER TABLE public.generated_itineraries
  ADD CONSTRAINT generated_itineraries_pkey PRIMARY KEY (id);

GRANT ALL ON public.generated_itineraries TO anon;

GRANT ALL ON public.generated_itineraries TO authenticated;

GRANT ALL ON public.generated_itineraries TO service_role;

CREATE INDEX generated_itineraries_user_id_idx ON public.generated_itineraries (user_id);

CREATE TABLE public.itineraries (
  id          integer                     DEFAULT nextval('public.itineraries_id_seq'::regclass) NOT NULL,
  trip_id     integer                     NOT NULL,
  name        text                        NOT NULL,
  description text                        NOT NULL,
  duration    text                        NOT NULL,
  price       integer                     NOT NULL,
  image       text                        NOT NULL,
  rating      text                        NOT NULL,
  highlights  text[],
  includes    text[],
  created_at  timestamp without time zone DEFAULT now()
);

ALTER SEQUENCE public.itineraries_id_seq OWNED BY public.itineraries.id;

GRANT ALL ON SEQUENCE public.itineraries_id_seq TO anon;

GRANT ALL ON SEQUENCE public.itineraries_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.itineraries_id_seq TO service_role;

ALTER TABLE public.itineraries
  ADD CONSTRAINT itineraries_pkey PRIMARY KEY (id);

GRANT ALL ON public.itineraries TO anon;

GRANT ALL ON public.itineraries TO authenticated;

GRANT ALL ON public.itineraries TO service_role;

CREATE TABLE public.merchandise (
  id          integer                     DEFAULT nextval('public.merchandise_id_seq'::regclass) NOT NULL,
  name        text                        NOT NULL,
  description text                        NOT NULL,
  price       integer                     NOT NULL,
  image       text                        NOT NULL,
  type        text                        NOT NULL,
  created_at  timestamp without time zone DEFAULT now()
);

ALTER SEQUENCE public.merchandise_id_seq OWNED BY public.merchandise.id;

GRANT ALL ON SEQUENCE public.merchandise_id_seq TO anon;

GRANT ALL ON SEQUENCE public.merchandise_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.merchandise_id_seq TO service_role;

ALTER TABLE public.merchandise
  ADD CONSTRAINT merchandise_pkey PRIMARY KEY (id);

GRANT ALL ON public.merchandise TO anon;

GRANT ALL ON public.merchandise TO authenticated;

GRANT ALL ON public.merchandise TO service_role;

CREATE TABLE public.stripe_webhook_events (
  event_id     text                        NOT NULL,
  session_id   text                        NOT NULL,
  processed_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.stripe_webhook_events
  ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (event_id);

GRANT ALL ON public.stripe_webhook_events TO anon;

GRANT ALL ON public.stripe_webhook_events TO authenticated;

GRANT ALL ON public.stripe_webhook_events TO service_role;

CREATE TABLE public.trips (
  id               integer                     DEFAULT nextval('public.trips_id_seq'::regclass) NOT NULL,
  user_id          text                        NOT NULL,
  name             text                        NOT NULL,
  participants     integer                     NOT NULL,
  start_date       text                        NOT NULL,
  end_date         text                        NOT NULL,
  departure_city   text                        NOT NULL,
  destinations     text[],
  experience_type  text                        NOT NULL,
  budget           integer                     NOT NULL,
  activities       text[],
  special_requests text,
  include_merch    boolean                     DEFAULT false,
  created_at       timestamp without time zone DEFAULT now()
);

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;

GRANT ALL ON SEQUENCE public.trips_id_seq TO anon;

GRANT ALL ON SEQUENCE public.trips_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.trips_id_seq TO service_role;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_pkey PRIMARY KEY (id);

ALTER TABLE public.expense_groups
  ADD CONSTRAINT expense_groups_trip_id_trips_id_fk FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;

GRANT ALL ON public.trips TO anon;

GRANT ALL ON public.trips TO authenticated;

GRANT ALL ON public.trips TO service_role;

CREATE INDEX trips_user_id_idx ON public.trips (user_id);

CREATE TABLE public.users (
  id         integer                     DEFAULT nextval('public.users_id_seq'::regclass) NOT NULL,
  username   text                        NOT NULL,
  password   text                        NOT NULL,
  email      text                        NOT NULL,
  first_name text,
  last_name  text,
  is_premium boolean                     DEFAULT false,
  created_at timestamp without time zone DEFAULT now()
);

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

GRANT ALL ON SEQUENCE public.users_id_seq TO anon;

GRANT ALL ON SEQUENCE public.users_id_seq TO authenticated;

GRANT ALL ON SEQUENCE public.users_id_seq TO service_role;

ALTER TABLE public.users
  ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.users
  ADD CONSTRAINT users_username_unique UNIQUE (username);

GRANT ALL ON public.users TO anon;

GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.users TO service_role;

CREATE SCHEMA stripe AUTHORIZATION postgres;

CREATE TYPE stripe.invoice_status AS ENUM (
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void',
  'deleted'
);

CREATE TYPE stripe.pricing_tiers AS ENUM (
  'graduated',
  'volume'
);

CREATE TYPE stripe.pricing_type AS ENUM (
  'one_time',
  'recurring'
);

CREATE TYPE stripe.subscription_schedule_status AS ENUM (
  'not_started',
  'active',
  'completed',
  'released',
  'canceled'
);

CREATE TYPE stripe.subscription_status AS ENUM (
  'trialing',
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'unpaid',
  'paused'
);

CREATE SEQUENCE stripe._sync_status_id_seq AS integer;

CREATE TABLE stripe._managed_webhooks (
  id             text                     NOT NULL,
  object         text,
  url            text                     NOT NULL,
  enabled_events jsonb                    NOT NULL,
  description    text,
  enabled        boolean,
  livemode       boolean,
  metadata       jsonb,
  secret         text                     NOT NULL,
  status         text,
  api_version    text,
  created        integer,
  updated_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_synced_at timestamp with time zone,
  account_id     text                     NOT NULL
);

ALTER TABLE stripe._managed_webhooks
  ADD CONSTRAINT managed_webhooks_pkey PRIMARY KEY (id);

ALTER TABLE stripe._managed_webhooks
  ADD CONSTRAINT managed_webhooks_url_account_unique UNIQUE (url, account_id);

CREATE INDEX stripe_managed_webhooks_enabled_idx ON stripe._managed_webhooks (enabled);

CREATE INDEX stripe_managed_webhooks_status_idx ON stripe._managed_webhooks (status);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe._managed_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_metadata();

CREATE TABLE stripe._migrations (
  id          integer                     NOT NULL,
  name        character varying(100)      NOT NULL,
  hash        character varying(40)       NOT NULL,
  executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE stripe._migrations
  ADD CONSTRAINT _migrations_name_key UNIQUE (name);

ALTER TABLE stripe._migrations
  ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);

CREATE TABLE stripe._sync_status (
  id                      integer                  DEFAULT nextval('stripe._sync_status_id_seq'::regclass) NOT NULL,
  resource                text                     NOT NULL,
  status                  text                     DEFAULT 'idle'::text,
  last_synced_at          timestamp with time zone DEFAULT now(),
  last_incremental_cursor timestamp with time zone,
  error_message           text,
  updated_at              timestamp with time zone DEFAULT now(),
  account_id              text                     NOT NULL
);

ALTER SEQUENCE stripe._sync_status_id_seq OWNED BY stripe._sync_status.id;

ALTER TABLE stripe._sync_status
  ADD CONSTRAINT _sync_status_pkey PRIMARY KEY (id);

ALTER TABLE stripe._sync_status
  ADD CONSTRAINT _sync_status_resource_account_key UNIQUE (resource, account_id);

ALTER TABLE stripe._sync_status
  ADD CONSTRAINT _sync_status_status_check CHECK (status = ANY (ARRAY['idle'::text, 'running'::text, 'complete'::text, 'error'::text]));

CREATE INDEX idx_sync_status_resource_account ON stripe._sync_status (resource, account_id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe._sync_status
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_metadata();

CREATE TABLE stripe.accounts (
  _raw_data         jsonb                    NOT NULL,
  first_synced_at   timestamp with time zone DEFAULT now() NOT NULL,
  _last_synced_at   timestamp with time zone DEFAULT now() NOT NULL,
  _updated_at       timestamp with time zone DEFAULT now() NOT NULL,
  business_name     text                     GENERATED ALWAYS AS (((_raw_data -> 'business_profile'::text) ->> 'name'::text)) STORED,
  email             text                     GENERATED ALWAYS AS ((_raw_data ->> 'email'::text)) STORED,
  type              text                     GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
  charges_enabled   boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'charges_enabled'::text))::boolean) STORED,
  payouts_enabled   boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'payouts_enabled'::text))::boolean) STORED,
  details_submitted boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'details_submitted'::text))::boolean) STORED,
  country           text                     GENERATED ALWAYS AS ((_raw_data ->> 'country'::text)) STORED,
  default_currency  text                     GENERATED ALWAYS AS ((_raw_data ->> 'default_currency'::text)) STORED,
  created           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  api_key_hashes    text[]                   DEFAULT '{}'::text[],
  id                text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.accounts
  ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE stripe._managed_webhooks
  ADD CONSTRAINT fk_managed_webhooks_account FOREIGN KEY (account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe._sync_status
  ADD CONSTRAINT fk_sync_status_account FOREIGN KEY (account_id) REFERENCES stripe.accounts(id);

CREATE INDEX idx_accounts_api_key_hashes ON stripe.accounts USING gin (api_key_hashes);

CREATE INDEX idx_accounts_business_name ON stripe.accounts (business_name);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.active_entitlements (
  _updated_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at timestamp with time zone,
  _raw_data       jsonb,
  _account_id     text                     NOT NULL,
  object          text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  livemode        boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  feature         text                     GENERATED ALWAYS AS ((_raw_data ->> 'feature'::text)) STORED,
  customer        text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  lookup_key      text                     GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
  id              text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.active_entitlements
  ADD CONSTRAINT active_entitlements_pkey PRIMARY KEY (id);

ALTER TABLE stripe.active_entitlements
  ADD CONSTRAINT fk_active_entitlements_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE INDEX stripe_active_entitlements_feature_idx ON stripe.active_entitlements (feature);

CREATE UNIQUE INDEX active_entitlements_lookup_key_key ON stripe.active_entitlements (lookup_key)
  WHERE lookup_key IS NOT NULL;

CREATE INDEX stripe_active_entitlements_customer_idx ON stripe.active_entitlements (customer);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.active_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.charges (
  _updated_at            timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at        timestamp with time zone,
  _raw_data              jsonb,
  _account_id            text                     NOT NULL,
  object                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  paid                   boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'paid'::text))::boolean) STORED,
  "order"                text                     GENERATED ALWAYS AS ((_raw_data ->> 'order'::text)) STORED,
  amount                 bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
  review                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'review'::text)) STORED,
  source                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'source'::text)) STORED,
  status                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  created                integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  dispute                text                     GENERATED ALWAYS AS ((_raw_data ->> 'dispute'::text)) STORED,
  invoice                text                     GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
  outcome                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'outcome'::text)) STORED,
  refunds                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'refunds'::text)) STORED,
  updated                integer                  GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
  captured               boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'captured'::text))::boolean) STORED,
  currency               text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  customer               text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  livemode               boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  metadata               jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  refunded               boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'refunded'::text))::boolean) STORED,
  shipping               jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
  application            text                     GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
  description            text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  destination            text                     GENERATED ALWAYS AS ((_raw_data ->> 'destination'::text)) STORED,
  failure_code           text                     GENERATED ALWAYS AS ((_raw_data ->> 'failure_code'::text)) STORED,
  on_behalf_of           text                     GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
  fraud_details          jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'fraud_details'::text)) STORED,
  receipt_email          text                     GENERATED ALWAYS AS ((_raw_data ->> 'receipt_email'::text)) STORED,
  payment_intent         text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
  receipt_number         text                     GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
  transfer_group         text                     GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
  amount_refunded        bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount_refunded'::text))::bigint) STORED,
  application_fee        text                     GENERATED ALWAYS AS ((_raw_data ->> 'application_fee'::text)) STORED,
  failure_message        text                     GENERATED ALWAYS AS ((_raw_data ->> 'failure_message'::text)) STORED,
  source_transfer        text                     GENERATED ALWAYS AS ((_raw_data ->> 'source_transfer'::text)) STORED,
  balance_transaction    text                     GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
  statement_descriptor   text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
  payment_method_details jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'payment_method_details'::text)) STORED,
  id                     text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.charges
  ADD CONSTRAINT charges_pkey PRIMARY KEY (id);

ALTER TABLE stripe.charges
  ADD CONSTRAINT fk_charges_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.charges
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.checkout_session_line_items (
  _updated_at      timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at  timestamp with time zone,
  _raw_data        jsonb,
  _account_id      text                     NOT NULL,
  object           text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  amount_discount  integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_discount'::text))::integer) STORED,
  amount_subtotal  integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_subtotal'::text))::integer) STORED,
  amount_tax       integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_tax'::text))::integer) STORED,
  amount_total     integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_total'::text))::integer) STORED,
  currency         text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  description      text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  price            text                     GENERATED ALWAYS AS ((_raw_data ->> 'price'::text)) STORED,
  quantity         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'quantity'::text))::integer) STORED,
  checkout_session text                     GENERATED ALWAYS AS ((_raw_data ->> 'checkout_session'::text)) STORED,
  id               text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.checkout_session_line_items
  ADD CONSTRAINT checkout_session_line_items_pkey PRIMARY KEY (id);

ALTER TABLE stripe.checkout_session_line_items
  ADD CONSTRAINT fk_checkout_session_line_items_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE INDEX stripe_checkout_session_line_items_price_idx ON stripe.checkout_session_line_items (price);

CREATE INDEX stripe_checkout_session_line_items_session_idx ON stripe.checkout_session_line_items (checkout_session);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.checkout_session_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.checkout_sessions (
  _updated_at                          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at                      timestamp with time zone,
  _raw_data                            jsonb,
  _account_id                          text                     NOT NULL,
  object                               text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  adaptive_pricing                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'adaptive_pricing'::text)) STORED,
  after_expiration                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'after_expiration'::text)) STORED,
  allow_promotion_codes                boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'allow_promotion_codes'::text))::boolean) STORED,
  amount_subtotal                      integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_subtotal'::text))::integer) STORED,
  amount_total                         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_total'::text))::integer) STORED,
  automatic_tax                        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'automatic_tax'::text)) STORED,
  billing_address_collection           text                     GENERATED ALWAYS AS ((_raw_data ->> 'billing_address_collection'::text)) STORED,
  cancel_url                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'cancel_url'::text)) STORED,
  client_reference_id                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'client_reference_id'::text)) STORED,
  client_secret                        text                     GENERATED ALWAYS AS ((_raw_data ->> 'client_secret'::text)) STORED,
  collected_information                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'collected_information'::text)) STORED,
  consent                              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'consent'::text)) STORED,
  consent_collection                   jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'consent_collection'::text)) STORED,
  created                              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  currency                             text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  currency_conversion                  jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'currency_conversion'::text)) STORED,
  custom_fields                        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'custom_fields'::text)) STORED,
  custom_text                          jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'custom_text'::text)) STORED,
  customer                             text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  customer_creation                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer_creation'::text)) STORED,
  customer_details                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'customer_details'::text)) STORED,
  customer_email                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer_email'::text)) STORED,
  discounts                            jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'discounts'::text)) STORED,
  expires_at                           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'expires_at'::text))::integer) STORED,
  invoice                              text                     GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
  invoice_creation                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'invoice_creation'::text)) STORED,
  livemode                             boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  locale                               text                     GENERATED ALWAYS AS ((_raw_data ->> 'locale'::text)) STORED,
  metadata                             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  mode                                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'mode'::text)) STORED,
  optional_items                       jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'optional_items'::text)) STORED,
  payment_intent                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
  payment_link                         text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_link'::text)) STORED,
  payment_method_collection            text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_method_collection'::text)) STORED,
  payment_method_configuration_details jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'payment_method_configuration_details'::text)) STORED,
  payment_method_options               jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'payment_method_options'::text)) STORED,
  payment_method_types                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'payment_method_types'::text)) STORED,
  payment_status                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_status'::text)) STORED,
  permissions                          jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'permissions'::text)) STORED,
  phone_number_collection              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'phone_number_collection'::text)) STORED,
  presentment_details                  jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'presentment_details'::text)) STORED,
  recovered_from                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'recovered_from'::text)) STORED,
  redirect_on_completion               text                     GENERATED ALWAYS AS ((_raw_data ->> 'redirect_on_completion'::text)) STORED,
  return_url                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'return_url'::text)) STORED,
  saved_payment_method_options         jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'saved_payment_method_options'::text)) STORED,
  setup_intent                         text                     GENERATED ALWAYS AS ((_raw_data ->> 'setup_intent'::text)) STORED,
  shipping_address_collection          jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping_address_collection'::text)) STORED,
  shipping_cost                        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping_cost'::text)) STORED,
  shipping_details                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping_details'::text)) STORED,
  shipping_options                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping_options'::text)) STORED,
  status                               text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  submit_type                          text                     GENERATED ALWAYS AS ((_raw_data ->> 'submit_type'::text)) STORED,
  subscription                         text                     GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
  success_url                          text                     GENERATED ALWAYS AS ((_raw_data ->> 'success_url'::text)) STORED,
  tax_id_collection                    jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'tax_id_collection'::text)) STORED,
  total_details                        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'total_details'::text)) STORED,
  ui_mode                              text                     GENERATED ALWAYS AS ((_raw_data ->> 'ui_mode'::text)) STORED,
  url                                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'url'::text)) STORED,
  wallet_options                       jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'wallet_options'::text)) STORED,
  id                                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.checkout_sessions
  ADD CONSTRAINT checkout_sessions_pkey PRIMARY KEY (id);

ALTER TABLE stripe.checkout_sessions
  ADD CONSTRAINT fk_checkout_sessions_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE INDEX stripe_checkout_sessions_subscription_idx ON stripe.checkout_sessions (SUBSCRIPTION);

CREATE INDEX stripe_checkout_sessions_payment_intent_idx ON stripe.checkout_sessions (payment_intent);

CREATE INDEX stripe_checkout_sessions_invoice_idx ON stripe.checkout_sessions (invoice);

CREATE INDEX stripe_checkout_sessions_customer_idx ON stripe.checkout_sessions (customer);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.coupons (
  _updated_at         timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at     timestamp with time zone,
  _raw_data           jsonb,
  object              text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  name                text                     GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
  valid               boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'valid'::text))::boolean) STORED,
  created             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  updated             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
  currency            text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  duration            text                     GENERATED ALWAYS AS ((_raw_data ->> 'duration'::text)) STORED,
  livemode            boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  metadata            jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  redeem_by           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'redeem_by'::text))::integer) STORED,
  amount_off          bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount_off'::text))::bigint) STORED,
  percent_off         double precision         GENERATED ALWAYS AS (((_raw_data ->> 'percent_off'::text))::double precision) STORED,
  times_redeemed      bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'times_redeemed'::text))::bigint) STORED,
  max_redemptions     bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'max_redemptions'::text))::bigint) STORED,
  duration_in_months  bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'duration_in_months'::text))::bigint) STORED,
  percent_off_precise double precision         GENERATED ALWAYS AS (((_raw_data ->> 'percent_off_precise'::text))::double precision) STORED,
  id                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.coupons
  ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.credit_notes (
  _last_synced_at              timestamp with time zone,
  _raw_data                    jsonb,
  _account_id                  text                     NOT NULL,
  object                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  amount                       integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
  amount_shipping              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_shipping'::text))::integer) STORED,
  created                      integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  currency                     text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  customer                     text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  customer_balance_transaction text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer_balance_transaction'::text)) STORED,
  discount_amount              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'discount_amount'::text))::integer) STORED,
  discount_amounts             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'discount_amounts'::text)) STORED,
  invoice                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
  lines                        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'lines'::text)) STORED,
  livemode                     boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  memo                         text                     GENERATED ALWAYS AS ((_raw_data ->> 'memo'::text)) STORED,
  metadata                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  number                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'number'::text)) STORED,
  out_of_band_amount           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'out_of_band_amount'::text))::integer) STORED,
  pdf                          text                     GENERATED ALWAYS AS ((_raw_data ->> 'pdf'::text)) STORED,
  reason                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
  refund                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'refund'::text)) STORED,
  shipping_cost                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping_cost'::text)) STORED,
  status                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  subtotal                     integer                  GENERATED ALWAYS AS (((_raw_data ->> 'subtotal'::text))::integer) STORED,
  subtotal_excluding_tax       integer                  GENERATED ALWAYS AS (((_raw_data ->> 'subtotal_excluding_tax'::text))::integer) STORED,
  tax_amounts                  jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'tax_amounts'::text)) STORED,
  total                        integer                  GENERATED ALWAYS AS (((_raw_data ->> 'total'::text))::integer) STORED,
  total_excluding_tax          integer                  GENERATED ALWAYS AS (((_raw_data ->> 'total_excluding_tax'::text))::integer) STORED,
  type                         text                     GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
  voided_at                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'voided_at'::text)) STORED,
  id                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.credit_notes
  ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);

ALTER TABLE stripe.credit_notes
  ADD CONSTRAINT fk_credit_notes_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE INDEX stripe_credit_notes_invoice_idx ON stripe.credit_notes (invoice);

CREATE INDEX stripe_credit_notes_customer_idx ON stripe.credit_notes (customer);

CREATE TABLE stripe.customers (
  _updated_at           timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at       timestamp with time zone,
  _raw_data             jsonb,
  _account_id           text                     NOT NULL,
  object                text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  address               jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'address'::text)) STORED,
  description           text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  email                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'email'::text)) STORED,
  metadata              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  name                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
  phone                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'phone'::text)) STORED,
  shipping              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
  balance               integer                  GENERATED ALWAYS AS (((_raw_data ->> 'balance'::text))::integer) STORED,
  created               integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  currency              text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  default_source        text                     GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
  delinquent            boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'delinquent'::text))::boolean) STORED,
  discount              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
  invoice_prefix        text                     GENERATED ALWAYS AS ((_raw_data ->> 'invoice_prefix'::text)) STORED,
  invoice_settings      jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'invoice_settings'::text)) STORED,
  livemode              boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  next_invoice_sequence integer                  GENERATED ALWAYS AS (((_raw_data ->> 'next_invoice_sequence'::text))::integer) STORED,
  preferred_locales     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'preferred_locales'::text)) STORED,
  tax_exempt            text                     GENERATED ALWAYS AS ((_raw_data ->> 'tax_exempt'::text)) STORED,
  deleted               boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'deleted'::text))::boolean) STORED,
  id                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.customers
  ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE stripe.customers
  ADD CONSTRAINT fk_customers_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.disputes (
  _updated_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at      timestamp with time zone,
  _raw_data            jsonb,
  _account_id          text                     NOT NULL,
  object               text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  amount               bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
  charge               text                     GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
  reason               text                     GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
  status               text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  created              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  updated              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
  currency             text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  evidence             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'evidence'::text)) STORED,
  livemode             boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  metadata             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  evidence_details     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'evidence_details'::text)) STORED,
  balance_transactions jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'balance_transactions'::text)) STORED,
  is_charge_refundable boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'is_charge_refundable'::text))::boolean) STORED,
  payment_intent       text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
  id                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.disputes
  ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);

ALTER TABLE stripe.disputes
  ADD CONSTRAINT fk_disputes_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE INDEX stripe_dispute_created_idx ON stripe.disputes (created);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.early_fraud_warnings (
  _updated_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at timestamp with time zone,
  _raw_data       jsonb,
  _account_id     text                     NOT NULL,
  object          text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  actionable      boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'actionable'::text))::boolean) STORED,
  charge          text                     GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
  created         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  fraud_type      text                     GENERATED ALWAYS AS ((_raw_data ->> 'fraud_type'::text)) STORED,
  livemode        boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  payment_intent  text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
  id              text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.early_fraud_warnings
  ADD CONSTRAINT early_fraud_warnings_pkey PRIMARY KEY (id);

ALTER TABLE stripe.early_fraud_warnings
  ADD CONSTRAINT fk_early_fraud_warnings_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE INDEX stripe_early_fraud_warnings_charge_idx ON stripe.early_fraud_warnings (charge);

CREATE INDEX stripe_early_fraud_warnings_payment_intent_idx ON stripe.early_fraud_warnings (payment_intent);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.early_fraud_warnings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.events (
  _updated_at      timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at  timestamp with time zone,
  _raw_data        jsonb,
  object           text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  data             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'data'::text)) STORED,
  type             text                     GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
  created          integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  request          text                     GENERATED ALWAYS AS ((_raw_data ->> 'request'::text)) STORED,
  updated          integer                  GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
  livemode         boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  api_version      text                     GENERATED ALWAYS AS ((_raw_data ->> 'api_version'::text)) STORED,
  pending_webhooks bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'pending_webhooks'::text))::bigint) STORED,
  id               text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.events
  ADD CONSTRAINT events_pkey PRIMARY KEY (id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.features (
  _updated_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at timestamp with time zone,
  _raw_data       jsonb,
  _account_id     text                     NOT NULL,
  object          text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  livemode        boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  name            text                     GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
  lookup_key      text                     GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
  active          boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
  metadata        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  id              text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.features
  ADD CONSTRAINT features_pkey PRIMARY KEY (id);

ALTER TABLE stripe.features
  ADD CONSTRAINT fk_features_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

CREATE UNIQUE INDEX features_lookup_key_key ON stripe.features (lookup_key)
  WHERE lookup_key IS NOT NULL;

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.features
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.invoices (
  _updated_at                      timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at                  timestamp with time zone,
  _raw_data                        jsonb,
  _account_id                      text                     NOT NULL,
  object                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  auto_advance                     boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'auto_advance'::text))::boolean) STORED,
  collection_method                text                     GENERATED ALWAYS AS ((_raw_data ->> 'collection_method'::text)) STORED,
  currency                         text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  description                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  hosted_invoice_url               text                     GENERATED ALWAYS AS ((_raw_data ->> 'hosted_invoice_url'::text)) STORED,
  lines                            jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'lines'::text)) STORED,
  period_end                       integer                  GENERATED ALWAYS AS (((_raw_data ->> 'period_end'::text))::integer) STORED,
  period_start                     integer                  GENERATED ALWAYS AS (((_raw_data ->> 'period_start'::text))::integer) STORED,
  status                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  total                            bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'total'::text))::bigint) STORED,
  account_country                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'account_country'::text)) STORED,
  account_name                     text                     GENERATED ALWAYS AS ((_raw_data ->> 'account_name'::text)) STORED,
  account_tax_ids                  jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'account_tax_ids'::text)) STORED,
  amount_due                       bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount_due'::text))::bigint) STORED,
  amount_paid                      bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount_paid'::text))::bigint) STORED,
  amount_remaining                 bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount_remaining'::text))::bigint) STORED,
  application_fee_amount           bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_amount'::text))::bigint) STORED,
  attempt_count                    integer                  GENERATED ALWAYS AS (((_raw_data ->> 'attempt_count'::text))::integer) STORED,
  attempted                        boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'attempted'::text))::boolean) STORED,
  billing_reason                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'billing_reason'::text)) STORED,
  created                          integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  custom_fields                    jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'custom_fields'::text)) STORED,
  customer_address                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'customer_address'::text)) STORED,
  customer_email                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer_email'::text)) STORED,
  customer_name                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer_name'::text)) STORED,
  customer_phone                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer_phone'::text)) STORED,
  customer_shipping                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'customer_shipping'::text)) STORED,
  customer_tax_exempt              text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer_tax_exempt'::text)) STORED,
  customer_tax_ids                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'customer_tax_ids'::text)) STORED,
  default_tax_rates                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'default_tax_rates'::text)) STORED,
  discount                         jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
  discounts                        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'discounts'::text)) STORED,
  due_date                         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'due_date'::text))::integer) STORED,
  ending_balance                   integer                  GENERATED ALWAYS AS (((_raw_data ->> 'ending_balance'::text))::integer) STORED,
  footer                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'footer'::text)) STORED,
  invoice_pdf                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'invoice_pdf'::text)) STORED,
  last_finalization_error          jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'last_finalization_error'::text)) STORED,
  livemode                         boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  next_payment_attempt             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'next_payment_attempt'::text))::integer) STORED,
  number                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'number'::text)) STORED,
  paid                             boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'paid'::text))::boolean) STORED,
  payment_settings                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'payment_settings'::text)) STORED,
  post_payment_credit_notes_amount integer                  GENERATED ALWAYS AS (((_raw_data ->> 'post_payment_credit_notes_amount'::text))::integer) STORED,
  pre_payment_credit_notes_amount  integer                  GENERATED ALWAYS AS (((_raw_data ->> 'pre_payment_credit_notes_amount'::text))::integer) STORED,
  receipt_number                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
  starting_balance                 integer                  GENERATED ALWAYS AS (((_raw_data ->> 'starting_balance'::text))::integer) STORED,
  statement_descriptor             text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
  status_transitions               jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'status_transitions'::text)) STORED,
  subtotal                         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'subtotal'::text))::integer) STORED,
  tax                              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'tax'::text))::integer) STORED,
  total_discount_amounts           jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'total_discount_amounts'::text)) STORED,
  total_tax_amounts                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'total_tax_amounts'::text)) STORED,
  transfer_data                    jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
  webhooks_delivered_at            integer                  GENERATED ALWAYS AS (((_raw_data ->> 'webhooks_delivered_at'::text))::integer) STORED,
  customer                         text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  subscription                     text                     GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
  payment_intent                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
  default_payment_method           text                     GENERATED ALWAYS AS ((_raw_data ->> 'default_payment_method'::text)) STORED,
  default_source                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
  on_behalf_of                     text                     GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
  charge                           text                     GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
  metadata                         jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  id                               text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.invoices
  ADD CONSTRAINT fk_invoices_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.invoices
  ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

CREATE INDEX stripe_invoices_subscription_idx ON stripe.invoices (SUBSCRIPTION);

CREATE INDEX stripe_invoices_customer_idx ON stripe.invoices (customer);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.payment_intents (
  _last_synced_at             timestamp with time zone,
  _raw_data                   jsonb,
  _account_id                 text                     NOT NULL,
  object                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  amount                      integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
  amount_capturable           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_capturable'::text))::integer) STORED,
  amount_details              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'amount_details'::text)) STORED,
  amount_received             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount_received'::text))::integer) STORED,
  application                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
  application_fee_amount      integer                  GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_amount'::text))::integer) STORED,
  automatic_payment_methods   text                     GENERATED ALWAYS AS ((_raw_data ->> 'automatic_payment_methods'::text)) STORED,
  canceled_at                 integer                  GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
  cancellation_reason         text                     GENERATED ALWAYS AS ((_raw_data ->> 'cancellation_reason'::text)) STORED,
  capture_method              text                     GENERATED ALWAYS AS ((_raw_data ->> 'capture_method'::text)) STORED,
  client_secret               text                     GENERATED ALWAYS AS ((_raw_data ->> 'client_secret'::text)) STORED,
  confirmation_method         text                     GENERATED ALWAYS AS ((_raw_data ->> 'confirmation_method'::text)) STORED,
  created                     integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  currency                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  customer                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  description                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  invoice                     text                     GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
  last_payment_error          text                     GENERATED ALWAYS AS ((_raw_data ->> 'last_payment_error'::text)) STORED,
  livemode                    boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  metadata                    jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  next_action                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'next_action'::text)) STORED,
  on_behalf_of                text                     GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
  payment_method              text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_method'::text)) STORED,
  payment_method_options      jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'payment_method_options'::text)) STORED,
  payment_method_types        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'payment_method_types'::text)) STORED,
  processing                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'processing'::text)) STORED,
  receipt_email               text                     GENERATED ALWAYS AS ((_raw_data ->> 'receipt_email'::text)) STORED,
  review                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'review'::text)) STORED,
  setup_future_usage          text                     GENERATED ALWAYS AS ((_raw_data ->> 'setup_future_usage'::text)) STORED,
  shipping                    jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
  statement_descriptor        text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
  statement_descriptor_suffix text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor_suffix'::text)) STORED,
  status                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  transfer_data               jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
  transfer_group              text                     GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
  id                          text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.payment_intents
  ADD CONSTRAINT fk_payment_intents_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.payment_intents
  ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);

CREATE INDEX stripe_payment_intents_invoice_idx ON stripe.payment_intents (invoice);

CREATE INDEX stripe_payment_intents_customer_idx ON stripe.payment_intents (customer);

CREATE TABLE stripe.payment_methods (
  _last_synced_at timestamp with time zone,
  _raw_data       jsonb,
  _account_id     text                     NOT NULL,
  object          text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  created         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  customer        text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  type            text                     GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
  billing_details jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'billing_details'::text)) STORED,
  metadata        jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  card            jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'card'::text)) STORED,
  id              text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.payment_methods
  ADD CONSTRAINT fk_payment_methods_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.payment_methods
  ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);

CREATE INDEX stripe_payment_methods_customer_idx ON stripe.payment_methods (customer);

CREATE TABLE stripe.payouts (
  _updated_at                 timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at             timestamp with time zone,
  _raw_data                   jsonb,
  object                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  date                        text                     GENERATED ALWAYS AS ((_raw_data ->> 'date'::text)) STORED,
  type                        text                     GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
  amount                      bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
  method                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'method'::text)) STORED,
  status                      text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  created                     integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  updated                     integer                  GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
  currency                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  livemode                    boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  metadata                    jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  automatic                   boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'automatic'::text))::boolean) STORED,
  recipient                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'recipient'::text)) STORED,
  description                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  destination                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'destination'::text)) STORED,
  source_type                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'source_type'::text)) STORED,
  arrival_date                text                     GENERATED ALWAYS AS ((_raw_data ->> 'arrival_date'::text)) STORED,
  bank_account                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'bank_account'::text)) STORED,
  failure_code                text                     GENERATED ALWAYS AS ((_raw_data ->> 'failure_code'::text)) STORED,
  transfer_group              text                     GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
  amount_reversed             bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount_reversed'::text))::bigint) STORED,
  failure_message             text                     GENERATED ALWAYS AS ((_raw_data ->> 'failure_message'::text)) STORED,
  source_transaction          text                     GENERATED ALWAYS AS ((_raw_data ->> 'source_transaction'::text)) STORED,
  balance_transaction         text                     GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
  statement_descriptor        text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
  statement_description       text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_description'::text)) STORED,
  failure_balance_transaction text                     GENERATED ALWAYS AS ((_raw_data ->> 'failure_balance_transaction'::text)) STORED,
  id                          text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.payouts
  ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.plans (
  _updated_at           timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at       timestamp with time zone,
  _raw_data             jsonb,
  _account_id           text                     NOT NULL,
  object                text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  name                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
  tiers                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'tiers'::text)) STORED,
  active                boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
  amount                bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
  created               integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  product               text                     GENERATED ALWAYS AS ((_raw_data ->> 'product'::text)) STORED,
  updated               integer                  GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
  currency              text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  "interval"            text                     GENERATED ALWAYS AS ((_raw_data ->> 'interval'::text)) STORED,
  livemode              boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  metadata              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  nickname              text                     GENERATED ALWAYS AS ((_raw_data ->> 'nickname'::text)) STORED,
  tiers_mode            text                     GENERATED ALWAYS AS ((_raw_data ->> 'tiers_mode'::text)) STORED,
  usage_type            text                     GENERATED ALWAYS AS ((_raw_data ->> 'usage_type'::text)) STORED,
  billing_scheme        text                     GENERATED ALWAYS AS ((_raw_data ->> 'billing_scheme'::text)) STORED,
  interval_count        bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'interval_count'::text))::bigint) STORED,
  aggregate_usage       text                     GENERATED ALWAYS AS ((_raw_data ->> 'aggregate_usage'::text)) STORED,
  transform_usage       text                     GENERATED ALWAYS AS ((_raw_data ->> 'transform_usage'::text)) STORED,
  trial_period_days     bigint                   GENERATED ALWAYS AS (((_raw_data ->> 'trial_period_days'::text))::bigint) STORED,
  statement_descriptor  text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
  statement_description text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_description'::text)) STORED,
  id                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.plans
  ADD CONSTRAINT fk_plans_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.plans
  ADD CONSTRAINT plans_pkey PRIMARY KEY (id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.prices (
  _updated_at         timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at     timestamp with time zone,
  _raw_data           jsonb,
  _account_id         text                     NOT NULL,
  object              text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  active              boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
  currency            text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  metadata            jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  nickname            text                     GENERATED ALWAYS AS ((_raw_data ->> 'nickname'::text)) STORED,
  recurring           jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'recurring'::text)) STORED,
  type                text                     GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
  unit_amount         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'unit_amount'::text))::integer) STORED,
  billing_scheme      text                     GENERATED ALWAYS AS ((_raw_data ->> 'billing_scheme'::text)) STORED,
  created             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  livemode            boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  lookup_key          text                     GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
  tiers_mode          text                     GENERATED ALWAYS AS ((_raw_data ->> 'tiers_mode'::text)) STORED,
  transform_quantity  jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'transform_quantity'::text)) STORED,
  unit_amount_decimal text                     GENERATED ALWAYS AS ((_raw_data ->> 'unit_amount_decimal'::text)) STORED,
  product             text                     GENERATED ALWAYS AS ((_raw_data ->> 'product'::text)) STORED,
  id                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.prices
  ADD CONSTRAINT fk_prices_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.prices
  ADD CONSTRAINT prices_pkey PRIMARY KEY (id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.prices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.products (
  _updated_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at      timestamp with time zone,
  _raw_data            jsonb,
  _account_id          text                     NOT NULL,
  object               text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  active               boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
  default_price        text                     GENERATED ALWAYS AS ((_raw_data ->> 'default_price'::text)) STORED,
  description          text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  metadata             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  name                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
  created              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  images               jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'images'::text)) STORED,
  marketing_features   jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'marketing_features'::text)) STORED,
  livemode             boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  package_dimensions   jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'package_dimensions'::text)) STORED,
  shippable            boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'shippable'::text))::boolean) STORED,
  statement_descriptor text                     GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
  unit_label           text                     GENERATED ALWAYS AS ((_raw_data ->> 'unit_label'::text)) STORED,
  updated              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
  url                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'url'::text)) STORED,
  id                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.products
  ADD CONSTRAINT fk_products_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.products
  ADD CONSTRAINT products_pkey PRIMARY KEY (id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.refunds (
  _updated_at              timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at          timestamp with time zone,
  _raw_data                jsonb,
  _account_id              text                     NOT NULL,
  object                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  amount                   integer                  GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
  balance_transaction      text                     GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
  charge                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
  created                  integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  currency                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
  destination_details      jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'destination_details'::text)) STORED,
  metadata                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  payment_intent           text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
  reason                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
  receipt_number           text                     GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
  source_transfer_reversal text                     GENERATED ALWAYS AS ((_raw_data ->> 'source_transfer_reversal'::text)) STORED,
  status                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  transfer_reversal        text                     GENERATED ALWAYS AS ((_raw_data ->> 'transfer_reversal'::text)) STORED,
  id                       text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.refunds
  ADD CONSTRAINT fk_refunds_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.refunds
  ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);

CREATE INDEX stripe_refunds_payment_intent_idx ON stripe.refunds (payment_intent);

CREATE INDEX stripe_refunds_charge_idx ON stripe.refunds (charge);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.reviews (
  _updated_at         timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at     timestamp with time zone,
  _raw_data           jsonb,
  _account_id         text                     NOT NULL,
  object              text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  billing_zip         text                     GENERATED ALWAYS AS ((_raw_data ->> 'billing_zip'::text)) STORED,
  charge              text                     GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
  created             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  closed_reason       text                     GENERATED ALWAYS AS ((_raw_data ->> 'closed_reason'::text)) STORED,
  livemode            boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  ip_address          text                     GENERATED ALWAYS AS ((_raw_data ->> 'ip_address'::text)) STORED,
  ip_address_location jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'ip_address_location'::text)) STORED,
  open                boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'open'::text))::boolean) STORED,
  opened_reason       text                     GENERATED ALWAYS AS ((_raw_data ->> 'opened_reason'::text)) STORED,
  payment_intent      text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
  reason              text                     GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
  session             text                     GENERATED ALWAYS AS ((_raw_data ->> 'session'::text)) STORED,
  id                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.reviews
  ADD CONSTRAINT fk_reviews_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.reviews
  ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

CREATE INDEX stripe_reviews_payment_intent_idx ON stripe.reviews (payment_intent);

CREATE INDEX stripe_reviews_charge_idx ON stripe.reviews (charge);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.setup_intents (
  _last_synced_at     timestamp with time zone,
  _raw_data           jsonb,
  _account_id         text                     NOT NULL,
  object              text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  created             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  customer            text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  description         text                     GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
  payment_method      text                     GENERATED ALWAYS AS ((_raw_data ->> 'payment_method'::text)) STORED,
  status              text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  usage               text                     GENERATED ALWAYS AS ((_raw_data ->> 'usage'::text)) STORED,
  cancellation_reason text                     GENERATED ALWAYS AS ((_raw_data ->> 'cancellation_reason'::text)) STORED,
  latest_attempt      text                     GENERATED ALWAYS AS ((_raw_data ->> 'latest_attempt'::text)) STORED,
  mandate             text                     GENERATED ALWAYS AS ((_raw_data ->> 'mandate'::text)) STORED,
  single_use_mandate  text                     GENERATED ALWAYS AS ((_raw_data ->> 'single_use_mandate'::text)) STORED,
  on_behalf_of        text                     GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
  id                  text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.setup_intents
  ADD CONSTRAINT fk_setup_intents_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.setup_intents
  ADD CONSTRAINT setup_intents_pkey PRIMARY KEY (id);

CREATE INDEX stripe_setup_intents_customer_idx ON stripe.setup_intents (customer);

CREATE TABLE stripe.subscription_items (
  _last_synced_at      timestamp with time zone,
  _raw_data            jsonb,
  _account_id          text                     NOT NULL,
  object               text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  billing_thresholds   jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'billing_thresholds'::text)) STORED,
  created              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  deleted              boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'deleted'::text))::boolean) STORED,
  metadata             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  quantity             integer                  GENERATED ALWAYS AS (((_raw_data ->> 'quantity'::text))::integer) STORED,
  price                text                     GENERATED ALWAYS AS ((_raw_data ->> 'price'::text)) STORED,
  subscription         text                     GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
  tax_rates            jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'tax_rates'::text)) STORED,
  current_period_end   integer                  GENERATED ALWAYS AS (((_raw_data ->> 'current_period_end'::text))::integer) STORED,
  current_period_start integer                  GENERATED ALWAYS AS (((_raw_data ->> 'current_period_start'::text))::integer) STORED,
  id                   text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.subscription_items
  ADD CONSTRAINT fk_subscription_items_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.subscription_items
  ADD CONSTRAINT subscription_items_pkey PRIMARY KEY (id);

CREATE TABLE stripe.subscription_schedules (
  _last_synced_at       timestamp with time zone,
  _raw_data             jsonb,
  _account_id           text                     NOT NULL,
  object                text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  application           text                     GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
  canceled_at           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
  completed_at          integer                  GENERATED ALWAYS AS (((_raw_data ->> 'completed_at'::text))::integer) STORED,
  created               integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  current_phase         jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'current_phase'::text)) STORED,
  customer              text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  default_settings      jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'default_settings'::text)) STORED,
  end_behavior          text                     GENERATED ALWAYS AS ((_raw_data ->> 'end_behavior'::text)) STORED,
  livemode              boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  metadata              jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  phases                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'phases'::text)) STORED,
  released_at           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'released_at'::text))::integer) STORED,
  released_subscription text                     GENERATED ALWAYS AS ((_raw_data ->> 'released_subscription'::text)) STORED,
  status                text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  subscription          text                     GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
  test_clock            text                     GENERATED ALWAYS AS ((_raw_data ->> 'test_clock'::text)) STORED,
  id                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.subscription_schedules
  ADD CONSTRAINT fk_subscription_schedules_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.subscription_schedules
  ADD CONSTRAINT subscription_schedules_pkey PRIMARY KEY (id);

CREATE TABLE stripe.subscriptions (
  _updated_at                       timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  _last_synced_at                   timestamp with time zone,
  _raw_data                         jsonb,
  _account_id                       text                     NOT NULL,
  object                            text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  cancel_at_period_end              boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'cancel_at_period_end'::text))::boolean) STORED,
  current_period_end                integer                  GENERATED ALWAYS AS (((_raw_data ->> 'current_period_end'::text))::integer) STORED,
  current_period_start              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'current_period_start'::text))::integer) STORED,
  default_payment_method            text                     GENERATED ALWAYS AS ((_raw_data ->> 'default_payment_method'::text)) STORED,
  items                             jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'items'::text)) STORED,
  metadata                          jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
  pending_setup_intent              text                     GENERATED ALWAYS AS ((_raw_data ->> 'pending_setup_intent'::text)) STORED,
  pending_update                    jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'pending_update'::text)) STORED,
  status                            text                     GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
  application_fee_percent           double precision         GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_percent'::text))::double precision) STORED,
  billing_cycle_anchor              integer                  GENERATED ALWAYS AS (((_raw_data ->> 'billing_cycle_anchor'::text))::integer) STORED,
  billing_thresholds                jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'billing_thresholds'::text)) STORED,
  cancel_at                         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'cancel_at'::text))::integer) STORED,
  canceled_at                       integer                  GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
  collection_method                 text                     GENERATED ALWAYS AS ((_raw_data ->> 'collection_method'::text)) STORED,
  created                           integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  days_until_due                    integer                  GENERATED ALWAYS AS (((_raw_data ->> 'days_until_due'::text))::integer) STORED,
  default_source                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
  default_tax_rates                 jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'default_tax_rates'::text)) STORED,
  discount                          jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
  ended_at                          integer                  GENERATED ALWAYS AS (((_raw_data ->> 'ended_at'::text))::integer) STORED,
  livemode                          boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  next_pending_invoice_item_invoice integer                  GENERATED ALWAYS AS (((_raw_data ->> 'next_pending_invoice_item_invoice'::text))::integer) STORED,
  pause_collection                  jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'pause_collection'::text)) STORED,
  pending_invoice_item_interval     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'pending_invoice_item_interval'::text)) STORED,
  start_date                        integer                  GENERATED ALWAYS AS (((_raw_data ->> 'start_date'::text))::integer) STORED,
  transfer_data                     jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
  trial_end                         jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'trial_end'::text)) STORED,
  trial_start                       jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'trial_start'::text)) STORED,
  schedule                          text                     GENERATED ALWAYS AS ((_raw_data ->> 'schedule'::text)) STORED,
  customer                          text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  latest_invoice                    text                     GENERATED ALWAYS AS ((_raw_data ->> 'latest_invoice'::text)) STORED,
  plan                              text                     GENERATED ALWAYS AS ((_raw_data ->> 'plan'::text)) STORED,
  id                                text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.subscriptions
  ADD CONSTRAINT fk_subscriptions_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.subscriptions
  ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON stripe.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE stripe.tax_ids (
  _last_synced_at timestamp with time zone,
  _raw_data       jsonb,
  _account_id     text                     NOT NULL,
  object          text                     GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
  country         text                     GENERATED ALWAYS AS ((_raw_data ->> 'country'::text)) STORED,
  customer        text                     GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
  type            text                     GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
  value           text                     GENERATED ALWAYS AS ((_raw_data ->> 'value'::text)) STORED,
  created         integer                  GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
  livemode        boolean                  GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
  owner           jsonb                    GENERATED ALWAYS AS ((_raw_data -> 'owner'::text)) STORED,
  id              text                     GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);

ALTER TABLE stripe.tax_ids
  ADD CONSTRAINT fk_tax_ids_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

ALTER TABLE stripe.tax_ids
  ADD CONSTRAINT tax_ids_pkey PRIMARY KEY (id);

CREATE INDEX stripe_tax_ids_customer_idx ON stripe.tax_ids (customer);
