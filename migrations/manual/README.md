# Archived manual migrations

These files record the migrations that were applied manually before the
Supabase GitHub integration was configured. Do not apply them again.

The canonical migration history now lives in `supabase/migrations/`. The
remote schema was captured as an applied baseline, so future database changes
must be added there and deployed through the GitHub integration.

## Historical application order

The migrations were applied in filename order:

1. `20260731_critical_data_persistence.sql` prepares durable storage for
   Splitta groups and expenses, and processed Stripe webhook events. The
   generated itineraries table created at that time was later removed unused.
2. `20260731_secret_blog_persistence.sql` enables durable Secret Blog posts,
   validates categories, adds the listing index, and inserts the three default
   stories idempotently.

After validating the application, production must use:

```env
CRITICAL_DATA_PERSISTENCE=database
```

Do not enable database persistence before the migration has completed.
Legacy rows without a Supabase owner are deliberately assigned an
`legacy-unowned:<id>` owner so they cannot be claimed by an authenticated user.
