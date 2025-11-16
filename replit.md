# ByeBi Dual-Brand Travel Platform

## Project Overview
AI-powered dual-brand travel platform: **ByeBro** for bachelor party planning and **ByeBride** for bachelorette party planning. Features OneClick Assistant powered by GROQ streaming for ultra-fast conversational itinerary generation, Activity Ideas Generator, and comprehensive expense management. Initial ByeBi landing page offers elegant brand selection leading to fully integrated experiences.

## Recent Changes
- **2025-11-11**: Redesigned ByeBi logo with abstract double-B SVG icon above text for better brand identity
- **2025-11-11**: Updated ByeBi logo gradient to use rosso-nero-rosa-bianco color sequence for elegant visual impact
- **2025-11-11**: Added connecting curve element between abstract B letters for sophisticated brand cohesion
- **2025-11-11**: Implemented complete expense group creation flow with loader, redirect, and error handling for both SplittaBro and SplittaBride
- **2025-11-11**: Added loading animation during group creation ("Creazione in corso...") with spinner
- **2025-11-11**: Implemented automatic redirect to group detail page after successful creation
- **2025-11-11**: Enhanced error handling with clear user messages for connection/database issues
- **2025-11-11**: Fixed critical bug where totalAmount undefined caused app crash in both Splitta components
- **2025-11-11**: Updated destination images for Ibiza, Budapest, Cracovia, Amsterdam, Berlino, Palma de Mallorca with higher quality iconic photos
- **2025-11-10**: Implemented brand-aware props across all shared components (HowItWorks, ExperienceTypes, FeaturedDestinations, SecretBlog, PremiumFeatures, Testimonials)
- **2025-11-10**: All ByeBride sections now display "Bride" terminology: "How ByeBride Works", "The Ultimate BrideNight", "My Olympic Bride", "Chill and Feel the Bride", "The Wild Brideventure"
- **2025-11-10**: ExperienceTypes dynamically remaps experience names for ByeBride using EXPERIENCE_NAME_MAP
- **2025-11-10**: Created separate testimonial datasets (testimonialsBro vs testimonialsBride) with gender-appropriate stories
- **2025-11-10**: PremiumFeatures now has complete brand-specific copy including benefit descriptions and annual plan text
- **2025-11-10**: Home passes brand="bro" and HomeBride passes brand="bride" to all shared components
- **2025-11-10**: Created SplittaBride component with pink theme for bachelorette parties
- **2025-11-10**: Updated all references from "Bro" to "Bride" in ByeBride section
- **2025-11-10**: Changed SplittaBro colors to pink-600 for SplittaBride (addio al nubilato context)
- **2025-11-10**: Updated Header to show conditional SplittaBro/SplittaBride link based on brand
- **2025-11-10**: Added routing for /splitta-bride page with brand-specific component
- **2025-11-08**: Redesigned Itinerary and Checkout pages with modern UI (gradients, glassmorphism, animations)
- **2025-11-08**: Aligned booking flow UI to match landing page aesthetic (dark gradients, backdrop-blur, red accents)
- **2025-11-08**: Enhanced cards with glassmorphism effects, gradient icons, and hover animations
- **2025-11-08**: Improved sticky footer with gradient background and responsive layout
- **2025-11-08**: Created complete booking flow mockup (Chat → Itinerary → Checkout → Purchase)
- **2025-11-08**: Added "Genera Itinerario" button in chat after 2+ messages exchanged
- **2025-11-08**: Built Itinerary page with Ibiza mockup (flights, hotels, cars, activities)
- **2025-11-08**: Implemented toggle selection system with dynamic total price calculation
- **2025-11-08**: Created Checkout page with purchase summary and fake payment popup
- **2025-11-08**: All mockup data is static front-end only (no backend integration)
- **2025-11-07**: Added "Cambia brand" button in Header to return to ByeBi brand selection
- **2025-11-07**: Header now displays dynamic branding (ByeBro/ByeBride) with theme colors
- **2025-11-07**: Created dual-brand system with ByeBi initial landing page
- **2025-11-07**: Implemented elegant brand selection with ByeBro (red/black) and ByeBride (pink/black)
- **2025-11-07**: Created ByeBride version with HeroSectionBride, ActivityIdeasCompactBride, ChatDialogCompactBride
- **2025-11-07**: Added partyType support to GROQ streaming and activity suggestions endpoints
- **2025-11-07**: Created BYEBRIDE_SYSTEM_PROMPT focused on spa, beach clubs, brunch, wellness experiences
- **2025-11-07**: Completely redesigned hero section with integrated two-column layout (Activity Ideas + Chat)
- **2025-11-07**: Simplified Activity Ideas form to use only destination and month (no start/end dates)
- **2025-11-07**: Activity suggestions now display in modal dialog instead of separate section
- **2025-11-07**: Removed standalone Activity Suggestions section for cleaner, more concise UX
- **2025-11-07**: Reorganized hero section with two main CTAs: "Get Trip Ideas" and "Chat Assistant"
- **2025-11-07**: Replaced Trip Planning Form with Activity Suggestions as main planning tool
- **2025-11-07**: Hidden Custom Merchandise section (temporarily)
- **2025-11-07**: Improved UX flow: users choose between AI activity suggestions or conversational assistant
- **2025-11-07**: Added Activity Suggestions section - AI generates personalized activity ideas based on destination and dates
- **2025-11-07**: Created /api/chat/activity-suggestions endpoint using GROQ for structured JSON generation
- **2025-11-07**: Implemented visual card display with icons for each activity suggestion (clubs, boats, dining, etc.)
- **2025-11-07**: Integrated GROQ streaming for ultra-fast real-time chat responses (10x faster than OpenAI)
- **2025-11-07**: Added hero section chat input bar - users can start chatting directly from landing page
- **2025-11-07**: Simplified chat welcome message for better UX
- **2025-11-07**: Created /api/chat/groq-stream endpoint with Server-Sent Events (SSE) for streaming
- **2025-11-07**: Implemented llama-3.3-70b-versatile model with ByeBro personality in system prompt
- **2025-08-06**: COMPLETATO - Implementato sistema di ricerca immagini funzionante con Pexels API
- **2025-08-06**: COMPLETATO - Aggiornata immagine Barcellona a vista aerea panoramica con Sagrada Familia
- **2025-08-06**: COMPLETATO - Aggiornata immagine Ibiza con vista aerea della costa con barche e acque turchesi cristalline
- **2025-08-06**: COMPLETATO - Aggiornata immagine Budapest con vista aerea caratteristica con Parlamento e Danubio
- **2025-08-06**: COMPLETATO - Cracovia: monumento principale (Piazza del Mercato con Monumento Adam Mickiewicz)
- **2025-08-06**: COMPLETATO - Amsterdam: caratteristici canali e ponti della città
- **2025-08-06**: COMPLETATO - Palma de Mallorca: vista aerea di spiaggia serena con acqua turchese cristallina e sabbia bianca
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
- APIs: Integrated Booking.com, Kiwi.com, GROQ (primary AI), OpenAI (backup)
- Features: OneClick Assistant with GROQ streaming, SplittaBro expense splitting, travel booking
- AI: GROQ llama-3.3-70b-versatile for ultra-fast streaming responses with graceful fallback

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
- **Booking Flow Mockup**: Chat → "Genera Itinerario" button → /itinerary → /checkout → purchase popup
- **Itinerary Mockup**: Static Ibiza trip (2-5 July, 6 people) with selectable cards for flights, hotels, cars, activities
- **Dynamic Pricing**: Real-time total calculation based on selected items (price × people)
- **Checkout Flow**: Summary page with purchase simulation (2-second loading → success popup)
- **Data Storage**: Uses localStorage to pass selected items between Itinerary and Checkout pages
- **Dual-Brand Architecture**: BrandSelection component → localStorage brand → dynamic Home/HomeBride routing
- **ByeBro**: Red/black theme, bachelor party focus (clubs, boat parties, nightlife)
- **ByeBride**: Pink/black theme, bachelorette party focus (spa, beach clubs, brunch, wellness)
- **Party Type Support**: partyType parameter throughout GROQ endpoints for context-aware responses
- **Chat Integration**: Chat opens in modal dialog directly on landing page - no page navigation required
- **Activity Suggestions**: Non-chatbot GROQ-powered activity generator - users input destination/month, AI returns structured suggestions
- **Activity Display**: Card-based layout with lucide-react icons (music, ship, utensils, party, car, waves, flame, beer, mappin)
- **GROQ Streaming**: Real-time SSE streaming with /api/chat/groq-stream endpoint using llama-3.3-70b-versatile
- **GROQ JSON Mode**: /api/chat/activity-suggestions generates structured JSON for activity ideas with graceful fallback
- **Hero Section**: Two-column integrated layout with Activity Ideas Generator (left) and Chat Assistant (right)
- **AI System**: Primary GROQ with brand-specific prompts (BYEBRO_SYSTEM_PROMPT, BYEBRIDE_SYSTEM_PROMPT)
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
- Environment variables: GROQ_API_KEY (primary), ZAPIER_WEBHOOK_URL, IMAGE_SEARCH_API_KEY, OPENAI_API_KEY (backup)