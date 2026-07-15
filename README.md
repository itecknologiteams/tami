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

Run the one-shot setup script to install dependencies, start Postgres and Nominatim, run migrations, seed launch data, and prepare the Flutter app:

```bash
./scripts/setup.sh
```

It's safe to re-run at any time. Requires Node 22+, Docker, and (optionally) Flutter. Or set up manually:

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

## Rider Login

`POST /auth/rider/otp` sends a six-digit code by SMS (via the configured
`SmsProvider`) and returns a `challengeId`; `POST /auth/rider/verify`
exchanges the code and a selected city ID for a Tami bearer token. Outside
production, the response also includes `developmentCode` so the code can be
read directly without a live SMS account — this field is omitted in
production. Configure `TAMI_TWILIO_ACCOUNT_SID`, `TAMI_TWILIO_AUTH_TOKEN`,
and `TAMI_TWILIO_FROM_NUMBER` for real SMS delivery; the API refuses to
boot in production without them. OTP requests are rate-limited to 3 per
phone number and 10 per IP address per 10 minutes.

The rider app reads its API URL from `TAMI_API_BASE_URL`. The Android emulator default is `http://10.0.2.2:4000`; provide an appropriate value for iOS simulators and physical devices:

```bash
cd apps/mobile
flutter run --target lib/main_rider.dart --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000
```

Place search and reverse geocoding run through the API. The production provider is a self-hosted Nominatim instance loaded with the Geofabrik Pakistan extract; `docker compose up -d nominatim` runs it locally on `http://127.0.0.1:8090` (the first start downloads and imports the extract, which takes a while — `docker compose logs -f nominatim` shows progress and `curl http://127.0.0.1:8090/status` reports `OK` once ready). Development falls back to the bounded Sindh landmark list when no provider is configured. Production must provide server-side provider settings:

```bash
TAMI_NOMINATIM_BASE_URL=http://127.0.0.1:8090 \
TAMI_ROUTING_BASE_URL=https://routing.example.gov.pk \
pnpm --filter @tami/api dev
```

`TAMI_MAPTILER_API_KEY` remains supported as an optional alternative geocoder when `TAMI_NOMINATIM_BASE_URL` is unset. Server-side keys must never be passed as a Flutter `dart-define`. Native builds receive only the approved restricted public style URL:

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

## Production Deployment

The API ships as a Docker image built from [apps/api/Dockerfile](apps/api/Dockerfile) (build context is the repository root). The image runs `prisma migrate deploy` before starting the server, so a fresh database is migrated automatically; run `pnpm --filter @tami/api prisma:seed` once against the production `DATABASE_URL` to load launch cities and ride categories.

`docker-compose.prod.yml` runs the full backend stack — PostGIS, self-hosted Nominatim (Pakistan extract), and the API:

```bash
cp .env.production.example .env   # then fill in real secrets
docker compose -f docker-compose.prod.yml up -d --build
```

The API refuses to boot in production without `TAMI_NOMINATIM_BASE_URL`, `TAMI_ROUTING_BASE_URL`, `TAMI_REDIS_URL`, `TAMI_TWILIO_ACCOUNT_SID`, `TAMI_TWILIO_AUTH_TOKEN`, and `TAMI_TWILIO_FROM_NUMBER`. Nominatim's first start imports the Pakistan OSM extract (roughly 30–60 minutes); the API container waits for the Nominatim healthcheck before starting. Set `TAMI_CORS_ORIGINS` to the comma-separated admin/web origins allowed to call the API; leave it empty only for development.

Set `TAMI_TRUST_PROXY` to the number of reverse proxy hops in front of the API (e.g. `1` for a single load balancer/ingress — `docker-compose.prod.yml` defaults it to `1`). Without this, Express's `req.ip` resolves to the proxy's address instead of the real client's, which collapses the per-IP OTP/verify rate limit into one shared bucket across all users instead of limiting each client independently.

Before promoting a build, run the full gate locally:

```bash
pnpm typecheck && pnpm test && pnpm build
RUN_DATABASE_TESTS=true pnpm --filter @tami/api test:integration
```

Rider and driver OTP delivery share the same `SmsProvider` and rate limiter — see the Rider Login section above for the required Twilio configuration and rate limits. The driver flow (`POST /auth/driver/otp` / `verify`) uses the same mechanism.

## Driver Ride Loop

Drivers sign in with the same phone/OTP/city flow (`/auth/driver/*`) (see Rider Login above for the SMS/rate-limiting configuration, which the driver flow shares) and manage duty through `POST /driver/availability`. Dispatch is pull-based: `GET /driver/rides/current` returns the driver's active ride, or atomically claims the oldest waiting ride in their city (`requested → matching → offered_to_driver`). Offers are accepted (`POST /driver/rides/:id/accept`), declined back into the matching pool, or advanced through pickup and trip states to `complete`, which stamps the final fare and marks the cash payment record paid. Every transition is validated by the shared ride state machine and audited in `RideStateTransition`.

While on duty the app streams `POST /driver/location` pings, renders the ride's road route from `GET /driver/rides/:id/route` on the MapLibre surface, and chats with the rider through `/driver/rides/:id/chat`. The Earnings tab reads `GET /driver/earnings` (today and last-7-days totals) and `GET /driver/rides/history`; the shell has Duty, Earnings, and Account tabs in the same liquid-glass design language as the rider app. Run the driver app with:

```bash
cd apps/mobile
flutter run --target lib/main_driver.dart --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000
```

## Admin Command Center

`GET /admin/overview` (guarded by the `x-admin-token` header matching `TAMI_ADMIN_TOKEN`, development default `dev-admin-token`) aggregates ride counts by state, online drivers, and recent rides. The Next.js admin app proxies it server-side — set `TAMI_API_BASE_URL` and `TAMI_ADMIN_TOKEN` in its environment — and renders a live-polling dashboard:

```bash
pnpm --filter @tami/admin dev
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
