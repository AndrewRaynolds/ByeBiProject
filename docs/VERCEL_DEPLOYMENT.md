# Vercel migration: frontend plus separate Node API

Status: implementation prepared for preview; no Vercel project, backend host, DNS,
production deployment or shutdown is implied by this document. GitHub `main` remains
canonical. Replit remains the current runtime until the gates below pass.

## Runtime decision and audit

Reviewed against main `80434a1` (2026-11-19), including AGENTS, PRD and Architecture.

| Surface | Code / behavior | Migration treatment |
| --- | --- | --- |
| Browser | React/Vite/TS, Wouter deep links, relative `/api` requests | Static Vercel Build Output API v3; filesystem before SPA fallback |
| Auth / saved trips / expenses / planning / analytics / discovery / Zapier | Express routes, bearer validation, Drizzle/PostgreSQL | Keep existing API process and contracts; proxy all `/api` methods and query strings |
| AI | `routes.ts` SSE, 45-second abort; program proposals have a 25-second provider timeout | Keep Node process; verify incremental SSE through Vercel, cancellation and timeouts on preview |
| Stripe / Printful | Raw Stripe body before JSON parsing, signatures, durable order processing | Keep unchanged on Node; verify sandbox webhook delivery/replay before cutover |
| Background email | `transactionalEmail.ts` immediate drain plus 60-second interval | Requires continuously running process; a request-only function does not run this reliably |
| Startup | Stripe schema migration, managed webhook lookup/creation, asynchronous backfill | Keep out of Vercel build and function cold starts |
| Security | Helmet, in-process IP limits and AI concurrency counters | Frontend CSP emitted from existing policy; API controls stay on Node; validate client IP after extra proxy hop |
| Storage | Production requires PostgreSQL; process-wide pool; local memory only for development | Preserve DB and migrations; do not migrate real data or run schema push as part of hosting change |

Express support on Vercel alone is insufficient evidence of application compatibility.
A complete serverless conversion would need explicit worker scheduling, startup-job
ownership, connection budgeting and shared rate-limit storage. Those changes are outside
this migration. The selected target is **Vercel frontend + persistent Node API outside
Replit**. Replit can temporarily be that API origin, but that stage is not a completed
Replit exit. Password reset and confirmation resend now return to the current frontend origin
instead of hard-coded byebi.it, allowing isolated preview QA. No product features,
commerce switches are changed. The CI audit required two scoped transitive security
patches: `qs` 6.16.1 and `follow-redirects` 1.16.3; no framework upgrade was made.

## Build and routing

`vercel.json` selects Other (`framework: null`), `npm ci` and `npm run build:vercel`.
Leave Output Directory unset: the build emits `.vercel/output/config.json` and
`.vercel/output/static` using the Build Output API. Do not set output to `dist/public`,
which would omit the generated proxy routing. There are no Vercel API functions.
The legacy `npm run build` / `npm start` remains available for the Node host and Replit.
Install the full dependency tree: the current Node entry imports Vite/configuration.

`API_BACKEND_ORIGIN` is expanded into routing during build (not browser JavaScript).
It must be an HTTPS origin with no path, query, fragment or credentials. Use a stable
host such as the actual Replit deployment hostname during transition or the dedicated
new API hostname afterwards. Never use `byebi.it`, `www.byebi.it`, the Vercel URL, or
another alias of this Vercel deployment: DNS cutover would create a proxy loop.
Changing this value requires rebuilding Vercel.

All `/api` paths are terminal proxy routes before the SPA catch-all, including bare
`/api`. Request methods are unrestricted; do not add a body parser in front of Stripe.
API caching is disabled, including external-rewrite caching. Static frontend pages
reuse the existing production CSP (including a custom Supabase origin), frame blocking,
HTTPS and content-type protections. Browser requests remain same-origin, so no broad
CORS rule or client API-base rewrite is needed.

## Environment ownership

Use `.env.example` as the full key inventory; supply values in host settings, never Git.

| Host | Variables |
| --- | --- |
| Vercel, required build values | `API_BACKEND_ORIGIN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Vercel, public optional build values | `VITE_GOOGLE_AUTH_ENABLED`, `VITE_BOOKING_AFFILIATE_ID`, `VITE_SELLER_LEGAL_NAME`, `VITE_SELLER_CONTACT_EMAIL`, `VITE_SELLER_LEGAL_ADDRESS`, `VITE_SELLER_COUNTRY`, `VITE_SELLER_VAT_ID` |
| Node, required production values | `NODE_ENV=production`, `HOST=0.0.0.0`, host-provided `PORT`, `APP_BASE_URL`, `CRITICAL_DATA_PERSISTENCE=database`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `AVIASALES_PARTNER_ID`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRINTFUL_API_KEY`, `PRINTFUL_WEBHOOK_SECRET`, `MERCHANDISE_SALES_MODE` |
| Node, conditional configuration | `PRINTFUL_CONFIRM_ORDERS`, `ZAPIER_WEBHOOK_URL`, `TRANSACTIONAL_EMAIL_MODE`, `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`, `TRANSACTIONAL_EMAIL_REPLY_TO`, `TRANSACTIONAL_EMAIL_TEST_RECIPIENT`, `NEWSLETTER_EMAIL_MODE`, `NEWSLETTER_EMAIL_FROM`; retain public seller variables required by live-mode validation |

`APP_BASE_URL` is the **frontend** public origin, used for Stripe return URLs and email
links, not the private API hostname. For isolated preview use its stable QA frontend
origin. Do not change production APP_BASE_URL just to test a preview. VITE values are
public and embedded at build time; never place service-role or Stripe secrets there.
The current production validator requires commerce keys even with sales disabled.
Keep all existing merchandise, Printful and email modes; activation is a separate decision.

## Replit dependencies to retire

- `.replit` controls build/run/ports; it is retained for rollback and ignored by Vercel.
- Stripe falls back to the Replit connector (`REPLIT_CONNECTORS_HOSTNAME`,
  `REPL_IDENTITY`, `WEB_REPL_RENEWAL`). The new Node host must use explicit Stripe keys;
  do not copy Replit identity tokens. `REPLIT_DEPLOYMENT=1` enables managed webhook
  setup and managed-secret preference. Leave Replit variables absent on the new host,
  register the intended Stripe endpoint deliberately, and set its matching signing secret.
- `stripe-replit-sync` remains in the API for schema/sync/webhook handling. It accepts
  explicit Stripe credentials and DATABASE_URL; its name does not make the API independent
  without sandbox verification. Startup still runs migrations/backfill; run a single API
  instance initially and observe startup before exposing traffic.
- Vite's Replit theme plugin is still needed for generated styling; runtime overlay is
  bundled by the existing config; cartographer runs only in Replit development.
  They are build-time dependencies here, not Replit hosting requirements.
- Confirm whether the existing DATABASE_URL is a Replit-owned database. If so, export/
  restore and validate it on independently owned PostgreSQL before shutdown. Supabase Auth
  does not prove all application or Stripe tables are already in Supabase PostgreSQL.

## User activation and release gates

1. Import `AndrewRaynolds/ByeBiProject` into the user's Vercel team, root `.`, Other
   preset. Select the migration branch for preview; production branch stays `main`.
   Set preview-scoped public build values and API origin. Keep preview access restricted
   to QA. Connecting GitHub, choosing billing/team and managing secrets need the user.
2. Prefer an isolated staging Node process, staging DB and Supabase project, sandbox
   Stripe and safe email/fulfillment settings. Build with `npm ci` and `npm run build`,
   run `npm start`, enable restart-on-failure and graceful SIGTERM, keep the process
   continuously running, expose HTTPS and `/api/ready` health checks. Host selection and
   credentials are user activation work. The frontend also gets built on this host under
   the existing build; that does not affect which assets Vercel serves.
3. Configure Supabase Site URL and explicit redirect allowlist for the exact QA frontend
   `/auth/reset-password` recovery, `/auth` confirmation and `/auth/callback` Google paths; follow
   `google-auth-setup.md`. Keep Google disabled unless already approved and verified.
   Use the same Supabase project on browser and Node. Production configuration stays intact.
4. Wait for CI `npm run verify`, dependency audit and Vercel output build on the exact PR
   commit. Inspect Vercel build/deployment logs. Run both existing smoke commands with the
   new HTTPS URL, then the checklist below. Record URL, frontend commit, API commit,
   environment, test date and results in the PR. A green build is not QA completion.
5. Provision the final persistent API outside Replit using explicit credentials and
   independently owned DB. Verify readiness, DB access, worker retries and sandbox Stripe
   raw-body signatures/replays. Initially one instance preserves current in-memory limits;
   confirm `req.ip` identifies real visitors through Vercel plus the host proxy. Adjust
   trust-proxy only after measuring the actual chain; never blindly trust all forwarding
   headers. Proxy timeout must exceed the 45-second SSE route lifetime.
6. Merge only through the repository's normal reviewed PR integration, with CI green;
   never merge manually here. Deploy the reviewed main revisions to both hosts. Configure
   production-scoped Vercel values, set Node APP_BASE_URL to the final frontend origin,
   coordinate Stripe/Printful endpoint and signing-secret changes with their dashboards,
   and move DNS/custom domain only after successful QA. Keep rollback DNS and Replit alive.
   Avoid having two active fulfillment/webhook consumers during endpoint transition.
7. Re-run smoke and browser QA at the final URL. Observe errors, rate limiting, database
   connections, Stripe events and email queue over an agreed observation period. Disable
   Replit only after the independent API, data ownership, integrations and rollback are
   verified and the user explicitly authorizes decommissioning.

If preview temporarily proxies the existing production Replit API, it uses real data
and existing production return URLs. Limit QA to read-only/safe checks; that setup does
not validate isolated auth, payments or complete removal of Replit.

### Preview acceptance checklist

- [ ] Both smoke scripts pass at the new URL; health/readiness return JSON, not SPA HTML.
- [ ] Reload `/checkout`, `/dashboard`, `/trips/:id`, `/auth/callback` and legal pages;
      verify JS/CSS/images and CSP, mobile rendering, both brands and all locales.
- [ ] Planner emits incremental SSE chunks through proxy, completes and cancels correctly;
      verify query forwarding on flight handoff and truthful external links.
- [ ] Test account login, confirmation, recovery, refresh and enabled Google callback;
      explicit save returns to context, no duplicate trip, owner-only access still enforced.
- [ ] Saved trip, planning, expenses, shared links and analytics work on staging;
      private API responses never show a CDN cache HIT or another user's data.
- [ ] API GET, POST, PUT, PATCH and DELETE work, including invalid-input/auth responses;
      unknown `/api` paths do not return the Vercel SPA.
- [ ] With separate sandbox authorization: Stripe signature success/failure, replay
      idempotency, order reconciliation, correct return origin, Printful verification,
      queued email retry after process restart. No real payments or fulfillment.
- [ ] Real visitor IP/rate limits verified through the deployed proxy chain.
- [ ] Browser-origin data behavior communicated: drafts and sessions at `byebi.it` do
      not appear on a different preview origin. Keeping the final domain preserves its
      browser storage; no tokens/drafts are copied between origins.

## Rollback

Before DNS cutover, retain the old DNS records, last known-good Replit deployment and
matching API configuration. On failed QA, keep traffic on Replit and fix the PR. After
cutover, restore the prior frontend/API pair or DNS to Replit, restore any changed
APP_BASE_URL and webhook endpoint/secret pairing, and verify smoke again. Do not drop
schema/data or blindly re-deliver fulfillment events. Reverting a Vercel frontend alone
cannot roll back a separately deployed API or external provider configuration.

## Platform references

- [Build Output API](https://vercel.com/docs/build-output-api)
- [Output routing configuration](https://vercel.com/docs/build-output-api/configuration)
- [External rewrites and caching](https://vercel.com/docs/routing/rewrites)
- [Express support and limitations](https://vercel.com/docs/frameworks/backend/express)
