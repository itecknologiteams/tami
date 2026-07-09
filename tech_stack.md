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

- Package manager: pnpm workspaces.
- Language: TypeScript across backend, web, and React Native apps.
- Repository layout:
  - `apps/api` for the backend API.
  - `apps/admin` for the admin command center.
  - `apps/rider` for the rider mobile app.
  - `apps/driver` for the Android driver app.
  - `packages/shared` for shared domain types and validation schemas.
  - `packages/config` for shared linting, TypeScript, and formatting configuration.

### Backend

- Runtime: Node.js LTS.
- Framework: NestJS modular monolith.
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

- Framework: Next.js with React and TypeScript.
- UI styling: Tailwind CSS plus a small internal component system.
- State/data fetching: TanStack Query.
- Tables: TanStack Table.
- Charts: Recharts or another lightweight React charting library.
- Forms: React Hook Form with Zod validation.

### Rider App

- Framework: React Native with TypeScript.
- Navigation: React Navigation.
- State/data fetching: TanStack Query.
- Forms: React Hook Form with Zod validation.
- Native builds must support MapLibre React Native and production push notifications.

### Driver App

- Framework: React Native with TypeScript, Android target only.
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

- Mobile rider app: `@maplibre/maplibre-react-native`.
- Android driver app: `@maplibre/maplibre-react-native`.
- Admin command center: prefer a non-GL/static or server-rendered map approach for the first admin dashboard if possible; if rich live vector maps are required later, revisit this decision explicitly before introducing `maplibre-gl-js`.
- Map styles: use public/open map styles approved for Sindh operations.
- Location storage: store coordinates with PostgreSQL/PostGIS.
- Route calculation/navigation provider: to be selected separately because MapLibre renders maps but does not by itself provide full routing.

Note: MapLibre React Native renders through MapLibre Native and uses components such as `Map`, `Camera`, and `UserLocation`. It accepts a `mapStyle` URL or style JSON. This is different from choosing `maplibre-gl-js` as a web dependency.

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

