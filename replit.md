# ByeBi Dual-Brand Travel Platform

## Overview
ByeBi is an AI-powered dual-brand travel platform featuring **ByeBro** for bachelor parties and **ByeBride** for bachelorette parties. It offers a OneClick Assistant for ultra-fast conversational itinerary generation, an Activity Ideas Generator, and comprehensive expense management via SplittaBro/SplittaBride. The platform's core vision is to streamline group travel planning for specific event types (bachelor/bachelorette parties) by leveraging AI for personalized and efficient itinerary creation, with a strong focus on user experience and brand-specific customization.

## User Preferences
- Language: Italian interface preferred
- Style: Informal, enthusiastic tone with emojis for trip planning
- Visual: ByeBro red theme colors for branding consistency
- Focus: Conversational approach over dropdown menus for user interaction

## System Architecture
The platform is built with React and TypeScript for the frontend, utilizing Shadcn components with Tailwind CSS for a modern UI/UX featuring dark gradients, glassmorphism, and responsive design. Wouter handles client-side routing. The backend is an Express.js server with in-memory storage.

Key architectural decisions include a dual-brand system starting with a ByeBi landing page for brand selection (ByeBro: red/black, bachelor focus; ByeBride: pink/black, bachelorette focus). All shared components are brand-aware, dynamically adjusting content and themes.

The OneClick Assistant implements a strict, step-by-step conversational flow with origin city selection and real flight integration:
1. User specifies destination → AI asks for origin city (Italian airports)
2. User provides origin city → [SET_ORIGIN:CityName] directive emitted
3. User provides dates and participants
4. Backend fetches real flights via Aviasales API from origin to destination
5. AI presents 3 flight options with real prices
6. User selects flight (1, 2, or 3) → [SELECT_FLIGHT:X] directive emitted
7. User selects experiences from 4 options
8. Itinerary generated with selected flight details propagated to checkout

AI responses are parsed for structured commands (SET_DESTINATION, SET_ORIGIN, SET_DATES, SET_PARTICIPANTS, SELECT_FLIGHT, SHOW_EXPERIENCES, UNLOCK_ITINERARY_BUTTON) to automatically update frontend state. The city-to-IATA mapping covers 17 Italian airports and 10 European destinations.

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

An Activity Ideas Generator allows users to get personalized activity suggestions based on destination and month, displayed in a modal with visual cards. Expense management is handled by brand-specific SplittaBro/SplittaBride components with corresponding themes and robust group creation flows.

## GetYourGuide Integration (January 2026)
Affiliate links for experiences/activities are integrated via `GetYourGuideCta` component in Itinerary and Checkout pages.

**Supported destinations**:
- Rome, Barcelona, Ibiza, Prague, Budapest, Krakow, Amsterdam, Berlin, Lisbon, Palma de Mallorca

**Files**:
- `client/src/lib/getyourguide.ts` - Link mapping with IT/EN city name normalization (Roma↔Rome, Barcellona↔Barcelona, etc.)
- `client/src/lib/track.ts` - Event tracking helper (console log structured)
- `client/src/components/GetYourGuideCta.tsx` - Reusable CTA component

**Behavior**: CTA only renders for supported destinations. Opens affiliate link in new tab with tracking event.

## External Dependencies
- **GROQ API**: Primary AI engine (llama-3.3-70b-versatile) for ultra-fast streaming chat responses (Server-Sent Events) and structured JSON generation for activity ideas.
- **OpenAI API**: Backup AI engine.
- **Pexels API**: Used for dynamic destination image search, with a fallback to Unsplash.
- **Zapier**: Integrated via webhooks for AI-powered itinerary generation, allowing structured data exchange for ChatGPT processing.
- **GetYourGuide**: Affiliate links for city-based experiences (10 destinations supported).
```