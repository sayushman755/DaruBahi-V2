# DaruBahi Auth Testing

Phone + Password authentication (JWT bearer, no OTP, no Twilio).

## Endpoints
Base URL from `EXPO_PUBLIC_BACKEND_URL` (frontend) or backend preview URL.

- `POST /api/auth/register` — body: `{"phone":"9876543210","password":"secret123"}`
  → `{ token, is_new_user, user }` (user is null until shop setup done)
- `POST /api/auth/login` — body: `{"phone":"9876543210","password":"secret123"}`
  → `{ token, is_new_user, user }`
- `POST /api/auth/setup-shop` (Bearer token) — body: `{shop_name, owner_name, shop_type, address?, license_number?}`
- `GET /api/auth/me` (Bearer token) — returns user if shop is set up; 404 otherwise

## Phone normalization
- 10-digit Indian numbers → `+91XXXXXXXXXX`
- Numbers already starting with `+` are kept as-is

## Password rules
- Minimum 6 characters
- Hashed with bcrypt

## Test credentials
See `/app/memory/test_credentials.md`.

## Manual smoke test
```bash
API="$EXPO_PUBLIC_BACKEND_URL"   # or the preview URL

# 1. Register
curl -X POST "$API/api/auth/register" -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"test1234"}'

# 2. Login
TOKEN=$(curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"test1234"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 3. Setup shop
curl -X POST "$API/api/auth/setup-shop" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"shop_name":"Test Wines","owner_name":"Ramesh","shop_type":"Composite (FL + BB)"}'

# 4. Me
curl "$API/api/auth/me" -H "Authorization: Bearer $TOKEN"
```

## Frontend flow
- `/login` — tabs for Sign in / Sign up (`data-testid`s: `tab-login`, `tab-signup`, `phone-input`, `password-input`, `confirm-password-input`, `login-button`, `signup-button`, `mode-switch`, `toggle-password`)
- After successful register/login:
  - `is_new_user === true` → `/setup`
  - else → `/(tabs)` dashboard
