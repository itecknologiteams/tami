# Tami Hailing Tech Stack

Date: 2026-07-09
Status: Project standard

This document is the technical guardrail for Tami Hailing. Any major deviation should be discussed and recorded here before implementation changes direction.

## Product Surfaces

- Rider app: Android and iOS mobile app.
- Driver app: Android-only app for the in-dash infotainment system.
- Admin command center: Web app for the central Sindh operations team.
- Backend platform: API-first modular backend for rides, dispatch, pricing, payments, chat, reporting, and administration.

## Primary Stack

### Monorepo

- Package manager: pnpm workspaces, pinned in `package.json` as `pnpm@10.32.0`.
- Languages:
  - TypeScript for backend, admin web, and shared server/web domain packages.
  - Dart for mobile apps.
- TypeScript: `5.9.3`.
- Repository layout:
  - `apps/api` for the backend API.
  - `apps/admin` for the admin command center.
  - `apps/mobile` for the Flutter rider and driver mobile apps.
  - `packages/shared` for shared domain types and validation schemas.
  - `packages/config` for shared linting, TypeScript, and formatting configuration.

### Backend

- Runtime: Node.js LTS.
- Framework: NestJS modular monolith, currently pinned to NestJS `11.1.6`.
- Database: PostgreSQL with PostGIS.
- ORM: Prisma `6.19.2`.
- Cache and queues: Redis.
- Real-time transport: WebSockets through the backend, using authenticated channels.
- Validation: Zod for shared request/domain validation where practical.
- Authentication:
  - OTP-based rider login.
  - Driver login with centrally issued credentials.
  - Admin login with role-based access control.
- File storage: S3-compatible object storage for profile photos and documents.

### Admin Command Center

- Framework: Next.js `16.2.10` with React `19.2.7` and TypeScript.
- UI styling: Tailwind CSS plus a small internal component system.
- State/data fetching: TanStack Query.
- Tables: TanStack Table.
- Charts: Recharts or another lightweight React charting library.
- Forms: React Hook Form with Zod validation.

### Mobile Apps

- Framework: Flutter `3.41.3` with Dart `3.11.1`.
- Structure: one Flutter project at `apps/mobile`.
- App variants:
  - Rider app: Android and iOS.
  - Driver app: Android-only build for the in-dash infotainment system.
- Entry points:
  - `lib/main_rider.dart`
  - `lib/main_driver.dart`
- Shared code:
  - API client
  - authentication/session handling
  - ride state models
  - map/location widgets
  - chat client
  - theme primitives
  - localization
- Separate code:
  - rider booking workflow
  - driver ride-offer workflow
  - driver in-dash UX
- State management: explicit immutable models, injected clients, and local widget state for the current rider slice. Introduce Riverpod only when shared live trip state requires cross-screen ownership.
- Routing: Flutter Navigator and typed feature screens for the current flow. Reassess `go_router` before deep links and production notification routing.
- Native builds must support MapLibre maps, production push notifications, location permissions, and Android driver-device deployment.
- iOS deployment target: iOS 13+ with Flutter Swift Package Manager integration enabled in `pubspec.yaml`.
- Temporary compatibility pin: `package_info_plus` is locked to upstream commit `bf04cdf66598dc3fca274b8b1db2b92b0bf6b73e`, which aligns its SwiftPM manifest with Flutter 3.41's iOS 13 framework. Remove the override after an equivalent pub.dev release is verified.

### Driver App UX

- The driver app is a Flutter Android target optimized for the infotainment screen.
- UI must be optimized for in-dash use:
  - large touch targets
  - clear ride state controls
  - minimal typing
  - safe color contrast
  - low-distraction screens
- Navigation handoff can open the approved map/navigation provider from the driver device.

## Maps and Location

Project requirement from product owner:

- Use MapLibre-based public maps.
- Use the non-`maplibre-gl-js` approach for this app.
- Do not choose the web GL JS package as the default map implementation unless this document is explicitly updated later.

Current implementation direction:

- Mobile rider app: `maplibre` Flutter package.
- Android driver app: same `maplibre` Flutter package as the rider app.
- Mobile MapLibre package version: `maplibre@0.3.5`.
- Device location package: `geolocator@14.0.3`.
- Do not use the old React Native MapLibre package path for new mobile work.
- Requested style family: `streets-v2`.
- Native map style URL: configure `TAMI_MAP_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json?key=<restricted-public-key>` before a production mobile build. `streets-v2` is an explicit product compatibility requirement even though MapTiler now documents newer Streets revisions.
- Browser preview: a non-GL Flutter-painted fallback is intentionally used for development previews; it does not load `maplibre-gl-js`.
- Admin command center: prefer a non-GL/static or server-rendered map approach for the first admin dashboard if possible; if rich live vector maps are required later, revisit this decision explicitly before introducing `maplibre-gl-js`.
- Map styles: use public/open map styles approved for Sindh operations.
- Location storage: store coordinates with PostgreSQL/PostGIS.
- Place search and reverse geocoding: MapTiler Search API through the NestJS backend. Keep `TAMI_MAPTILER_API_KEY` server-side and use rider-city bounding boxes, Pakistan country filtering, request timeouts, and bounded result counts.
- Route calculation: OSRM HTTP route API v1 through a replaceable NestJS `RoutingProvider`. Configure `TAMI_ROUTING_BASE_URL` to an operated or contracted OSRM-compatible service in production; the public OSRM demo endpoint is development-only.
- Route consistency: the OSRM distance, duration, and GeoJSON geometry returned by one backend route calculation feed both authoritative pricing and the route drawn by Flutter.
- Driver search and dispatch matching: evaluate Uber H3 when the dispatch module begins. It is not introduced in booking or identity flows.

Note: Flutter is now the mobile standard. Any existing React Native mobile scaffold is transitional and should be replaced by `apps/mobile` before real rider or driver feature work continues.

## Payments

Launch methods:

- Cash.
- JazzCash.
- Easypaisa.
- NayaPay.

Payment integrations should be wrapped behind internal provider interfaces so the platform can add or replace wallets without changing ride logic.

## Real-Time Requirements

Real-time features:

- Ride status updates.
- Dispatch offers.
- Driver/rider location updates.
- Accepted-ride chat.
- Admin live map events.
- Incident and emergency alerts.

The database remains the source of truth. Real-time events must not be the only record of critical ride, payment, or audit data.

## Testing Standard

- Shared domain logic: unit tests.
- Backend modules: unit and integration tests.
- API contracts: request/response validation tests.
- Admin app: component and workflow tests for critical flows.
- Mobile apps: unit tests for domain/client logic and manual device verification for map/location/navigation flows.
- Ride state machine: explicit transition tests are required before implementation is considered complete.

## Non-Negotiable Domain Constraints

- Multi-city Sindh support from day one.
- Central operations team for first launch.
- Strict ride state machine.
- Driver/rider chat after ride acceptance.
- Dynamic pricing with admin caps and audit logs.
- Cash and wallet payment reconciliation.
- Configurable contracted-driver payout model.
- Full audit trail for sensitive operational actions.
