---
date: 2026-01-29T17:36:34Z
researcher: Alessio Fanelli
git_commit: 7f659d2
branch: main
repository: ByeBi-replit
topic: "How is authentication implemented?"
tags: [research, codebase, authentication, passport, session, auth]
status: complete
last_updated: 2026-01-29
last_updated_by: Alessio Fanelli
---

# Research: How is authentication implemented?

**Date**: 2026-01-29T17:36:34Z
**Researcher**: Alessio Fanelli
**Git Commit**: 7f659d2
**Branch**: main
**Repository**: ByeBi-replit

## Research Question
How is authentication implemented?

## Summary

The application uses **session-based authentication** powered by Passport.js with a LocalStrategy (username/password). Sessions are stored in-memory via MemoryStore and passwords are hashed with Node.js's scrypt algorithm. The client manages auth state through two separate React context implementations — one using React Query and one using localStorage. There are no OAuth or third-party authentication integrations.

## Detailed Findings

### Server-Side Authentication Core

#### Password Hashing (`server/auth.ts:22-33`)
- Uses Node.js native `crypto.scrypt` for key derivation
- Generates a random 16-byte salt per password via `crypto.randomBytes()`
- Produces a 64-byte hash and stores it as `{hash}.{salt}` (both hex-encoded)
- Verification uses `crypto.timingSafeEqual()` for constant-time comparison

#### Session Configuration (`server/auth.ts:35-57`)
- Session secret sourced from `process.env.SESSION_SECRET`, falling back to a random 32-byte hex string
- MemoryStore with 24-hour expired entry pruning
- Cookie settings: 24-hour max age, `httpOnly: true`, `secure` in production, `sameSite: "lax"`
- Trust proxy enabled for HTTPS behind reverse proxies
- Middleware chain: `session` → `passport.initialize()` → `passport.session()`

#### Passport LocalStrategy (`server/auth.ts:60-86`)
- Accepts username or email for login (tries username first, then email)
- Verifies password with `comparePasswords()`
- Returns generic "Incorrect username or password" message on failure (doesn't reveal which field was wrong)

#### Serialization (`server/auth.ts:88-101`)
- Serialize: stores only `user.id` in the session
- Deserialize: loads full user object from storage by ID on each request

### API Endpoints

| Endpoint | Method | File:Line | Description |
|---|---|---|---|
| `/api/register` | POST | `server/auth.ts:104-144` | Creates user, hashes password, auto-logs in |
| `/api/login` | POST | `server/auth.ts:147-166` | Authenticates via Passport LocalStrategy |
| `/api/logout` | POST | `server/auth.ts:169-174` | Destroys session via `req.logout()` |
| `/api/user` | GET | `server/auth.ts:177-186` | Returns current user if authenticated |

#### Registration flow:
1. Validates presence of username, email, password
2. Checks for existing username and email (returns 400 if duplicate)
3. Hashes password with scrypt
4. Creates user in storage
5. Auto-logs in the new user via `req.login()`
6. Returns user object without password (201)

#### Login flow:
1. `passport.authenticate("local")` invoked with custom callback
2. Strategy finds user by username or email
3. Verifies password
4. Session established via `req.login()`
5. Returns user object without password (200)

### Server-Side Route Protection

#### Middleware (`server/routes.ts:26-31`)
```
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Authentication required" });
};
```

Applied to:
- `POST /api/users/:id/premium` (`routes.ts:33`)
- `POST /api/trips` (`routes.ts:58`)

### Client-Side Auth State

#### Primary: React Query Context (`client/src/hooks/use-auth.tsx`)
- Provides `AuthProvider` and `useAuth()` hook
- Fetches user from `/api/user` using React Query with `getQueryFn({ on401: "returnNull" })`
- Exposes `loginMutation`, `logoutMutation`, `registerMutation`
- Updates React Query cache on successful auth operations
- `isAuthenticated` computed as `!!user`
- Used by: Header, TripPlanningForm, OneClickAssistant, ProtectedRoute, AuthPage

#### Secondary: localStorage Context (`client/src/contexts/AuthContext.tsx`)
- Separate `AuthProvider` and `useAuth()` hook
- Persists user in localStorage under key `"byebroUser"`
- Manual `login()`, `logout()`, `updateUser()` methods
- No server validation on mount
- Used by: SecretBlog, SecretBlogPage, Dashboard, PremiumFeatures, AuthModal

#### Provider Setup
- `client/src/App.tsx:74` — wraps app with `AuthProvider` (from hooks/use-auth.tsx) inside `QueryClientProvider`
- `client/src/main.tsx:6` — wraps `<App />` with `AuthProvider` (from contexts/AuthContext.tsx)

### Client-Side Route Protection

#### ProtectedRoute Component (`client/src/lib/protected-route.tsx`)
- Shows loading spinner while auth state resolves
- Redirects to `/auth` if user is not authenticated
- Renders component if authenticated
- Uses wouter's `Route` and `Redirect` components

Protected routes in `App.tsx`:
- `/dashboard` → Dashboard
- `/secret-blog` → SecretBlogPage

### API Request Handling (`client/src/lib/queryClient.ts:10`)
- All requests include `credentials: "include"` to send session cookies
- `getQueryFn` supports configurable 401 behavior:
  - `"returnNull"` — used for `/api/user` to gracefully handle unauthenticated state
  - Default — throws error on non-OK responses

### Data Model

#### Users Table (`shared/schema.ts:6-23`)
| Column | Type | Constraints |
|---|---|---|
| id | serial | primary key |
| username | text | not null, unique |
| password | text | not null |
| email | text | not null, unique |
| firstName | text | nullable |
| lastName | text | nullable |
| isPremium | boolean | default false |
| createdAt | timestamp | default now |

#### Storage Layer (`server/storage.ts`)
- `MemStorage` class using `Map<number, User>`
- Methods: `getUser(id)`, `getUserByUsername(username)`, `getUserByEmail(email)`, `createUser(user)`, `updateUserPremiumStatus(id, isPremium)`
- Auto-incrementing ID counter
- All data in-memory (lost on server restart)

### Auth-Dependent Features

- **Premium content gating**: Components check `user?.isPremium` to show/hide premium features (`SecretBlog.tsx:25`, `SecretBlogPage.tsx:17`)
- **Form submission guards**: TripPlanningForm checks `isAuthenticated` before allowing submission (`TripPlanningForm.tsx:133`)
- **Header UI**: Conditionally renders login/signup buttons or user dropdown with logout (`Header.tsx:20`)

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| passport | ^0.7.0 | Authentication middleware |
| passport-local | ^1.0.0 | Username/password strategy |
| express-session | ^1.18.1 | Session middleware |
| memorystore | ^1.6.7 | In-memory session store |
| Node.js crypto | built-in | scrypt hashing, randomBytes, timingSafeEqual |

## Code References
- `server/auth.ts:22-33` — Password hashing and comparison functions
- `server/auth.ts:35-57` — Session and Passport configuration
- `server/auth.ts:60-86` — Passport LocalStrategy definition
- `server/auth.ts:88-101` — Session serialization/deserialization
- `server/auth.ts:104-186` — Auth API endpoints (register, login, logout, get user)
- `server/routes.ts:22-23` — Auth setup initialization
- `server/routes.ts:26-31` — isAuthenticated middleware
- `server/storage.ts:123-157` — User storage methods
- `shared/schema.ts:6-23` — Users table schema
- `client/src/hooks/use-auth.tsx` — Primary React Query-based auth context
- `client/src/contexts/AuthContext.tsx` — Secondary localStorage-based auth context
- `client/src/lib/protected-route.tsx` — Client-side route protection
- `client/src/lib/queryClient.ts:10` — API request helper with credentials
- `client/src/pages/auth-page.tsx` — Login/signup page
- `client/src/components/AuthModal.tsx` — Modal auth UI
- `client/src/components/Header.tsx:20` — Auth-aware header navigation

## Architecture Documentation

**Authentication Pattern**: Session-based with Passport.js LocalStrategy. No JWT, no OAuth. Sessions stored server-side in MemoryStore with cookie-based session IDs sent to the client.

**Client State Pattern**: Two coexisting auth context implementations — React Query-based (hooks/use-auth.tsx) and localStorage-based (contexts/AuthContext.tsx). Both export `useAuth()` and `AuthProvider`. Different components import from different sources.

**Protection Pattern**: Server uses `isAuthenticated` middleware on protected routes. Client uses `ProtectedRoute` wrapper component that redirects to `/auth`. Some components also perform inline auth checks before actions.

**Data Layer**: In-memory Map storage (MemStorage class). Drizzle schema defined but storage uses in-memory maps rather than a database connection.

## Related Research
_No prior research documents found in thoughts/shared/research/_

## Open Questions
- Which components should use which AuthContext (hooks/ vs contexts/)? Both are active and used by different parts of the app.
- Is the in-memory storage intentional for development, or is a database connection planned?
