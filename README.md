# ByeBi Dual-Brand Travel Platform

## Overview
ByeBi is an AI-powered dual-brand travel platform featuring **ByeBro** for bachelor parties and **ByeBride** for bachelorette parties. It offers "The Chat Bro" / "The Chat Bride" as central chat assistants for conversational flight search and itinerary generation, and comprehensive expense management via SplittaBro/SplittaBride. The platform's core vision is to streamline group travel planning for specific event types (bachelor/bachelorette parties) by leveraging AI for personalized and efficient itinerary creation, with a strong focus on user experience and brand-specific customization.

## User Preferences
- Language: Italian interface preferred
- Style: Informal, enthusiastic tone with emojis for trip planning
- Visual: ByeBro red theme colors for branding consistency
- Focus: Conversational approach over dropdown menus for user interaction

## System Architecture
The platform is built with React and TypeScript for the frontend, utilizing Shadcn components with Tailwind CSS for a modern UI/UX featuring dark gradients, glassmorphism, and responsive design. Wouter handles client-side routing. The backend is an Express.js server backed by PostgreSQL in production; in-memory storage is limited to local development.

**Authentication: Supabase Auth** (migrated from Passport.js, March 2025)
- All auth is handled by Supabase. Users appear in the Supabase Authentication dashboard.
- Frontend: `useAuth()` hook (`client/src/hooks/use-auth.tsx`) wraps Supabase `signInWithPassword`, `signUp`, `signOut`, and `onAuthStateChange`. `AuthUser` type has UUID `id`. Frontend uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- Backend: `server/supabase.ts` creates a Supabase client using server-only secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (throws on startup if missing — no fallbacks). The `isAuthenticated` middleware in `routes.ts` verifies Bearer JWT tokens via `supabase.auth.getUser(token)` and attaches the verified `User` to `req.supabaseUser` (typed via Express namespace in `server/types.ts`).
- `queryClient.ts` automatically attaches `Authorization: Bearer <token>` headers to all API requests.
- Trip `userId` is now `text` (Supabase UUID) — changed from `integer`. Trip creation/retrieval enforces ownership against the JWT-verified user.
- Auth page (`/auth`) uses email + password (not username).

## Database migrations

- `supabase/migrations/` is the canonical database history used by the
  Supabase GitHub integration.
- `supabase/seed.sql` contains local/preview test content and is not deployed
  to production by the GitHub integration.
- The integration working directory is `.` because `supabase/` is located at
  the repository root.
- Production deploys are triggered from `main`. Require the Supabase status
  check before merging database changes.
- Files under `migrations/manual/` are historical records only and must not be
  applied again.
- Do not make schema changes directly in the production Dashboard. Add a new
  timestamped SQL migration and let the integration apply it.

Key architectural decisions include a dual-brand system starting with a ByeBi landing page for brand selection (ByeBro: red/black, bachelor focus; ByeBride: pink/black, bachelorette focus). All shared components are brand-aware, dynamically adjusting content and themes.

The chat assistant implements a conversational flight-planning flow:
1. The user describes the trip naturally.
2. The assistant asks only for missing origin, destination, dates, or passenger count.
3. Once the required data is complete, OpenAI calls the validated `search_flights` tool.
4. The backend maps cities to IATA codes and creates the Aviasales checkout link.
5. The frontend waits for the successful tool result, stores the shared `TripContext`, and opens checkout.

The server-generated checkout URL is authoritative; the frontend never navigates from an unverified tool request.

**Real Flow Architecture (December 2024 refactor):**
The booking flow uses a unified TripContext data contract stored in localStorage under 'currentItinerary':
```typescript
interface TripContext {
  origin: string;           // IATA code or city name
  destination: string;      // City name
  startDate: string;        // YYYY-MM-DD (user's trip dates)
  endDate: string;          // YYYY-MM-DD
  people: number;           // Number of travelers
  aviasalesCheckoutUrl: string;  // Pre-built Aviasales deep link
  flightLabel?: string;     // Display label for flight section
}
```
- **Chatbot** → writes TripContext to localStorage
- **Itinerary.tsx** (/itinerary) → reads TripContext, shows trip summary, Aviasales link, continue to checkout
- **Checkout.tsx** (/checkout) → reads TripContext, shows Aviasales button + real Amadeus hotel search

**Flight prices are NEVER shown** - users book flights directly via Aviasales partner links.
**Date handling**: All dates use string-only formatters (formatDateRangeIT, normalizeFutureTripDate) - NO Date() constructor to avoid timezone issues.

**Entry points** (all unified, December 2024):
- TripPlanningForm.tsx → saves currentItinerary → navigates to /itinerary
- ChatDialogCompact.tsx / ChatDialogCompactBride.tsx → saves currentItinerary → navigates to /itinerary

The hero section of each brand features a centered chat assistant ("The Chat Bro" for ByeBro, "The Chat Bride" for ByeBride) as the primary entry point for trip planning. Expense management is handled by brand-specific SplittaBro/SplittaBride components with corresponding themes and robust group creation flows.

## GetYourGuide Integration (January 2026)
Affiliate links for experiences/activities are integrated via `GetYourGuideCta` component in Itinerary and Checkout pages.

**Supported destinations**:
- Rome, Barcelona, Ibiza, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca

**Files**:
- `client/src/lib/getyourguide.ts` - Link mapping with IT/EN city name normalization (Roma↔Rome, Barcellona↔Barcelona, etc.)
- `client/src/lib/track.ts` - Event tracking helper (console log structured)
- `client/src/components/GetYourGuideCta.tsx` - Reusable CTA component

**Behavior**: CTA only renders for supported destinations. Opens affiliate link in new tab with tracking event.

## i18n System (February 2026)
Complete internationalization system supporting Italian (default), English, and Spanish.

**Architecture**:
- `client/src/contexts/LanguageContext.tsx` - LanguageProvider, useTranslation hook, t() function with {{param}} interpolation
- `client/src/locales/it.json` - Italian translations (221 keys, default/fallback)
- `client/src/locales/en.json` - English translations (221 keys, lazy-loaded)
- `client/src/locales/es.json` - Spanish translations (221 keys, lazy-loaded)

**Usage**: `const { t, locale, setLocale } = useTranslation();` then `t('key.name')` or `t('key.name', { param: value })`

**Language selector**: Flag dropdown in Header navbar (🇮🇹/🇬🇧/🇪🇸), persisted to localStorage under `byebi_locale`

**Refactored components**: Header, Footer, BrandSelection, HeroSection, HeroSectionBride, Testimonials, Newsletter, SecretBlog, CustomMerchandise, PremiumFeatures, AuthModal, Itinerary, Checkout, GetYourGuideCta, not-found

**Note**: Italian locale is loaded synchronously (bundled) for instant first render. EN/ES are lazy-loaded on demand. Chat responses are handled separately by AI language detection.

## External Dependencies
- **OpenAI API**: Primary engine for streaming chat responses and validated travel tool calls.
- **Zapier**: Integrated via webhooks for AI-powered itinerary generation, allowing structured data exchange for ChatGPT processing.
- **GetYourGuide**: Affiliate links for city-based experiences (10 destinations supported).
- **Printful API**: Print-on-demand merchandise integration for travel gadgets (t-shirts, caps). Uses Bearer token auth via `PRINTFUL_API_KEY` secret.

## Printful Integration (February 2026)
Print-on-demand merchandise store for travel gadgets via Printful API.

**Files**:
- `server/services/printful.ts` - Printful API service (products, variants, shipping rates)
- `server/routes.ts` - API routes under `/api/printful/*`
- `client/src/pages/MerchandisePage.tsx` - Storefront showing real Printful products

**API Endpoints**:
- `GET /api/printful/products` - List all store products with variants
- `GET /api/printful/products/:id` - Get single product details
- `POST /api/printful/shipping-rates` - Calculate shipping rates

Orders are created only after a verified Stripe Checkout webhook.

## Stripe Integration (February 2026)
Payment processing for merchandise via Stripe Checkout (connector: Stripe).

**Files**:
- `server/stripeClient.ts` - Stripe client with Replit connector credentials
- `server/webhookHandlers.ts` - Stripe webhook processing via stripe-replit-sync
- `server/index.ts` - Stripe initialization (migrations, webhook, sync) and webhook route (BEFORE express.json())
- `server/routes.ts` - Checkout session and payment routes under `/api/stripe/*`

**API Endpoints**:
- `GET /api/stripe/publishable-key` - Get Stripe publishable key
- `POST /api/stripe/checkout` - Create Stripe Checkout Session from cart items
- `GET /api/stripe/session/:sessionId` - Get session payment status

**Flow**: Cart → Stripe Checkout (with shipping address collection) → Payment → Success page
**Database**: stripe-replit-sync manages `stripe` schema automatically via PostgreSQL
```
