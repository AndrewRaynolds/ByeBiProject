# ByeBi Beta QA Checklist

Use this checklist for the first 20–30 invited testers. The goal is to validate the real planning and coordination journey without treating ByeBi as a booking engine.

## Release-owner preflight

- [ ] Confirm the candidate commit is the current GitHub `main`.
- [ ] Confirm CI is green for that exact commit.
- [ ] Run `npm run verify` with the CI Supabase placeholders.
- [ ] Sync Replit from GitHub `main` and republish manually.
- [ ] Run `npm run smoke:production -- https://byebi.it`.
- [ ] Run `npm run smoke:travel:production -- https://byebi.it`.
- [ ] Confirm the header contains **Invia feedback / Send feedback / Enviar feedback**.
- [ ] Confirm `/privacy` names Aviasales, Booking.com and GetYourGuide, and does not name Amadeus as an active provider.
- [ ] Confirm no page presents an internal flight or hotel price, live availability or booking confirmation.

Do not invite testers until every preflight item passes.

## Tester allocation

Assign each tester one primary combination, while allowing free exploration afterward.

| Cohort | Testers | Brand | Locale | Suggested device | Main focus |
| --- | ---: | --- | --- | --- | --- |
| A | 5 | ByeBro | Italian | Mixed mobile/desktop | Planner and review |
| B | 5 | ByeBride | Italian | Mixed mobile/desktop | Brand parity and discovery |
| C | 5 | Both | English | Mixed mobile/desktop | Localization and handoffs |
| D | 5 | Both | Spanish | Mixed mobile/desktop | Localization and auth |
| E | 5–10 | Both | Any | Mostly mobile | Save, Trip Hub and return journeys |

At least one tester in each cohort should use keyboard-only navigation. Cover current Safari, Chrome and Firefox where available; include at least one small-screen iPhone and one Android device.

## Instructions for every tester

- Use invented trip details and future dates. Do not enter sensitive personal information.
- Do not complete a travel booking or merchandise payment as part of beta QA.
- External prices and availability belong to the named provider, not ByeBi.
- Use **Send feedback** when something is confusing or broken. Include expected result, actual result, device/browser and a screenshot when useful; never include passwords, tokens or payment data.

## Core journey

### 1. Brand, language and discovery

- [ ] Select ByeBro or ByeBride and confirm the brand stays consistent while navigating.
- [ ] Switch among Italian, English and Spanish; wait for the selected language to finish loading and confirm the visible page updates.
- [ ] Open Destinations and Experiences, apply at least one available filter and open a detail page.
- [ ] Start planning from a discovery page and confirm the chosen context reaches the Planner.
- [ ] Confirm browser back/forward navigation does not lose the selected brand or locale.

### 2. Planner

- [ ] Start without signing in.
- [ ] Provide origin, destination, future start/end dates, participants, budget per person and at least one preference.
- [ ] Try one incomplete or contradictory answer and confirm the Planner asks for correction rather than inventing a value.
- [ ] Confirm the review brief contains only the intended trip details and clearly treats the amount as budget per person.
- [ ] Edit one field from review and confirm the updated brief is correct.
- [ ] Close and reopen the Planner; confirm the current brand draft resumes.
- [ ] Use **New trip** and confirm only the transient draft is reset; no Saved Trip is deleted.

### 3. Provider handoff

- [ ] Continue from a valid review brief to Travel Options.
- [ ] Confirm flights point to Aviasales, hotels to Booking.com and activities to GetYourGuide.
- [ ] Confirm external actions name the destination provider and make it clear that the user is leaving ByeBi.
- [ ] Confirm ByeBi does not show a fake fare, hotel price, availability or booking success.
- [ ] For a group above nine people, confirm the flight handoff explains the Aviasales passenger cap/group-booking limitation.
- [ ] Return to ByeBi without purchasing and confirm the planning context remains usable.
- [ ] Confirm merely opening an external provider does not save the trip or mark anything as booked.

### 4. Explicit save and authentication

- [ ] While signed out, choose **Save trip** explicitly.
- [ ] Confirm auth opens only after the save action and the return destination is the Travel Options flow.
- [ ] Try one invalid login/sign-up input and confirm the error is localized, understandable and actionable.
- [ ] Complete sign-in or registration with the assigned beta account.
- [ ] Confirm the valid trip context is preserved and saved only after the explicit save flow resumes.
- [ ] Repeat the save action and confirm an equivalent duplicate Saved Trip is not created.
- [ ] Confirm planning and provider handoff still work without saving.

### 5. Dashboard and Trip Hub

- [ ] Open Dashboard and locate the Saved Trip.
- [ ] Open its Trip Hub and compare destination, dates, participants, per-person budget and preferences with the reviewed plan.
- [ ] Change the manual organization status for flights, hotel and activities; refresh and confirm it persists.
- [ ] Confirm those statuses are coordination labels, not provider-verified booking claims.
- [ ] Open Splitta from the Trip Hub, add only synthetic expenses, and confirm totals use consistent currency units.
- [ ] Return from Splitta to the same Trip Hub.
- [ ] If testing sharing, use the generated link in a private/incognito window and confirm it exposes only the intended public trip view.

### 6. Feedback and safety

- [ ] Open **Send feedback** from both desktop and mobile navigation.
- [ ] Confirm the draft includes only brand, locale and pathname context.
- [ ] Confirm query strings, share tokens, account details and trip content are absent.
- [ ] Cancel the draft unless submitting a real beta report.
- [ ] Confirm no visible user-facing copy names Amadeus as active or implies ByeBi sells/confirms travel.

## Pass/fail record

For every failed item record:

- tester ID and cohort;
- date/time and production URL;
- device, OS, browser and viewport orientation;
- brand and locale;
- exact step, expected result and actual result;
- screenshot or short recording when useful;
- whether retry, refresh or sign-out changed the result.

Severity:

- **P0 — stop beta:** data exposure, authentication/ownership bypass, destructive data loss, fake booking/payment success, production unavailable.
- **P1 — fix before broad invite:** core Planner cannot complete, provider handoff is wrong or misleading, explicit save/auth return fails, Saved Trip is incorrect/duplicated, primary locale or mobile journey is unusable.
- **P2 — beta can continue with tracking:** localized copy gap, non-blocking layout/accessibility issue, confusing but recoverable step.
- **P3 — backlog:** cosmetic polish or enhancement with a clear workaround.

## Go/no-go rule

Go for the 20–30 tester beta only when release-owner preflight is fully green, there are no open P0/P1 issues, and at least one clean end-to-end pass exists for each brand plus each supported locale. P2/P3 findings may remain only with an owner, workaround and follow-up decision.
