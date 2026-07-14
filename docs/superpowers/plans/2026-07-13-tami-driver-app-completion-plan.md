# Tami Driver App Completion Plan (2026-07-13)

## Goal

Bring the driver app to parity with the rider experience: live map with the ride
route, in-ride chat, continuous location reporting, earnings and trip history,
and the Tami glass design language.

## Backend additions (NestJS)

- `POST /driver/location` — lightweight location ping while on duty; updates the
  driver's stored coordinates without touching the online flag.
- `GET /driver/rides/:id/route` — road route (via `RoutingService`) between the
  ride's pickup and destination for the driver map ribbon.
- `GET /driver/rides/history` — the driver's finished rides (completed and
  cancelled), newest first, limited page size.
- `GET /driver/earnings` — today's and this week's completed ride counts and
  fare totals from `finalFareMinor`.
- Unit specs for each service path using the in-memory repository.

## Driver app (Flutter)

- **Map**: reuse `TamiMapSurface` behind the duty screen; when a ride is active,
  fetch the route once and render pickup/destination plus the road ribbon (web
  preview falls back to the static painter automatically).
- **Chat**: parameterize the existing `RideChatSheet` (own sender type, title,
  hint) and open it from the active ride card through a driver chat client that
  implements the shared chat client interface against `/driver/rides/:id/chat`.
- **Location streaming**: while online, a periodic timer reads the device
  location (`RiderLocationClient`) and pings `POST /driver/location`.
- **Shell**: bottom-tab shell — Duty (map + ride loop), Earnings (totals +
  finished ride list), Account (driver identity, duty city, sign out).
- **Design**: wrap ride cards and summaries in `TamiGlass`, matching the rider
  look.
- Widget tests for the ride loop on the new shell, chat sheet reuse, and the
  earnings screen; keep flutter analyze clean.

## Verification

- Full gates: workspace typecheck/test/build, flutter analyze/test.
- Live E2E: driver location ping, route fetch, chat both directions, history and
  earnings reflect a completed ride.
