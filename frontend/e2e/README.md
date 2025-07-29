# E2E tests (Playwright)

Phase 1 (infra, fixtures, auth + smoke-navigation) and Phase 2 (posts browse/
filter/pagination/map-toggle, create/edit/delete across all 4 post types,
post-detail owner actions) are built. Donations and messaging/notifications/
profile (Phases 3-4) are not built yet.

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
- **Province/ward lookups are mocked, other external calls aren't.** Any spec
  that drives the create/edit post forms' Khu vực dropdowns calls
  `mockRegionApi(page)` (`e2e/helpers/mockRegionApi.ts`) first, which stubs
  provinces.open-api.vn with a small fixed dataset — real calls to it were the
  slowest and flakiest part of the create flow. Reverse geocoding (Nominatim)
  and Leaflet map tiles are still real network calls; Phase 2 doesn't exercise
  the map-pin/reverse-geocode path, only the plain map-view toggle.
- **Posts accumulate in the E2E DB across runs** (same underlying reason as
  the uploads point above — no seed/reset script exists yet). Phase 2's browse
  tests (`posts-browse.spec.ts`) never assert on the *total* number of posts
  in a list for this reason — every assertion scopes down to a per-test-run
  unique title/suffix via the list page's own search box first. If this
  instance has been used a lot, it may have accumulated hundreds of leftover
  posts; that's harmless (isolated from your dev data) but you can reset it
  any time with `docker compose down -v postgres-e2e && docker compose up -d
  postgres-e2e` (drops and recreates the volume) followed by restarting the
  isolated backend so `synchronize: true` recreates the schema.
- **Running the full suite at once can occasionally need its built-in retry.**
  The isolated stack is a single dev-mode Next.js + NestJS instance (see
  `playwright.config.ts`), not built for unlimited concurrent load — under the
  default local worker count, a client-side timer (e.g. the post-list search
  debounce) can occasionally get starved of CPU time long enough that a single
  assertion needs its retry. This reproduces less depending on machine load;
  running a single spec file in isolation is reliably fast and stable. This is
  a capacity characteristic of the local stack, not a flaky test — if you hit
  it during development, re-run rather than chase it with longer timeouts.

## Layout

```
playwright.config.ts       # baseURL, projects, timeouts
e2e/
  fixtures.ts               # `user` (API-registered throwaway user),
                             # `authedPage` (localStorage pre-seeded), and
                             # `registerAndLogin`/`seedAuthedSession` helpers
                             # for tests that need a *second* logged-in user
  helpers/
    random.ts                # unique email/name generators
    api.ts                   # `createPost` — seeds a post via the backend
                              # REST API directly, bypassing the create form,
                              # for tests whose focus is detail/edit/delete/
                              # browse rather than the create flow itself
    mockRegionApi.ts          # stubs provinces.open-api.vn with a fixed
                              # dataset for any test driving the Khu vực
                              # province/ward dropdowns
  specs/
    smoke-nav.spec.ts        # public pages render; protected pages redirect
    auth.spec.ts             # register/login/logout, forgot/reset-password
    posts-create.spec.ts     # create flow via the real form for all 4 post
                             # types (LOST/ADOPTION/SUPPLY/TRADE)
    posts-manage.spec.ts     # owner edit/status-change/delete, per-pet
                             # adoption status, non-owner "message author" view
    posts-browse.spec.ts     # list search, status/species filter chips,
                             # pagination, map-view toggle
```

## Adding future phases

Reuse `e2e/fixtures.ts`'s `user`/`authedPage` fixtures, and `e2e/helpers/api.ts`
for seeding data via direct REST calls rather than driving a create-form UI
every time a test just needs *existing* data to work with. Follow the same
pattern for donations (e.g. `createCampaign` in `helpers/api.ts`) and
messaging (two browser contexts + `registerAndLogin`/`seedAuthedSession` from
`fixtures.ts`, as `posts-manage.spec.ts`'s non-owner test already does).
