# Tami Driver Ride Loop and Admin Overview Plan (2026-07-13)

## Goal

Close the platform loop so the whole app works end to end: a rider books, a driver
receives and completes the ride, and the command center shows live operations.

## Current gaps

- No driver-facing API: rides can be created but never leave `requested`.
- Driver mobile app is a placeholder screen.
- Admin command center is a static page.

## Design

### Driver identity (API)

- Mirror the rider development OTP flow: `POST /auth/driver/otp`,
  `POST /auth/driver/verify` (challengeId, code, cityId) returning a bearer token.
- New `DriverSession` table mirroring `RiderSession`; drivers are created on first
  verify (same development-only caveat as riders).
- `DriverAuthGuard` + `CurrentDriver` decorator mirroring the rider guard.

### Presence and dispatch (API)

- `Driver` gains `online`, `lastOnlineAt`, `latitude`, `longitude`.
- `POST /driver/availability` toggles online state and updates location.
- Pull-based dispatch, no background jobs: `GET /driver/rides/current` returns the
  driver's offered/active ride if any; otherwise it atomically claims the oldest
  unassigned `requested`/`matching` ride in the driver's city and transitions it
  `requested → matching → offered_to_driver` with the driver assigned.
- `POST /driver/rides/:id/accept` → `accepted`.
- `POST /driver/rides/:id/decline` → `driver_timeout → matching` and unassigns.
- `POST /driver/rides/:id/transition` advances driver-progress states
  (`driver_en_route_to_pickup`, `arrived_at_pickup`, `rider_onboarded`,
  `in_progress`, `arrived_at_destination`); completing a cash ride runs
  `arrived_at_destination → payment_pending → completed` and stamps the final fare
  from the estimate.
- Driver chat endpoints reuse `RideChatService` with `senderType: "driver"`.
- All transitions go through the shared ride state machine and are audited in
  `RideStateTransition`.

### Admin overview

- `GET /admin/overview`: ride counts by state, online driver count, recent rides.
- Guarded by `x-admin-token` matching `TAMI_ADMIN_TOKEN` (required in production,
  development default `dev-admin-token`).
- Next.js admin page polls a same-origin route handler that proxies to the API with
  the server-side token, rendering KPI tiles and a live rides table.

### Driver mobile app (Flutter)

- Driver login reusing the rider phone/OTP/city flow against the driver endpoints.
- Driver home: online toggle, current ride card polled every few seconds, and a
  single primary action that advances the ride through its states, with decline on
  offers and fare display on completion.

## Verification

- Unit specs for driver auth, dispatch claim, ride actions, and admin overview
  (in-memory repositories, following existing patterns).
- Flutter widget tests for the driver home flow.
- Live end-to-end: rider books via API, driver accepts and completes via API,
  admin overview reflects each stage.
- Full gates: `pnpm typecheck && pnpm test && pnpm build`, flutter analyze/test,
  `RUN_DATABASE_TESTS=true` integration suite.
