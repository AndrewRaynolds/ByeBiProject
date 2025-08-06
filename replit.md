# ByeBro Travel Platform

## Project Overview
AI-powered travel platform for bachelor party planning with comprehensive expense management system. Features OneClick Assistant for conversational trip planning, particularly specialized for Ibiza with detailed restaurant and nightlife database.

## Recent Changes
- **2025-08-06**: COMPLETATO - Implementato sistema di ricerca immagini funzionante con Pexels API
- **2025-08-06**: COMPLETATO - Aggiornata immagine Barcellona a vista aerea panoramica con Sagrada Familia
- **2025-08-06**: COMPLETATO - Cambiata immagine Ibiza con club Ushuaia pieno di gente che balla
- **2025-08-06**: COMPLETATO - Aggiornata immagine Budapest con vista aerea caratteristica con Parlamento e Danubio
- **2025-08-06**: Implemented Image Search API with IMAGE_SEARCH_API_KEY for dynamic destination images
- **2025-08-06**: Implemented Zapier + ChatGPT integration for AI-powered itinerary generation
- **2025-08-06**: Created /api/generate-itinerary route with structured payload for Zapier webhook
- **2025-08-06**: Updated Ibiza destination images with crystal clear beach photos per user request
- **2025-01-02**: Updated all destinations across the entire app to only include 10 specified cities
- **2025-06-18**: Fixed OneClick Assistant chat bugs - eliminated duplicate questions and improved layout
- **Previous**: Integrated comprehensive Ibiza database with restaurants, nightlife venues, and pricing
- **Previous**: Implemented conversational flow system for personalized itinerary generation
- **Previous**: Added SplittaBro expense management system for group cost splitting

## User Preferences
- Language: Italian interface preferred
- Style: Informal, enthusiastic tone with emojis for trip planning
- Visual: ByeBro red theme colors for branding consistency
- Focus: Conversational approach over dropdown menus for user interaction

## Project Architecture
- Frontend: React + TypeScript with Wouter routing
- UI: Shadcn components with Tailwind CSS
- Backend: Express.js with in-memory storage
- APIs: Integrated Booking.com, Kiwi.com, OpenAI
- Features: OneClick Assistant, SplittaBro expense splitting, travel booking

## Available Destinations (Only 10)
1. Roma - La Città Eterna
2. Ibiza - Club leggendari
3. Barcellona - Spiagge e festa  
4. Praga - Prezzi ottimi
5. Budapest - Bagni termali
6. Cracovia - Prezzi imbattibili
7. Amsterdam - Vita notturna
8. Berlino - Club underground
9. Lisbona - Fascino costiero
10. Palma de Mallorca - Beach club

## Technical Notes
- OneClick Assistant uses step-by-step conversation flow to prevent duplicate questions
- **Image Search API**: /api/images/search, /api/images/destinations, /api/images/test routes funzionanti
- **Dynamic Images**: IMAGE_SEARCH_API_KEY configurata con Pexels API (funzionante) + fallback Unsplash
- **Barcelona Images**: Nuova immagine panoramica dall'alto con Sagrada Familia ben visibile
- **Zapier Integration**: /api/generate-itinerary sends structured data to Zapier webhook for ChatGPT processing
- **AI Fallback**: Local itinerary generation when Zapier webhook unavailable or unconfigured
- Ibiza destination has specialized database with real venue pricing and seasonal advice
- Chat interface contains messages within proper boundaries with responsive design
- Authentication system supports user sessions and premium features
- All destination data updated to match the 10 specified cities only
- Environment variables: ZAPIER_WEBHOOK_URL for AI, IMAGE_SEARCH_API_KEY for images