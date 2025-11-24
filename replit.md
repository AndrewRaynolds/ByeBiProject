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

The OneClick Assistant implements a strict, step-by-step conversational flow: 5 mandatory questions (destination, dates, participants, event type) are asked before proceeding. Itinerary generation occurs only after the user selects at least one experience from a list of exactly four options provided by the AI. The AI chat behavior is governed by strict rules, preventing premature itinerary generation, destination assumptions (never defaults to Ibiza), and resetting information when the destination changes. AI responses are parsed for structured commands (e.g., [SET_DESTINATION:]) to automatically update the frontend state.

An Activity Ideas Generator allows users to get personalized activity suggestions based on destination and month, displayed in a modal with visual cards. The booking flow follows Chat → Itinerary → Checkout → Purchase simulation, with a static mockup for itinerary and checkout pages, including dynamic pricing calculation based on user selections. Expense management is handled by brand-specific SplittaBro/SplittaBride components with corresponding themes and robust group creation flows.

## External Dependencies
- **GROQ API**: Primary AI engine (llama-3.3-70b-versatile) for ultra-fast streaming chat responses (Server-Sent Events) and structured JSON generation for activity ideas.
- **OpenAI API**: Backup AI engine.
- **Pexels API**: Used for dynamic destination image search, with a fallback to Unsplash.
- **Zapier**: Integrated via webhooks for AI-powered itinerary generation, allowing structured data exchange for ChatGPT processing.
```