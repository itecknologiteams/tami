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
- ORM: Prisma.
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

- Framework: Flutter with Dart.
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
- State management: Riverpod or Bloc, to be finalized before mobile implementation starts.
- Routing: go_router or Flutter Navigator 2.0, to be finalized before mobile implementation starts.
- Native builds must support MapLibre maps, production push notifications, location permissions, and Android driver-device deployment.

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

- Mobile rider app: Flutter MapLibre package, final package to be chosen before implementation.
- Android driver app: same Flutter MapLibre package as the rider app.
- Do not use the old React Native MapLibre package path for new mobile work.
- Requested style family: `streets-v2`.
- Admin command center: prefer a non-GL/static or server-rendered map approach for the first admin dashboard if possible; if rich live vector maps are required later, revisit this decision explicitly before introducing `maplibre-gl-js`.
- Map styles: use public/open map styles approved for Sindh operations.
- Location storage: store coordinates with PostgreSQL/PostGIS.
- Route calculation/navigation provider: to be selected separately because MapLibre renders maps but does not by itself provide full routing.

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
