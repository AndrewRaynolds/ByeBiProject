# ByeBro Travel Platform

## Project Overview
AI-powered travel platform for bachelor party planning with comprehensive expense management system. Features OneClick Assistant for conversational trip planning, particularly specialized for Ibiza with detailed restaurant and nightlife database.

## Recent Changes
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

## Technical Notes
- OneClick Assistant uses step-by-step conversation flow to prevent duplicate questions
- Ibiza destination has specialized database with real venue pricing and seasonal advice
- Chat interface contains messages within proper boundaries with responsive design
- Authentication system supports user sessions and premium features