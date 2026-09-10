ALTER TABLE public.merchandise_orders
  ADD COLUMN IF NOT EXISTS customer_email text;

CREATE TABLE IF NOT EXISTS public.merchandise_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.merchandise_orders(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  provider_message_id text,
  last_error text,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  CONSTRAINT merchandise_notifications_type_check CHECK (type IN (
    'payment_confirmed',
    'order_submitted',
    'order_shipped',
    'order_attention',
    'order_refunded'
  )),
  CONSTRAINT merchandise_notifications_status_check CHECK (status IN (
    'pending',
    'processing',
    'sent',
    'failed'
  )),
  CONSTRAINT merchandise_notifications_attempts_check CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS merchandise_notifications_order_type_uidx
  ON public.merchandise_notifications (order_id, type);

CREATE INDEX IF NOT EXISTS merchandise_notifications_status_updated_idx
  ON public.merchandise_notifications (status, updated_at);

ALTER TABLE public.merchandise_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.merchandise_notifications FROM anon, authenticated;
