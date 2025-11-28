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

An Activity Ideas Generator allows users to get personalized activity suggestions based on destination and month, displayed in a modal with visual cards. The booking flow follows Chat → Itinerary → Checkout → Purchase simulation, with a static mockup for itinerary and checkout pages, including dynamic pricing calculation based on user selections. Expense management is handled by brand-specific SplittaBro/SplittaBride components with corresponding themes and robust group creation flows.

## External Dependencies
- **GROQ API**: Primary AI engine (llama-3.3-70b-versatile) for ultra-fast streaming chat responses (Server-Sent Events) and structured JSON generation for activity ideas.
- **OpenAI API**: Backup AI engine.
- **Pexels API**: Used for dynamic destination image search, with a fallback to Unsplash.
- **Zapier**: Integrated via webhooks for AI-powered itinerary generation, allowing structured data exchange for ChatGPT processing.
```