# Manual production migration

The `20260731_critical_data_persistence.sql` migration prepares durable storage
for Splitta groups and expenses, generated itineraries, and processed Stripe
webhook events.

Apply it to a database backup or staging database first. After validating the
application, set:

```env
CRITICAL_DATA_PERSISTENCE=database
```

Do not enable database persistence before the migration has completed.
Legacy rows without a Supabase owner are deliberately assigned an
`legacy-unowned:<id>` owner so they cannot be claimed by an authenticated user.
