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

## Rider Development Login

The current rider login flow is development-only. It returns a six-digit code from `POST /auth/rider/otp`, then exchanges the code and a selected city ID at `POST /auth/rider/verify` for a Tami bearer token. Do not expose this code-returning flow in a public deployment; replace it with a real OTP provider before launch.

The rider app reads its API URL from `TAMI_API_BASE_URL`. The Android emulator default is `http://10.0.2.2:4000`; provide an appropriate value for iOS simulators and physical devices:

```bash
cd apps/mobile
flutter run --target lib/main_rider.dart --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000
```

Place search and reverse geocoding run through the API. Development uses the bounded Sindh landmark fallback when no MapTiler key is present. Production must provide server-side provider settings:

```bash
TAMI_MAPTILER_API_KEY=<server-secret> \
TAMI_ROUTING_BASE_URL=https://routing.example.gov.pk \
pnpm --filter @tami/api dev
```

`TAMI_MAPTILER_API_KEY` must never be passed as a Flutter `dart-define`. Native builds receive only the approved restricted public style URL:

```bash
flutter build apk --target lib/main_rider.dart \
  --dart-define=TAMI_MAP_STYLE_URL='https://api.maptiler.com/maps/streets-v2/style.json?key=<restricted-public-key>'
```

For the browser development preview, build with the same API override and serve the generated files:

```bash
cd apps/mobile
flutter build web --target lib/main_rider.dart --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000
python3 -m http.server 4174 --directory build/web
```

The web preview uses a non-GL static map fallback. Android and iOS use MapLibre through Flutter; provide the approved style endpoint with `TAMI_MAP_STYLE_URL` for native map builds.

MapLibre iOS uses Swift Package Manager and requires iOS 13 or newer. The project enables SwiftPM in `pubspec.yaml` and pins the upstream `package_info_plus` iOS 13 manifest correction until that fix is published. Build workspaces outside macOS-synchronized File Provider folders; otherwise generated frameworks can inherit metadata that Apple codesign rejects.

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
cd apps/mobile && flutter build ios --target lib/main_rider.dart --no-codesign
cd apps/mobile && flutter build apk --target lib/main_driver.dart
```

Android builds require API 36, Build Tools 36.0.0, NDK `28.2.13676358`, and JDK 17. The rider app targets Android and iOS 13+. The driver app targets Android infotainment devices.
