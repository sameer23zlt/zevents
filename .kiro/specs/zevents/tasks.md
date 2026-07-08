# Implementation Plan: Zevents

## Overview

Implement the Zevents PWA event management application using Next.js, MongoDB Atlas, Material UI, and JWT-based auth via HTTP-only cookies. Tasks are ordered to build the foundation first (project setup, DB, auth), then domain features (users, events, join requests), then the frontend, and finally PWA configuration.

## Tasks

- [x] 1. Initialize project structure, configuration, and database layer
  - Scaffold a Next.js (App Router) project with TypeScript if not already done
  - Install and pin dependencies: `mongodb`, `jose` (JWT), `swr`, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `fast-check`, `jest`, `@types/jest`, `jest-environment-node`, `ts-jest`, `@testing-library/react`, `@testing-library/jest-dom`, `mongodb-memory-server`
  - Create `src/lib/mongodb.ts` implementing the singleton MongoDB client with connection caching
  - Define environment variable types in `src/types/env.d.ts` (`MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`)
  - Create `src/types/models.ts` with TypeScript interfaces: `User`, `Event`, `JoinRequest`, `SessionPayload`
  - Create `jest.config.ts` and `jest.setup.ts` per design spec
  - Create directory structure: `src/app/api/`, `src/lib/`, `src/types/`, `src/components/`, `__tests__/properties/`, `__tests__/unit/`
  - _Requirements: 11.1, 11.2, 12.1, 12.2_

- [ ] 2. Implement authentication middleware and JWT utilities
  - [x] 2.1 Create `src/lib/auth.ts` with `signToken`, `verifyToken`, and `getSessionFromRequest` helpers using `jose`
    - Sign JWTs with 7-day expiry; include `sub`, `role`, `username` in payload
    - `getSessionFromRequest` extracts and verifies the JWT from the HTTP-only `session` cookie
    - _Requirements: 2.4, 4.4_
  - [-] 2.2 Create `src/lib/authMiddleware.ts` with `requireAdmin` and `requireUser` wrappers
    - Return 401 when token is missing or expired
    - Return 403 when role is insufficient
    - _Requirements: 2.2, 3.4, 4.2, 4.3_
  - [ ]* 2.3 Write unit tests for auth utilities
    - Test `signToken` / `verifyToken` round-trip
    - Test expired token returns 401
    - Test wrong-role token returns 403
    - Test missing cookie returns 401
    - _Requirements: 2.3, 4.3_

- [ ] 3. Implement `/api/auth` routes
  - [-] 3.1 Create `src/app/api/auth/login/route.ts`
    - Accept POST `{ username, password }` (password optional for users)
    - Check Admin credentials against env vars; on match issue JWT with role="admin"
    - For user login: look up user by username; enforce status gate (pending→403, rejected→403, approved→200 + JWT)
    - Set JWT in HTTP-only `session` cookie; return session info
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [~] 3.2 Create `src/app/api/auth/logout/route.ts` — clear `session` cookie
    - _Requirements: 2.4, 4.4_
  - [~] 3.3 Create `src/app/api/auth/me/route.ts` — return current session payload or 401
    - _Requirements: 2.4, 4.4_
  - [ ]* 3.4 Write unit tests for auth routes
    - Test valid admin login → 200 + cookie set
    - Test invalid admin password → 401
    - Test approved user login → 200
    - Test pending user login → 403 "awaiting approval"
    - Test rejected user login → 403 "rejected"
    - _Requirements: 2.2, 2.3, 4.2, 4.3_

- [ ] 4. Implement user registration and admin user management API routes
  - [x] 4.1 Create `src/app/api/users/register/route.ts`
    - Accept POST `{ fullName, username }`; validate required fields (400 if missing)
    - Insert user with status="pending"; handle duplicate username with 409
    - _Requirements: 1.1, 1.2, 1.3_
  - [-] 4.2 Create `src/app/api/users/route.ts` (GET, Admin-only)
    - List all users; support optional `?status=` filter
    - _Requirements: 3.1_
  - [~] 4.3 Create `src/app/api/users/[id]/approve/route.ts` and `src/app/api/users/[id]/reject/route.ts` (PATCH, Admin-only)
    - Update user status to "approved" / "rejected"
    - _Requirements: 3.2, 3.3_
  - [ ]* 4.4 Write property test: Property 1 — Username uniqueness
    - **Property 1: Username uniqueness is enforced**
    - **Validates: Requirements 1.2**
    - File: `__tests__/properties/users.property.test.ts`
    - Generate random username strings; register once (assert 201); register again with same username (assert 409); verify DB contains exactly 1 record with that username
  - [ ]* 4.5 Write property test: Property 2 — New registrations always start pending
    - **Property 2: New registrations always start in pending status**
    - **Validates: Requirements 1.3**
    - File: `__tests__/properties/users.property.test.ts`
    - Generate random unique usernames; register; assert returned status="pending"
  - [ ]* 4.6 Write property test: Property 4 — Admin status transitions persist
    - **Property 4: Admin status transitions are authoritative and persistent**
    - **Validates: Requirements 3.2, 3.3**
    - File: `__tests__/properties/users.property.test.ts`
    - Generate random pending users; approve or reject via API; re-fetch user; assert stored status matches the applied transition

- [ ] 5. Implement events API routes
  - [x] 5.1 Create `src/app/api/events/route.ts`
    - GET (User/Admin): return all events with title, description, capacity, attendeeCount, isFull
    - POST (Admin-only): create event with required fields validated (400 if missing); capacity ≥ 1; insert with attendeeCount=0, isFull=false
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 7.1_
  - [-] 5.2 Create `src/app/api/events/[id]/route.ts`
    - PATCH (Admin-only): update event fields; return updated document
    - DELETE (Admin-only): remove event from MongoDB
    - _Requirements: 6.2, 6.3_
  - [-] 5.3 Create `src/app/api/events/[id]/attendees/route.ts` (GET, User/Admin)
    - Return list of confirmed attendees (joined with users collection) for the event
    - _Requirements: 9.1_
  - [ ]* 5.4 Write property test: Property 5 — Event creation visible with required fields
    - **Property 5: Event creation is immediately visible with all required fields**
    - **Validates: Requirements 5.2, 5.3, 6.1, 7.1, 9.2**
    - File: `__tests__/properties/events.property.test.ts`
    - Generate random valid event payloads; create; fetch list; assert event present and contains title, description, capacity, attendeeCount, isFull
  - [ ]* 5.5 Write property test: Property 6 — Event edits and deletes are immediately consistent
    - **Property 6: Event edits and deletes are immediately consistent (read-after-write)**
    - **Validates: Requirements 6.2, 6.3**
    - File: `__tests__/properties/events.property.test.ts`
    - Generate random events + random update payloads; PATCH; fetch list; assert updated values present; DELETE; assert event absent from listing

- [ ] 6. Implement join requests API routes
  - [~] 6.1 Create `src/app/api/join-requests/route.ts`
    - POST (User): create join request with status="pending"; enforce event capacity check (409 if full); enforce duplicate check using compound index (409 if pending/confirmed already exists)
    - GET (Admin): return all pending join requests with user name, username, and event title
    - _Requirements: 7.2, 7.3, 7.4, 8.1_
  - [~] 6.2 Create `src/app/api/join-requests/[id]/confirm/route.ts` (PATCH, Admin)
    - Update join request status to "confirmed"
    - Atomically increment event attendeeCount and set isFull=true if attendeeCount reaches capacity
    - _Requirements: 8.2, 8.4, 9.1_
  - [~] 6.3 Create `src/app/api/join-requests/[id]/reject/route.ts` (PATCH, Admin)
    - Update join request status to "rejected"
    - _Requirements: 8.3_
  - [ ]* 6.4 Write property test: Property 7 — No duplicate active join requests
    - **Property 7: No duplicate active join requests per user per event**
    - **Validates: Requirements 7.3**
    - File: `__tests__/properties/joinRequests.property.test.ts`
    - Generate random (userId, eventId) pairs; submit join request twice; assert second submission returns 409; assert DB has exactly 1 non-rejected record for the pair
  - [ ]* 6.5 Write property test: Property 8 — Capacity is a hard upper bound
    - **Property 8: Capacity is a hard upper bound — never exceeded**
    - **Validates: Requirements 7.4, 8.4**
    - File: `__tests__/properties/capacity.property.test.ts`
    - Generate random capacity N (1–10); create N+1 join requests; confirm N; assert (N+1)th confirm is rejected with 409; assert event isFull=true and attendeeCount=N
  - [ ]* 6.6 Write property test: Property 9 — Confirming a join request atomically updates attendee state
    - **Property 9: Confirming a join request atomically updates attendee state**
    - **Validates: Requirements 8.2, 9.1**
    - File: `__tests__/properties/joinRequests.property.test.ts`
    - Generate random pending requests; confirm via API; assert join request status="confirmed" AND user appears in attendee list AND attendeeCount equals total confirmed join requests for the event

- [~] 7. Checkpoint — API layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement access control property test
  - [ ]* 8.1 Write property test: Property 3 — User access determined by status
    - **Property 3: User access is determined entirely by account status**
    - **Validates: Requirements 1.4, 3.4, 3.5, 4.2, 4.3**
    - File: `__tests__/properties/auth.property.test.ts`
    - Generate random status values ("pending", "rejected", "approved") and random protected routes; assert approved users get 200, pending/rejected get 401 or 403

- [ ] 9. Implement frontend authentication pages
  - [~] 9.1 Create `src/app/providers.tsx` with `AuthProvider` (React Context) that calls `/api/auth/me` via SWR and exposes session state
    - _Requirements: 2.4, 4.4_
  - [~] 9.2 Create `src/components/Layout.tsx` with Material UI `AppBar` and mobile `BottomNavigation`
    - Render responsively down to 320px using MUI `Box`/`Container` with `sx` breakpoint props
    - _Requirements: 10.3, 10.4_
  - [~] 9.3 Create `src/app/page.tsx` (Login page) with `LoginForm` component
    - Username + password fields for Admin; username-only for User
    - On success redirect to `/dashboard` (user) or `/admin` (admin) based on role
    - Display error messages per error handling spec (401 → "Invalid credentials", 403 pending/rejected → appropriate messages)
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [~] 9.4 Create `src/app/register/page.tsx` with `RegisterForm` component
    - Full name + username fields; submit to `/api/users/register`
    - On success redirect to `/pending`; on 409 show "Username already taken"
    - _Requirements: 1.1, 1.2, 1.3_
  - [~] 9.5 Create `src/app/pending/page.tsx` — static holding screen shown after registration
    - _Requirements: 1.4_

- [ ] 10. Implement User dashboard
  - [~] 10.1 Create `src/app/dashboard/page.tsx` (User-only, redirect to login if unauthenticated)
    - Fetch events via SWR from `/api/events`
    - Render `EventList` with `EventCard` per event showing title, description, remaining capacity, attendee count
    - _Requirements: 7.1, 9.2_
  - [~] 10.2 Add "Join" button to `EventCard`
    - Disabled when event isFull or user already has a pending/confirmed request
    - On click POST to `/api/join-requests`; show success or error via MUI `Alert` snackbar
    - _Requirements: 7.2, 7.3, 7.4_
  - [~] 10.3 Create `MyRequestsPanel` component on dashboard showing current user's join requests and their statuses
    - _Requirements: 7.2_
  - [~] 10.4 Add attendee list display — clicking an event card expands/navigates to show confirmed attendees via `/api/events/[id]/attendees`
    - _Requirements: 9.1_

- [ ] 11. Implement Admin dashboard
  - [~] 11.1 Create `src/app/admin/page.tsx` (Admin-only) with overview and navigation to sub-sections
    - _Requirements: 2.2_
  - [~] 11.2 Create `src/app/admin/users/page.tsx` with `PendingUsersList`
    - Fetch pending users via SWR from `/api/users?status=pending`
    - Approve / Reject buttons call respective PATCH routes; optimistically update list
    - _Requirements: 3.1, 3.2, 3.3_
  - [~] 11.3 Create `src/app/admin/events/page.tsx` with `EventManager`
    - `EventTable` lists all events with title, description, capacity, attendeeCount
    - `EventForm` (modal/drawer) for create and edit; submits to POST / PATCH endpoints
    - Delete button calls DELETE endpoint with confirmation dialog
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3_
  - [~] 11.4 Create `src/app/admin/requests/page.tsx` with `JoinRequestsList`
    - Fetch pending requests via SWR from `/api/join-requests`
    - Confirm / Reject buttons call respective PATCH routes; list updates on mutation
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 12. Configure PWA manifest and service worker
  - [~] 12.1 Create `public/manifest.json` with name "Zevents", short_name, icons (192×192, 512×512), theme_color, background_color, display="standalone", start_url="/"
    - Link manifest in `src/app/layout.tsx`
    - _Requirements: 10.1_
  - [~] 12.2 Register service worker in `src/app/layout.tsx` client component
    - Create `public/sw.js` with cache-first strategy for static assets
    - Wire online/offline events to show a banner in Layout component
    - _Requirements: 10.2_

- [ ] 13. Wire MongoDB indexes and error handling
  - [~] 13.1 Create `src/lib/ensureIndexes.ts` that ensures `users.username` unique index and `join_requests.(userId, eventId)` compound unique index are created on startup; call from the MongoDB singleton initializer
    - _Requirements: 11.2_
  - [~] 13.2 Create `src/lib/dbError.ts` middleware helper that catches MongoDB connection errors and returns 503 `{ error: "Service unavailable" }`; apply to all API route handlers
    - _Requirements: 11.3_

- [~] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 7 and 14 ensure incremental validation
- Property tests validate the 9 universal correctness properties defined in the design
- Unit tests validate specific scenarios and edge cases
- All property tests use `fc.assert(fc.property(...), { numRuns: 100 })` minimum and are tagged with `// Feature: zevents, Property <N>: <property text>`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "4.1", "5.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "4.2", "5.2", "5.3"] },
    { "id": 2, "tasks": ["2.3", "3.2", "3.3", "4.3", "6.1"] },
    { "id": 3, "tasks": ["3.4", "4.4", "4.5", "6.2", "6.3", "9.1"] },
    { "id": 4, "tasks": ["4.6", "5.4", "6.4", "6.5", "6.6", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 5, "tasks": ["5.5", "8.1", "10.1", "11.1", "12.1", "13.1", "13.2"] },
    { "id": 6, "tasks": ["10.2", "10.3", "10.4", "11.2", "11.3", "11.4", "12.2"] }
  ]
}
```
