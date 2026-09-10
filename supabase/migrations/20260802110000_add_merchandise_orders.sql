CREATE TABLE public.merchandise_orders (
  id uuid PRIMARY KEY,
  user_id text,
  brand text NOT NULL,
  stripe_session_id text,
  stripe_event_id text,
  payment_status text DEFAULT 'pending' NOT NULL,
  fulfillment_status text DEFAULT 'pending_payment' NOT NULL,
  amount_total integer NOT NULL,
  currency text NOT NULL,
  shipping_country text NOT NULL,
  shipping_method text NOT NULL,
  shipping_amount integer NOT NULL,
  items jsonb NOT NULL,
  printful_order_id text,
  printful_status text,
  stripe_refund_id text,
  tracking_number text,
  tracking_url text,
  shipping_carrier text,
  shipped_at timestamp without time zone,
  legal_version text NOT NULL,
  terms_accepted_at timestamp without time zone NOT NULL,
  failure_code text,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  CONSTRAINT merchandise_orders_brand_check
    CHECK (brand IN ('byebro', 'byebride')),
  CONSTRAINT merchandise_orders_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  CONSTRAINT merchandise_orders_fulfillment_status_check
    CHECK (fulfillment_status IN (
      'pending_payment',
      'processing',
      'submitted',
      'fulfillment_failed',
      'manual_review',
      'cancelled',
      'shipped',
      'returned'
    )),
  CONSTRAINT merchandise_orders_amount_total_check CHECK (amount_total > 0),
  CONSTRAINT merchandise_orders_shipping_country_check CHECK (shipping_country ~ '^[A-Z]{2}$'),
  CONSTRAINT merchandise_orders_shipping_amount_check CHECK (shipping_amount >= 0),
  CONSTRAINT merchandise_orders_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT merchandise_orders_items_check
    CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX merchandise_orders_stripe_session_id_uidx
  ON public.merchandise_orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE UNIQUE INDEX merchandise_orders_stripe_event_id_uidx
  ON public.merchandise_orders (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX merchandise_orders_user_id_idx
  ON public.merchandise_orders (user_id);

CREATE INDEX merchandise_orders_created_at_idx
  ON public.merchandise_orders (created_at);

ALTER TABLE public.merchandise_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.merchandise_orders FROM anon, authenticated;
