# Tami Rider Map and Location Design

Date: 2026-07-13
Status: Approved for implementation
Scope: Rider pickup, destination search, road routing, and map visualization

## Purpose

Replace the rider prototype's fixed Karachi pickup and sample destinations with a city-aware, provider-backed booking map that works across the configured Sindh cities. The same authoritative road route must drive both the fare estimate and the route drawn for the rider.

## Architecture

The Flutter rider app owns device permission UX and obtains a precise position through `geolocator`. It sends coordinates and search text only to authenticated Tami API endpoints. The app does not hold the server geocoding credential and does not call a routing vendor directly.

The NestJS API exposes two provider boundaries:

- `GeocodingProvider` uses MapTiler Search for forward and reverse geocoding.
- `RoutingProvider` uses the OSRM HTTP route contract for driving distance, duration, and GeoJSON route coordinates.

Provider implementations are replaceable without changing rider API contracts. Production startup rejects missing provider configuration. Automated tests use deterministic in-memory providers. Local development may use the OSRM project demo endpoint for preview only; it is not an operational production dependency.

## City Context

Each active `City` stores a map center and search bounding box. Rider-authenticated place search always uses the rider's city from the server session, not a client-supplied city ID. Forward search is restricted to the city's bounding box and Pakistan; reverse geocoding rejects coordinates outside that bounding box.

This bounding box is the first operational service gate for map search. Polygon service areas and zones remain a later dispatch milestone, where PostGIS can enforce irregular operating boundaries.

## Mobile Location States

The rider home screen distinguishes these states:

- locating
- ready
- location services disabled
- permission denied
- permission permanently denied
- temporary location failure

No Sindh city or pickup coordinate is silently substituted. When current location is unavailable, the rider can choose a pickup through the same backend place-search flow used for destinations. Permanently denied permissions expose an operating-system settings action.

## Place Search

Destination and manual pickup search share one reusable sheet. Search begins after two non-whitespace characters, uses a 350 ms debounce, ignores stale responses, and provides loading, empty, error, and retry states. Saved places remain available before typing.

Forward results include provider ID, display name, full address, latitude, longitude, and city ID. Reverse geocoding returns the same app-facing place model so current location and manually selected places behave identically.

## Routing and Pricing

`RoutingService` validates coordinates, asks the configured OSRM-compatible provider for a driving route, and returns:

- distance in meters
- duration in seconds
- ordered latitude/longitude geometry
- route method and provider identifier

`PricingService` consumes this result instead of estimating road distance from a great-circle multiplier. `POST /pricing/estimate` returns the route geometry with the existing auditable fare breakdown. `BookingService` independently calls `PricingService`, so the persisted estimate cannot be tampered with by the client.

## Map Rendering

`TamiMapSurface` receives a platform-independent `TamiMapViewState` containing pickup, destination, and route geometry.

- Android/iOS render the approved `streets-v2` style through MapLibre Native, declarative route/circle layers, and camera fitting.
- Browser preview keeps the non-GL painted map and draws the same state as visible markers and a route ribbon.
- The screen displays a recenter icon control and does not ask MapLibre to manage location permission independently.

## Error Handling

Provider timeouts, malformed provider responses, missing configuration, and no-route results become stable API errors without leaking provider secrets. Search and location failures preserve the rider's last explicit selection. A route or fare failure disables ride confirmation and gives the rider a retry action.

## Security and Operations

- MapTiler search keys remain server-side.
- The mobile map-style key is a separate public, application-restricted key embedded only through `TAMI_MAP_STYLE_URL` at build time.
- Provider requests use explicit timeouts and bounded result counts.
- Search query values and provider errors are not logged with secrets.
- Production requires `TAMI_MAPTILER_API_KEY`, `TAMI_ROUTING_BASE_URL`, and `TAMI_MAP_STYLE_URL` deployment configuration.

## Verification

Backend unit tests cover city bounds, provider parsing, route validation, search authorization, and fare-route consistency. Flutter tests cover every location state, debounced/stale search, manual pickup, current-location reverse geocoding, route propagation, and map fallback rendering. Final checks include API tests/typecheck, Flutter tests/analyze, web preview, Android build, and physical Android/iOS map validation when signing/device access is available.
