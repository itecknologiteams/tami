# Tami Uber/Careem/Bolt Parity Implementation Plan (2026-07-14)

## Origin

Follows the gap analysis performed against Uber, Careem, and Bolt's standard
feature set (rider app, driver app, backend platform — verified by reading
actual source, not filenames). Full findings:
`https://claude.ai/code/artifact/49d875a2-82a6-421c-9c4e-ba92e18fa534`

## Goal

Close the highest-impact functional gaps identified, in dependency order, so
that a second gap analysis at the end shows materially fewer Missing/Partial
items — especially in the areas that block the "feels like a real ride-hailing
app" experience: live tracking, proximity matching, driver identity, ratings,
safety, and real payment/compliance plumbing.

This plan intentionally does **not** chase every gap (e.g. multi-stop rides,
fleet management, incentive programs) — it targets the items the gap analysis
ranked as most load-bearing. Items explicitly out of scope are listed at the
end so the next planning pass has a clean starting point.

## Phasing rationale

Real-time infrastructure comes first because ratings, safety alerts, live
ETA, and driver identity all assume the client can receive server-pushed
events. Proximity matching follows since it's a contained, well-scoped change
once driver location is reliably live. Trust/safety and payments/compliance
come last — they're the most expensive and highest-risk changes (money,
verification workflows) and depend on the earlier phases being stable.

---

## Phase 1 — Real-time infrastructure (WebSockets + push notifications)

**Why first:** nothing else on this list works without a way to push events
to clients. Today everything is HTTP polling; the driver app misses ride
offers the moment it's backgrounded, and the rider app never learns of a
state change without reopening.

### Backend
- Add a WebSocket gateway (`@nestjs/websockets` + `socket.io` adapter) to
  `apps/api`. One namespace per role (`/rider`, `/driver`), authenticated via
  the existing bearer token on connection.
- Emit events on every ride state transition (`ride.state_changed`), new chat
  message (`chat.message`), and driver location update relevant to an active
  ride (`ride.driver_location`).
- Add a push notification provider abstraction (mirroring the
  `GeocodingProvider`/`RoutingProvider` pattern): `PushNotificationProvider`
  with an FCM-backed implementation and a development no-op logger, wired the
  same way as the Nominatim/OSRM provider factories in `app.module.ts`.
- Driver device tokens: add a `deviceToken` field to `Driver`/`Rider` (or a
  small `DeviceToken` table if multiple devices per user matters later —
  start with single-token-per-user for simplicity) plus an endpoint to
  register/update it.
- Fire pushes for: new ride offer (driver), ride accepted/driver en route/
  arrived (rider), ride cancelled by the other party, new chat message when
  the recipient's socket isn't connected.

### Mobile (both apps)
- Add `socket_io_client` and connect on session start; reconnect with
  socket.io's built-in backoff on drop. Done via a `RealtimeClient`
  abstraction (`apps/mobile/lib/src/realtime/realtime_client.dart`) so
  widgets can be tested with a fake stream source instead of a real socket.
- Replace the rider app's "fetch once" ride state with a live subscription
  to `ride.state_changed`, clearing the active ride on terminal states. Done.
- Replace the driver app's poll loop with socket-driven offer delivery
  (`ride.offer` triggers an immediate refresh); kept a much slower poll
  (15s, was 3s) as a fallback safety net, not the primary path. Done.
- **Deferred:** `firebase_messaging` for background push. Attempted and
  reverted — the currently resolving `firebase_core`/`firebase_messaging`
  versions have a dependency break against this repo's Flutter SDK (a
  `pluginConstants` getter mismatch surfaced across the whole test suite at
  compile time, unrelated to Firebase project configuration). Revisit once
  a compatible version combination exists, or pin exact transitive versions
  by hand. Until then, background push does not work — sockets only receive
  events while the app is foregrounded and connected; the poll fallback
  covers backgrounded gaps at the cost of latency.

### Verification
- Unit specs for the gateway's auth handshake and event emission (following
  this repo's existing in-memory-repository test pattern).
- Live E2E: book a ride, confirm the driver app receives the offer via
  socket/push without polling; confirm the rider app sees state changes
  (accepted → en route → arrived) without refreshing.

---

## Phase 2 — Proximity-based matching + driver identity surfaced to riders

**Why second:** a contained, well-scoped change once driver location is
reliably live from Phase 1. Also unblocks the trust/UX gap of riders never
seeing who's picking them up.

### Backend
- Convert `Driver.latitude`/`longitude` (and `Ride` pickup/destination) to
  PostGIS `geography(Point, 4326)` columns, since Postgres already runs the
  PostGIS image unused. Add a spatial index.
- Rewrite `claimNextRideForDriver` in `prisma-driver-ride.repository.ts` to
  rank candidate rides by `ST_Distance` from the driver's current location
  within a configurable radius, instead of plain `orderBy: requestedAt asc`.
  Keep FIFO as the tiebreaker within a distance band.
- Extend the driver-facing ride view and rider-facing ride view to include
  driver identity: name, a photo URL field (add `photoUrl` to `Driver`),
  vehicle plate/model (join through `Vehicle`).
- Add an ETA field to the rider's active-ride response, computed from the
  routing service between the driver's current location and the pickup.

### Mobile
- Rider: show driver name/photo/vehicle/plate and live ETA on the
  matching/active-ride screens once a driver is assigned.
- Driver: no major change beyond receiving closer, more relevant offers.

### Verification
- Unit specs for the distance-ranked claim query (in-memory repository can
  approximate with a simple distance function for the test double; the
  Prisma/PostGIS path needs an integration spec against the real DB).
- Live E2E: two drivers online at different distances from a requested ride
  confirm the closer one is offered first.

---

## Phase 3 — Ratings, post-ride flow, and safety basics

**Why third:** the primary feedback loop for driver quality and rider trust
in every production platform; currently entirely absent on the rider side
and the "Safety" button is a literal no-op.

### Backend
- Add a `Rating` model (rideId, raterType, raterId, ratedType, ratedId,
  stars, comment, createdAt). Add endpoints for rider-rates-driver and
  driver-rates-rider after a ride reaches `completed`.
- Add an incident/SOS endpoint: `POST /rides/:id/sos` (rider and driver
  variants) that creates an `incident_reported` transition (state already
  exists in the shared state machine) and notifies an admin channel — start
  with an admin-overview alert list, not a full dispatch-to-authorities
  integration.
- Surface average rating on `Driver`/`Rider` profile reads.

### Mobile
- Rider: post-ride rating screen (stars + optional comment) shown once a
  ride reaches `completed`; wire the existing "Safety" button to a real
  bottom sheet with an SOS action and (later) trusted-contact sharing.
- Driver: symmetric rate-the-rider screen; SOS action from the active-ride
  card.
- Both: show the other party's rating where currently only phone number is
  shown.

### Verification
- Unit specs for the rating service (one rating per ride per direction,
  rejected outside `completed`/grace window) and the SOS endpoint.
- Live E2E: complete a ride, rate both directions, confirm averages update;
  trigger SOS and confirm it appears in the admin overview.

---

## Phase 4 — Real payment capture + driver onboarding/compliance

**Why last:** highest implementation cost and highest risk (real money, real
verification workflows) — and it's the hard gate before any pilot involving
real drivers or real fares, so it should land once the experience around it
is stable.

### Backend
- Integrate one real payment path first — start with JazzCash or Easypaisa
  (most relevant locally) via their merchant API, behind the same
  provider-abstraction pattern used elsewhere (`PaymentProvider` interface,
  factory in `app.module.ts`, a development stub for local work).
- Add a `DriverDocument` model (type, fileUrl, status, reviewedBy,
  reviewedAt) and an `approvalStatus` field on `Driver` (`pending`,
  `approved`, `rejected`). Gate `POST /driver/availability` (going online)
  on `approvalStatus === "approved"`.
- Add a minimal admin review queue: list pending drivers/documents, approve/
  reject endpoints — the first real *write* capability in `admin-overview`,
  which today is read-only.

### Mobile
- Driver onboarding: document upload screens (license, vehicle
  registration, CNIC/photo) after OTP verify, before reaching the duty
  screen; show a "pending approval" state if not yet approved.
- Rider: real payment method entry/tokenization for the chosen gateway,
  replacing the current plain-string payment method selector.

### Verification
- Unit specs for the payment provider abstraction and the approval gate.
- Live E2E: upload documents as a driver, approve via admin, confirm the
  driver can then go online; complete a ride with the real payment gateway
  in its sandbox mode.

---

## Explicitly out of scope for this plan

Carried over from the gap analysis but deferred to a future pass: multi-stop
rides, fleet/vehicle-switching management, promo codes and referrals,
surge pricing computed from live supply/demand (today it's a static
per-policy multiplier), horizontal scaling (Redis/queues), APM/structured
logging, split fare, tipping, masked calling, and turn-by-turn navigation
with voice guidance (a static route ribbon remains for now).

## Verification at the end

Once all four phases land, run the same three-agent gap analysis performed
initially (rider app / driver app / backend platform vs. Uber/Careem/Bolt)
and produce an updated comparison artifact showing what moved from
Missing/Partial to Present, and what (from the out-of-scope list above)
remains for the next planning cycle.
