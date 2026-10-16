# Google sign-in: configuration and staging validation

The local implementation is opt-in. No provider, secret, consent setting or deployment
has been changed. The feature is not ready to advertise as working until the following
external setup and real staging flow have been validated.

## Configuration (separate authorized operation)

1. Prepare a Google Web OAuth client, its consent branding/audience and authorized
   origins for the actual staging or production host. Use the Supabase Google provider
   callback shown in that project's dashboard as Google's authorized redirect URI.
2. Configure the Google client ID/secret in Supabase's provider settings. Do not put
   the client secret in Vite variables, source files or browser storage. Request only
   basic identity scopes; do not add Gmail/Drive access or offline Google consent.
3. Configure the actual Site URL and allow the application callback on the exact
   intended host and `/auth/callback` path, including the generated `attempt` query
   suffix. Verify that Supabase preserves that suffix and adds `code` when returning;
   it must not fall back to the root Site URL. For a separate staging origin, use a
   narrowly scoped allow-list pattern for this callback's query suffix, not a wildcard
   over arbitrary hosts/routes. Confirm its exact syntax against the deployed Auth
   version and current Supabase guidance before changing the dashboard.
4. In the staging build only, set `VITE_GOOGLE_AUTH_ENABLED=true`. The default is
   false, so ordinary builds leave the button hidden. This public flag is not a secret
   or an authorization control. The existing Supabase public URL/key remain required.
5. Check the Google button/consent branding, typography and privacy disclosures against
   the current provider requirements before enabling the feature for users. The local
   button embeds Google's official G asset without modifications or remote image calls;
   it uses Google Sans when available with Arial fallback, so typography still needs
   provider-branding review in the target environment.

Sources consulted on 16 October 2026:
[Google via Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking),
[Google branding](https://developers.google.com/identity/branding-guidelines).
The installed SDK was also inspected: this implementation uses its existing
`exchangeCodeForSession(code)` signature rather than assuming newer flow-ID APIs.
Per-tab verifier storage supplies isolation for this SDK version.

## Required real staging checks

- Sign in as a test user, return to Checkout and a protected Trip Hub path, then
  explicitly save. No save should occur merely because authentication succeeds.
- Preserve both brand and locale, Planner, currentItinerary and optional local drafts.
- Deny consent, close/back out, expire/reuse a code, clear browser storage, return
  without code, refresh during callback and sign out after success. Errors must be
  localized and must not display codes, tokens or provider descriptions.
- Confirm same-tab completion and safe failure when sessionStorage/verifier is missing.
  Use two independent tabs and ensure one tab's attempt does not consume the other's.
- Test an email/password account with the same verified email and inspect the resulting
  Supabase identity/user ID. Do not promise automatic linking for all account states,
  manually merge users, or copy roles from user-editable profile metadata.
- Confirm password login, signup confirmation and old/new password recovery links still
  work; the primary auth flow outside the Google callback is intentionally unchanged.
- Verify Supabase session refresh, server bearer ownership, logout, blocked account
  behavior and that admin access still derives only from server-trusted metadata.

Use test accounts in an authorized non-production project. No real test account,
Google login, credential or configuration change was used for the local delivery.

## Local automated verification

The helper and UI suites mock exchanges and session transfer. An additional installed
SDK test builds a real S256 challenge and per-tab verifier without contacting Google
or exchanging a real authorization code. These tests do not establish that an
external Google/Supabase project has been configured correctly.
