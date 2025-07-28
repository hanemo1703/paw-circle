# E2E tests (Playwright)

Phase 1 of the E2E suite: infrastructure, fixtures, and an auth + smoke-navigation
suite. Later phases (posts CRUD per type, donations, messaging/notifications/profile)
are not built yet.

## Why a separate stack

These tests register real users, create real data, and log in through the real
UI. To keep that from touching your normal dev database, the suite runs against
an **isolated copy of the stack** — a second Postgres container, backend
instance, and frontend instance, on different ports from your usual
`docker compose up` / `yarn start:dev` / `yarn dev`. Your normal dev stack can
keep running unaffected the whole time.

## One-time setup

```bash
cd frontend
yarn install
npx playwright install chromium
```

## Running the suite

Open three terminals (in addition to whatever your normal dev stack is doing):

**Terminal 1 — isolated Postgres** (from the repo root):
```bash
docker compose up -d postgres-e2e
```

**Terminal 2 — isolated backend** (PowerShell, from `backend/`):
```powershell
$env:DB_PORT="5438"; $env:PORT="3002"; yarn start:dev
```
(bash equivalent: `DB_PORT=5438 PORT=3002 yarn start:dev`)

**Terminal 3 — isolated frontend** (PowerShell, from `frontend/`):
```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:3002/api"; $env:PORT="3010"; yarn dev
```
(bash equivalent: `NEXT_PUBLIC_API_URL=http://localhost:3002/api PORT=3010 yarn dev`)

These env var overrides take precedence over `backend/.env` / `frontend/.env`
(dotenv doesn't clobber variables already set in the shell), so no extra `.env`
files are needed, and your real `.env` files are untouched.

**Then run the tests** (from `frontend/`):
```bash
yarn test:e2e          # headless
yarn test:e2e:headed   # see the browser
yarn test:e2e:ui       # interactive UI mode
```

If `E2E_BASE_URL` / `E2E_API_URL` env vars aren't set, the config/fixtures
default to `http://localhost:3010` and `http://localhost:3002/api`
respectively, matching the ports above.

## Known gaps

- **Password-reset happy path isn't automated.** The reset link/token is only
  logged server-side (`backend/src/auth/auth.service.ts`), never emailed or
  returned via the API, so there's no way for a test to obtain a real token.
  `auth.spec.ts` covers the surrounding validation (invalid/missing token,
  mismatched passwords, generic forgot-password success message) but not the
  full reset round-trip. Fixing this would mean adding a test-only backend
  endpoint — a product decision, not something this suite works around.
- **Uploaded files accumulate.** Avatar/post/campaign images uploaded during
  test runs are written to disk under the E2E backend's own `backend/uploads/`
  (no cleanup mechanism exists for this today). Harmless since it's isolated
  from your dev stack's uploads, but it will grow the longer you run the
  suite repeatedly — feel free to `rm -rf backend/uploads/*` on that instance
  if it gets large.
- **External network calls aren't mocked** (province/ward lookups via
  provinces.open-api.vn, reverse geocoding via Nominatim, Leaflet map tiles).
  Phase 1 doesn't exercise any of these (no post-creation flow yet), but
  Phase 2 will need to budget for their latency/flakiness.

## Layout

```
playwright.config.ts       # baseURL, projects, timeouts
e2e/
  fixtures.ts               # `user` (API-registered throwaway user) and
                             # `authedPage` (localStorage pre-seeded) fixtures
  helpers/random.ts          # unique email/name generators
  specs/
    smoke-nav.spec.ts        # public pages render; protected pages redirect
    auth.spec.ts             # register/login/logout, forgot/reset-password
```

## Adding future phases

Reuse `e2e/fixtures.ts`'s `user`/`authedPage` fixtures. For flows that need
existing data (a post, a campaign) rather than driving the create-form UI
every time, add thin REST wrappers to a new `e2e/helpers/api.ts` (e.g.
`createPost`, `createCampaign`) that call the backend directly with the
fixture's `accessToken`, the same way `fixtures.ts` calls `/auth/register` and
`/auth/login`.
