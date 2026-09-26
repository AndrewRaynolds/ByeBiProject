ALTER TABLE public.product_events
  DROP CONSTRAINT IF EXISTS product_events_event_name_check;

ALTER TABLE public.product_events
  ADD CONSTRAINT product_events_event_name_check
  CHECK (event_name IN (
    'home_view',
    'chat_started',
    'trip_plan_completed',
    'checkout_viewed',
    'auth_started',
    'signup_submitted',
    'trip_saved',
    'trip_hub_viewed',
    'splitta_opened',
    'destination_filter_selected',
    'destination_detail_opened',
    'destination_experiences_opened',
    'experience_city_selected',
    'experience_category_selected',
    'experience_item_clicked',
    'destination_ai_handoff',
    'experiences_ai_handoff'
  )) NOT VALID;

ALTER TABLE public.product_events
  VALIDATE CONSTRAINT product_events_event_name_check;
