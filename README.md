# Tami Hailing

Government mobility platform for a multi-city electric taxi service across Sindh.

## Current Development Slice

This repository starts with the foundation for:

- Rider mobile app
- Driver Android infotainment app
- Admin command center
- Backend API
- Shared ride state and map domain logic

## Setup

```bash
pnpm install
```

## Common Commands

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

## Backend Data Spine

The backend uses Prisma `6.19.2` with PostgreSQL/PostGIS as the target database.

```bash
docker compose up -d postgres
cd apps/api
cp .env.example .env
pnpm prisma:migrate:deploy
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:seed
```

`docker compose ps` shows the local PostGIS service health. The seeded database includes the first five Sindh launch cities and the initial ride categories.

Create a migration for a deliberate schema change with `pnpm prisma:migrate:dev -- --name <change-name>`.

Run the database integration test against the local service with:

```bash
DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" RUN_DATABASE_TESTS=true pnpm --filter @tami/api test:integration
```

The first Prisma schema defines cities, zones, ride categories, riders, drivers, vehicles, rides, ride state transition audit records, and payment records.

For local validation without a running database:

```bash
DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" pnpm --filter @tami/api prisma:validate
```

## Stack Guardrails

Read `tech_stack.md` before adding new frameworks, map libraries, payment providers, or backend services.

## Product Design

The approved platform design is in `docs/superpowers/specs/2026-07-09-tami-hailing-government-mobility-design.md`.

## First Implementation Plan

The first implementation plan is in `docs/superpowers/plans/2026-07-09-tami-foundation-core-mvp-implementation-plan.md`.

## Mobile Direction

Mobile apps are planned in Flutter/Dart from one shared codebase. The Flutter migration plan is in `docs/superpowers/plans/2026-07-09-tami-mobile-flutter-migration-plan.md`.

## Mobile Commands

```bash
cd apps/mobile && flutter pub get
cd apps/mobile && flutter test
cd apps/mobile && flutter analyze
```

From the repository root:

```bash
pnpm mobile:test
pnpm mobile:analyze
```

Build entry points:

```bash
cd apps/mobile && flutter build apk --target lib/main_rider.dart
cd apps/mobile && flutter build ios --target lib/main_rider.dart
cd apps/mobile && flutter build apk --target lib/main_driver.dart
```

The rider app targets Android and iOS. The driver app targets Android infotainment devices.
