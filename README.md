# ByeBi

ByeBi is a full-stack web application for planning bachelor and bachelorette trips. It combines conversational travel assistance with authentication, group tools, affiliate travel services and a merchandise checkout flow.

> **Project status:** pre-launch and under active development. Payments and order handling have been tested in Stripe test mode. This repository demonstrates project experience; it does not claim a commercial launch or revenue.

## What the application does

- Provides two branded experiences: **ByeBro** and **ByeBride**.
- Collects trip details through a conversational assistant.
- Directs users to external travel providers through affiliate links.
- Uses Supabase for authentication and session management.
- Stores application data in PostgreSQL through versioned migrations.
- Includes a Stripe Checkout flow for merchandise, with persisted orders.
- Supports Italian, English and Spanish interfaces.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Data and authentication | PostgreSQL, Supabase Auth, Drizzle ORM, Zod |
| Testing and delivery | Vitest, Testing Library, GitHub Actions |
| Travel services | OpenAI, Aviasales, Booking.com, GetYourGuide |
| Commerce and communications | Stripe Checkout, Printful, Resend |

## My contribution

I am Andrea Ranaldo, co-creator of ByeBi. I have worked on the technical implementation since late 2025, while my project collaborator focuses on commercial strategy.

My hands-on work includes:

- integrating Supabase authentication and managing user sessions;
- creating and modifying database tables, migrations and relationships;
- connecting external services and generating affiliate travel links;
- implementing Stripe Checkout, testing payments and persisting orders;
- testing APIs, debugging application flows and maintaining the project with Git and GitHub.

Development includes AI-assisted coding for research, implementation and debugging. I review and test application behaviour and am continuing to strengthen my independent command of React, TypeScript and Node.js/Express.

## Architecture at a glance

```text
client/                 React application and user interface
server/                 Express API and external-service integrations
shared/                 Shared schemas, validation and data contracts
supabase/migrations/    Versioned PostgreSQL migrations
.github/workflows/      CI and production-health workflows
```

The frontend sends authenticated API requests using the Supabase access token. Express middleware verifies the token server-side before protected data is read or changed. External-service credentials remain on the server and are configured through environment variables.

## Main flows

### Travel planning

1. The user describes a trip in natural language.
2. The assistant collects and validates the required planning context.
3. ByeBi produces a reviewable travel brief and transparent external handoffs.
4. Flights open an Aviasales search; hotels open Booking.com; activities open GetYourGuide.
5. Current prices, availability, terms and travel booking are confirmed on the external provider.
6. The user may explicitly save the trip and continue coordination in the authenticated Trip Hub.

### Merchandise checkout

1. The user selects products and a shipping option.
2. The server creates a Stripe Checkout session.
3. Stripe test mode processes the payment simulation.
4. A verified webhook updates the stored order.
5. Printful and transactional-email operations are handled server-side.

## Run locally

### Requirements

- Node.js 20
- PostgreSQL or a Supabase project
- Environment variables for the services being tested

### Installation

```bash
git clone https://github.com/AndrewRaynolds/ByeBiProject.git
cd ByeBiProject
npm install
cp .env.example .env
npm run dev
```

The application starts through the Express server, which also serves the frontend during development. Features connected to external providers require their respective credentials.

## Quality checks

```bash
npm run verify
npm run smoke:production -- https://byebi.it
npm run smoke:travel:production -- https://byebi.it
```

The repository contains unit and integration tests for frontend components, shared schemas, security controls and server-side services. GitHub Actions runs the project checks on repository changes.

## Security and data handling

- Authentication tokens are verified server-side before protected operations.
- Secrets and service-role credentials are read from environment variables and are not committed.
- External navigation is restricted to approved HTTPS providers.
- Stripe and Printful events are verified before order state is updated.
- Affiliate analytics excludes authentication tokens, chat content and complete outbound URLs.

## Current status

ByeBi is not yet commercially launched. Current work focuses on consolidating the user journey, validating integrations and preparing the product for a reliable release.

## Contact

**Andrea Ranaldo**

[GitHub profile](https://github.com/AndrewRaynolds) · [andrew.ranaldo@gmail.com](mailto:andrew.ranaldo@gmail.com)
