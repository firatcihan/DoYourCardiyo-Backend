# DoYourCardio Full-Stack Integration Design

## Context

DoYourCardio backend (NestJS) has a working cardio photo analysis pipeline (Clerk auth, Sharp preprocessing, Gemini AI) but analysis results aren't persisted. The frontend (Next.js 16) has full UI with mock data but zero backend integration. This spec covers: connecting both projects, adding club system, persisting cardio data, and building leaderboards.

---

## Data Models (Backend - MongoDB/Mongoose)

### Member
```
userId: string        — Clerk user ID (unique index)
clubId: ObjectId      — ref: Club (required)
displayName: string   — from Clerk at registration
avatarUrl: string     — from Clerk at registration (nullable)
createdAt: Date
```

### Club
```
name: string          — unique
description: string   — optional
createdBy: string     — admin userId
createdAt: Date
```

### CardioSession (replaces UploadLog)
```
userId: string        — index
duration: number      — minutes
calories: number      — kcal
distance: number      — optional
unit: string          — optional (km/mi)
floors: number        — optional
createdAt: Date
```
- No TTL index (data is permanent)
- Daily limit check uses CardioSession with createdAt >= today

---

## Backend API Endpoints

### ClubModule (`/clubs`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/clubs` | ClerkAuth | List all clubs |
| POST | `/clubs` | ClerkAuth + AdminGuard | Create club |
| PATCH | `/clubs/:id` | ClerkAuth + AdminGuard | Edit club |
| DELETE | `/clubs/:id` | ClerkAuth + AdminGuard | Delete club |

### MemberModule (`/members`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/members/register` | ClerkAuth | Onboarding: select club, save Clerk profile info |
| GET | `/members/me` | ClerkAuth | Get own member profile |
| GET | `/members/leaderboard` | ClerkAuth | Leaderboard with query params |

**Leaderboard query params:**
- `period`: `weekly` | `monthly` (default: weekly)
- `metric`: `calories` | `distance` | `duration` (default: calories)
- `clubId`: optional, filter by club

**Leaderboard response:** Aggregated CardioSession data joined with Member info, sorted by selected metric. Returns both individual and club rankings.

### CardioModule (extend existing)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/cardio/analyze` | ClerkAuth + DailyLimit | Existing + save result as CardioSession |
| GET | `/cardio/history` | ClerkAuth | User's past sessions (paginated) |
| GET | `/cardio/stats` | ClerkAuth | User's weekly/monthly aggregated stats |

**Stats response:** totalDuration, totalCalories, totalDistance, sessionCount for the requested period.

### AdminGuard
- Reads `publicMetadata.role` from Clerk token claims
- Rejects with 403 if role !== "admin"

---

## Frontend Structure

### New Pages
- `/app/onboarding/page.tsx` — Club selection (mandatory for first-time users)
- `/app/admin/page.tsx` — Admin panel (club CRUD, protected by admin check)

### API Proxy Routes (`/app/api/`)
Each route forwards request to backend at `BACKEND_URL` (env var, default `http://localhost:4000`), passing Clerk auth token from `@clerk/nextjs/server`.

| Frontend Route | Backend Target |
|---|---|
| `/api/clubs` | `GET/POST /clubs` |
| `/api/clubs/[id]` | `PATCH/DELETE /clubs/:id` |
| `/api/members/register` | `POST /members/register` |
| `/api/members/me` | `GET /members/me` |
| `/api/members/leaderboard` | `GET /members/leaderboard` |
| `/api/cardio/analyze` | `POST /cardio/analyze` |
| `/api/cardio/history` | `GET /cardio/history` |
| `/api/cardio/stats` | `GET /cardio/stats` |

### Component Changes
- **upload-card.tsx** — Real fetch to `/api/cardio/analyze` instead of mock
- **stats-overview.tsx** — Fetch from `/api/cardio/stats`, show weekly/monthly toggle
- **leaderboard.tsx** — Fetch from `/api/members/leaderboard`, add metric selector (calories/distance/duration) and period toggle (weekly/monthly)
- **recent-history.tsx** — Fetch from `/api/cardio/history` with pagination
- **club-selector.tsx** — Display current club (read-only, set during onboarding)

### Onboarding Flow
1. User signs in via Clerk
2. Middleware checks `GET /api/members/me`
3. If no member record exists → redirect to `/onboarding`
4. User selects a club from list → `POST /api/members/register`
5. Redirect to home page

### Admin Panel
- Protected: check Clerk `publicMetadata.role === "admin"` client-side + backend AdminGuard
- Simple UI: list clubs, create/edit/delete club forms

---

## Backend Port Change
- Backend runs on port **4000** (was 3000)
- Frontend stays on port 3000 (Next.js default)
- `BACKEND_URL=http://localhost:4000` env var in frontend

---

## Key Files to Modify

### Backend
- `src/app.module.ts` — Register ClubModule, MemberModule
- `src/cardio/cardio.controller.ts` — Save CardioSession after analyze
- `src/cardio/cardio.module.ts` — Register CardioSession schema, add history/stats endpoints
- `src/cardio/schemas/upload-log.schema.ts` — Replace with CardioSession schema (or keep for backward compat and add new)
- `src/common/auth/admin.guard.ts` — New AdminGuard
- `src/common/auth/daily-limit.guard.ts` — Query CardioSession instead of UploadLog
- `src/club/` — New module (club.module.ts, club.controller.ts, club.service.ts, schemas/club.schema.ts)
- `src/member/` — New module (member.module.ts, member.controller.ts, member.service.ts, schemas/member.schema.ts)
- `src/main.ts` — Change default port to 4000
- `.env.example` — Add new env vars

### Frontend
- `app/onboarding/page.tsx` — New
- `app/admin/page.tsx` — New
- `app/api/**` — New proxy routes
- `components/upload-card.tsx` — Replace mock with real API
- `components/stats-overview.tsx` — Add data fetching
- `components/leaderboard.tsx` — Add data fetching + metric/period selectors
- `components/recent-history.tsx` — Add data fetching
- `components/club-selector.tsx` — Show current club
- `proxy.ts` — Add onboarding redirect logic
- `.env.local` — Add BACKEND_URL

---

## Verification Plan

1. **Backend unit tests:** Test ClubService, MemberService, CardioSession persistence, AdminGuard, leaderboard aggregation
2. **Backend manual test:** Start backend on port 4000, use curl/Postman to test all endpoints with Clerk token
3. **Frontend integration:** Start both servers, sign in via Clerk, complete onboarding, upload a cardio photo, verify data appears in stats/history/leaderboard
4. **Admin flow:** Set admin role in Clerk dashboard, access admin panel, create/edit/delete clubs
5. **Onboarding guard:** Sign in as new user, verify redirect to onboarding, select club, verify redirect to home
