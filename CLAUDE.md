# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

PetConnect (package name `pawcircle-frontend` on the frontend) is a community platform for cat/dog owners: lost & found pet reports, adoption listings, a pet-supplies marketplace, and medical fundraising campaigns. UI text and validation/error messages are in Vietnamese; code identifiers and comments are in English.

## Architecture

- **Frontend**: Next.js 14 using the **Pages Router** (`frontend/src/pages/`, not `app/` — ignore any references to "App Router" elsewhere). SCSS Modules per page/component (`*.module.scss`), shared variables in `frontend/src/styles/_variables.scss`.
- **Backend**: NestJS + TypeORM, one module per domain area under `backend/src/`.
- **Database**: PostgreSQL, run via `docker-compose.yml` (container `petconnect-postgres`, exposed on host port **5437** → container 5432). Backend `.env` connects on port 5432 by default (`DB_PORT`), so when running the dockerized Postgres directly (outside another compose network) update `DB_PORT` to 5437 or adjust the compose port mapping.

### Backend module layout (`backend/src/`)
- `auth` — register/login, JWT issuance and validation (`JwtStrategy`, `JwtAuthGuard`).
- `users` — user/organization profiles.
- `pets` — pet profiles.
- `posts` — **one shared `Post` entity** for all four listing kinds, discriminated by `type: LOST | FOUND | ADOPTION | MARKETPLACE` (see `posts/entities/post.entity.ts`). Filter by type via `GET /api/posts?type=...`. Don't create separate entities/tables per listing kind — extend the shared entity and its `PostType`/`PostStatus` enums instead.
- `donations` — fundraising campaigns and donations. `DonationsService.donate()` wraps donation creation + campaign balance increment in a single `DataSource.transaction` — preserve that atomicity if you touch this flow.
- `messages` — user-to-user messaging.

Auth pattern: protected routes use `@UseGuards(JwtAuthGuard)` and read the authenticated user via `@Req() req` → `req.user.userId` / `req.user.email` (populated by `JwtStrategy.validate`, see `backend/src/auth/jwt.strategy.ts`).

TypeORM entity list is registered by hand in two places that must stay in sync: `backend/src/app.module.ts` (`entities: [...]` for the app) and `backend/src/database/data-source.ts` (CLI data source used for migrations). Adding a new entity requires updating both.

`synchronize: true` is enabled in `app.module.ts` for local dev, so schema changes from entity edits apply automatically on backend restart — no migration needed while developing locally. Before production, disable `synchronize` and use migrations instead (see Commands below).

### Frontend
- `frontend/src/lib/api.ts` — thin fetch wrapper (`api.get`/`api.post`) targeting `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api`); throws using the backend's Vietnamese `message` field on non-OK responses.
- `frontend/src/components/` — shared layout pieces (`Header`, `Footer`) and `PostList` (renders posts across the LOST/FOUND/ADOPTION/MARKETPLACE pages).
- Routes: `/`, `/lost-found`, `/adoption`, `/marketplace`, `/donations`, `/login`, `/register`.

## Commands

### Database (first-time / whenever Postgres is needed)
```bash
docker compose up -d
```

### Backend (`backend/`)
```bash
cp .env.example .env      # first time only
yarn install
yarn start:dev            # http://localhost:3001/api, watch mode
yarn build                # nest build
yarn start:prod           # run compiled dist/main.js
```
Migrations (only needed once `synchronize` is off, e.g. for production):
```bash
yarn migration:generate src/database/migrations/<Name>
yarn migration:run
yarn migration:revert
```
There is no configured lint or test script in `backend/package.json`.

### Frontend (`frontend/`)
```bash
cp .env.example .env      # first time only
yarn install
yarn dev                  # http://localhost:3000
yarn build
yarn start
yarn lint                 # next lint
```
There is no configured test script in `frontend/package.json`.

## Conventions
- Code comments are always in English; user-facing UI text stays in Vietnamese (matches existing DTO validation messages and thrown exceptions like `NotFoundException('Không tìm thấy chiến dịch')`).
- Package manager is **Yarn** (yarn.lock present in both `backend/` and `frontend/`) — don't introduce npm/pnpm lockfiles.
