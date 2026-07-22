# DaruBahi — PRD

## Original problem statement
> Build a mobile app: fix only the login and signup of this mobile application.

User reported that OTP was never actually sent (Twilio not configured), the app just showed a "dev OTP" on screen. User asked to "do whatever is good".

## Decision
Replaced phone-OTP auth with **phone + password** JWT auth (bearer tokens stored in expo-secure-store on native, AsyncStorage on web). No Twilio / SMS dependency.

## Architecture
- Backend: FastAPI + MongoDB (motor). bcrypt for hashing, PyJWT for tokens (60d expiry).
- Frontend: React Native + Expo Router (TypeScript). Metro dev server on port 3000.
- Auth endpoints (all under `/api`):
  - `POST /auth/register` `{phone, password}` → `{token, is_new_user, user}`
  - `POST /auth/login` `{phone, password}` → `{token, is_new_user, user}`
  - `POST /auth/setup-shop` (Bearer) → user with shop fields
  - `GET /auth/me` (Bearer) → user (404 until shop set up)
- Phone normalization: 10-digit Indian → `+91XXXXXXXXXX`.

## What's implemented (Jan 2026)
- [x] Phone+password signup with bcrypt hashing (min 6 chars)
- [x] Phone+password login with clear error messages
- [x] JWT bearer token flow; token persisted via expo-secure-store / AsyncStorage
- [x] Single login screen with Sign in / Sign up tabs, show/hide password, mode switch link
- [x] Automatic routing: new user → /setup, existing → /(tabs) dashboard
- [x] Shop setup flow untouched (still works)
- [x] Removed all OTP + Twilio code paths
- [x] Backend .env + frontend .env created; USE_MEMORY_DB=0 (real Mongo)
- [x] 14/14 backend pytest + Playwright E2E pass (auth only)

## Not touched (out of scope for this task)
- Products / sales / stock entries / reports / dashboard (existing)
- Password reset, email verification, OAuth
- Admin panel, brute-force protection, rate limiting

## Prioritized backlog
- P1: Add "Forgot password" (SMS or security question) once SMS provider is chosen
- P2: Rate-limit `/auth/login` (currently unlimited)
- P2: Tighten CORS `allow_origins` from `*` to explicit preview + prod URLs
- P3: Shorten JWT TTL + add refresh token rotation
- P3: Migrate remaining OTP test file references / add products+sales regression suite

## Test credentials
See `/app/memory/test_credentials.md`.
