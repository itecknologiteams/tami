# Tami Rider Map and Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real, city-aware rider pickup and destination selection with device location, backend geocoding, authoritative road routing, and route rendering.

**Architecture:** Flutter owns permission UX through a replaceable location client and calls authenticated Tami place/pricing APIs. NestJS isolates MapTiler Search and OSRM behind provider interfaces; the OSRM route result powers both fare calculation and the map geometry returned to Flutter.

**Tech Stack:** Flutter 3.41.3, Dart 3.11.1, `maplibre 0.3.5`, `geolocator 14.0.3`, NestJS 11, TypeScript 5.9, Prisma/PostgreSQL, MapTiler Search API, OSRM HTTP API v1, Flutter Test, Vitest.

## Global Constraints

- Support multiple Sindh cities without hardcoding Karachi.
- Use Flutter for Android and iOS and never instantiate `maplibre-gl-js` in the rider browser preview.
- Use the approved MapTiler `streets-v2` style through `TAMI_MAP_STYLE_URL` on native builds.
- Keep MapTiler search credentials on the API server.
- Use one OSRM road route for pricing metrics and displayed geometry.
- Never silently substitute a default pickup when location is unavailable.
- Follow red-green-refactor for every behavior change.

---

### Task 1: City Map Profiles

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260713170000_city_map_profiles/migration.sql`
- Modify: `apps/api/prisma/seed.ts`
- Test: `apps/api/prisma/seed.spec.ts`

**Interfaces:**
- Produces: active `City` records with `centerLatitude`, `centerLongitude`, `searchWest`, `searchSouth`, `searchEast`, and `searchNorth` decimal fields.

- [x] **Step 1: Write the failing seed test** asserting all five Sindh seed cities include finite centers and ordered search bounds.
- [x] **Step 2: Run the seed test to verify RED** with `pnpm --filter @tami/api exec vitest run prisma/seed.spec.ts`; expect failure because map profile fields do not exist.
- [x] **Step 3: Add the Prisma fields, SQL migration, and explicit city profiles** for Karachi, Hyderabad, Sukkur, Larkana, and Mirpur Khas.
- [x] **Step 4: Generate Prisma and verify GREEN** with `pnpm --filter @tami/api prisma:generate` and the focused seed test.
- [x] **Step 5: Commit** with `git commit -m "feat: add city map profiles"`.

### Task 2: Backend Place Search

**Files:**
- Create: `apps/api/src/places/geocoding.types.ts`
- Create: `apps/api/src/places/geocoding.provider.ts`
- Create: `apps/api/src/places/maptiler-geocoding.provider.ts`
- Create: `apps/api/src/places/maptiler-geocoding.provider.spec.ts`
- Create: `apps/api/src/places/rider-place-search.service.ts`
- Create: `apps/api/src/places/rider-place-search.service.spec.ts`
- Create: `apps/api/src/places/rider-place-search.controller.ts`
- Create: `apps/api/src/places/rider-place-search.controller.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `GET /places/search?query=...` and `GET /places/reverse?latitude=...&longitude=...` guarded by `RiderAuthGuard`.
- Produces: `RiderSearchPlace { id, name, address, latitude, longitude, cityId }`.
- Consumes: authenticated rider `cityId` and the corresponding Prisma city map profile.

- [x] **Step 1: Write failing provider tests** for URL encoding, `country=pk`, city `bbox`, `proximity`, bounded result count, reverse-geocode URL, timeout, malformed responses, and provider errors.
- [x] **Step 2: Run the provider test to verify RED**; expect missing provider classes.
- [x] **Step 3: Implement `GeocodingProvider` and `MapTilerGeocodingProvider`** using injected fetch, `AbortSignal.timeout(5000)`, `TAMI_MAPTILER_API_KEY`, and strict response parsing.
- [x] **Step 4: Run provider tests to verify GREEN**.
- [x] **Step 5: Write failing service/controller tests** for two-character query validation, rider-city scoping, out-of-bounds reverse lookup, auth guard metadata, and stable result mapping.
- [x] **Step 6: Implement the city repository query, service, controller, and Nest registration** without accepting a client city ID.
- [x] **Step 7: Run all place/API tests and typecheck** with `pnpm --filter @tami/api test` and `pnpm --filter @tami/api typecheck`.
- [x] **Step 8: Commit** with `git commit -m "feat: add rider place search"`.

### Task 3: OSRM Routing and Fare Geometry

**Files:**
- Create: `apps/api/src/routing/routing.types.ts`
- Create: `apps/api/src/routing/routing.provider.ts`
- Create: `apps/api/src/routing/osrm-routing.provider.ts`
- Create: `apps/api/src/routing/osrm-routing.provider.spec.ts`
- Create: `apps/api/src/routing/routing.service.ts`
- Create: `apps/api/src/routing/routing.service.spec.ts`
- Modify: `apps/api/src/pricing/pricing.types.ts`
- Modify: `apps/api/src/pricing/pricing.service.ts`
- Modify: `apps/api/src/pricing/pricing.service.spec.ts`
- Modify: `apps/api/src/pricing/pricing.test-fixture.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `RoutePreview { distanceMeters, durationSeconds, method: 'osrm_v1', provider, coordinates: RouteCoordinate[] }`.
- Changes: `FareEstimate.routeMethod` to `'osrm_v1'` and adds `routeCoordinates` plus `routeProvider`.
- Consumes: `RoutingService.previewDrivingRoute(pickup, destination)` from `PricingService.estimateFare`.

- [x] **Step 1: Write failing OSRM provider tests** for `route/v1/driving/{lon},{lat};{lon},{lat}`, `overview=full`, `geometries=geojson`, timeouts, no-route responses, and malformed geometry.
- [x] **Step 2: Run the provider test to verify RED**.
- [x] **Step 3: Implement the provider and routing service** with finite coordinate validation, at least two route points, and explicit provider/method metadata.
- [x] **Step 4: Run routing tests to verify GREEN**.
- [x] **Step 5: Update pricing tests first** to expect OSRM metrics and geometry, then run them to verify RED against the great-circle implementation.
- [x] **Step 6: Inject `RoutingService` into `PricingService` and calculate fare from route distance/duration** while preserving policy caps, multipliers, and explanation lines.
- [x] **Step 7: Run pricing, booking, controller, and API suites to verify GREEN**.
- [x] **Step 8: Commit** with `git commit -m "feat: route rider fares with osrm"`.

### Task 4: Flutter Device Location

**Files:**
- Modify: `apps/mobile/pubspec.yaml`
- Modify: `apps/mobile/pubspec.lock`
- Create: `apps/mobile/lib/src/location/rider_location.dart`
- Create: `apps/mobile/lib/src/location/rider_location_client.dart`
- Create: `apps/mobile/lib/src/location/geolocator_rider_location_client.dart`
- Create: `apps/mobile/test/rider_location_client_test.dart`
- Modify: `apps/mobile/android/app/src/main/AndroidManifest.xml`
- Modify: `apps/mobile/ios/Runner/Info.plist`
- Modify: `apps/mobile/lib/src/app/tami_mobile_app.dart`
- Modify: `apps/mobile/lib/src/auth/rider_onboarding_screen.dart`
- Modify: `apps/mobile/lib/src/features/rider/rider_shell.dart`

**Interfaces:**
- Produces: `RiderLocationResult` states `ready`, `servicesDisabled`, `permissionDenied`, `permissionDeniedForever`, and `failed`.
- Produces: `RiderLocationClient.locate()` and `openSettings()`.

- [x] **Step 1: Add `geolocator: ^14.0.3` and write failing adapter tests** using a narrow injected geolocator gateway.
- [x] **Step 2: Run the focused Flutter test to verify RED** because the location types do not exist.
- [x] **Step 3: Implement the result model and geolocator adapter** mapping service and permission states without a default coordinate.
- [x] **Step 4: Add Android coarse/fine location permissions and the iOS when-in-use purpose string**.
- [x] **Step 5: Thread the injectable location client from `TamiMobileApp` through onboarding and shell**.
- [x] **Step 6: Run focused tests and `flutter analyze` to verify GREEN**.
- [x] **Step 7: Commit** with `git commit -m "feat: add rider device location"`.

### Task 5: Flutter Place Search Client and Sheet

**Files:**
- Create: `apps/mobile/lib/src/features/rider/rider_place_search_client.dart`
- Create: `apps/mobile/test/rider_place_search_client_test.dart`
- Modify: `apps/mobile/lib/src/features/rider/booking/destination_search_sheet.dart`
- Create: `apps/mobile/test/rider_place_search_sheet_test.dart`
- Modify: `apps/mobile/lib/src/app/tami_mobile_app.dart`
- Modify: `apps/mobile/lib/src/auth/rider_onboarding_screen.dart`
- Modify: `apps/mobile/lib/src/features/rider/rider_shell.dart`

**Interfaces:**
- Produces: `RiderPlaceSearchClient.search(...)` and `reverse(...)`.
- Produces: reusable `RiderPlaceSearchSheet(mode: pickup|destination, ...)` returning `TamiPlace`.
- Consumes: authenticated access token, current pickup proximity, saved places, and backend place endpoints.

- [x] **Step 1: Write failing HTTP client tests** for encoded query/proximity parameters, bearer auth, reverse lookup, response parsing, and stable API errors.
- [x] **Step 2: Run focused client tests to verify RED**.
- [x] **Step 3: Implement the HTTP client and app dependency wiring**.
- [x] **Step 4: Run client tests to verify GREEN**.
- [x] **Step 5: Write failing widget tests** for two-character minimum, 350 ms debounce, stale response suppression, loading, empty, retry, saved places, and pickup/destination titles.
- [x] **Step 6: Replace `_destinationOptions` with the reusable provider-backed sheet**.
- [x] **Step 7: Run focused widget tests and analyze to verify GREEN**.
- [x] **Step 8: Commit** with `git commit -m "feat: add live rider place search"`.

### Task 6: Rider Pickup Orchestration

**Files:**
- Modify: `apps/mobile/lib/src/features/rider/booking/booking_composer.dart`
- Modify: `apps/mobile/lib/src/features/rider/rider_home_screen.dart`
- Modify: `apps/mobile/test/rider_home_screen_test.dart`
- Modify: `apps/mobile/lib/src/auth/rider_session.dart`
- Modify: `apps/api/src/auth/auth.types.ts`
- Modify: `apps/api/src/auth/prisma-auth.repository.ts`
- Modify: related auth tests

**Interfaces:**
- Changes: rider session profile includes `cityName` from the API.
- Produces: home pickup state loaded from current location plus reverse geocoding, with manual edit/retry/settings actions.
- Consumes: `RiderLocationClient`, `RiderPlaceSearchClient`, rider session city, and `TamiPlace`.

- [x] **Step 1: Write failing API auth tests** expecting `cityName` in active rider profile/session responses.
- [x] **Step 2: Run auth tests to verify RED, then implement the relation query and response mapping**.
- [x] **Step 3: Write failing rider-home tests** for locating, ready current pickup, denied, denied-forever settings, service-disabled, retry, manual pickup, session city label, and no hardcoded Frere Hall request.
- [x] **Step 4: Run the focused Flutter tests to verify RED**.
- [x] **Step 5: Implement pickup state orchestration and booking composer controls**; keep confirmation inaccessible until explicit pickup and destination exist.
- [x] **Step 6: Run auth, rider-home, and full Flutter tests to verify GREEN**.
- [x] **Step 7: Commit** with `git commit -m "feat: add city aware rider pickup"`.

### Task 7: Route-Aware Map Surface

**Files:**
- Create: `apps/mobile/lib/src/maps/tami_map_view_state.dart`
- Create: `apps/mobile/test/tami_map_view_state_test.dart`
- Modify: `apps/mobile/lib/src/maps/tami_map_surface_native.dart`
- Modify: `apps/mobile/lib/src/maps/tami_map_surface_web.dart`
- Modify: `apps/mobile/lib/src/maps/map_preview_fallback.dart`
- Modify: `apps/mobile/lib/src/features/rider/rider_pricing_client.dart`
- Modify: `apps/mobile/test/rider_pricing_client_test.dart`
- Modify: `apps/mobile/lib/src/features/rider/booking/ride_options_sheet.dart`
- Modify: `apps/mobile/lib/src/features/rider/rider_home_screen.dart`
- Modify: `apps/mobile/test/rider_home_screen_test.dart`

**Interfaces:**
- Produces: immutable `TamiMapViewState(pickup, destination, routeCoordinates)` and calculated bounds.
- Changes: `TamiMapSurface(viewState: ...)` renders markers and route.
- Changes: `RiderFareEstimate` parses route geometry and `RideOptionsSheet.onEstimate` sends it to home.

- [x] **Step 1: Write failing model/client tests** for route coordinate parsing, invalid geometry rejection, and bounds across all points.
- [x] **Step 2: Run focused tests to verify RED**.
- [x] **Step 3: Implement map state and fare geometry parsing**.
- [x] **Step 4: Write failing fallback/home widget tests** showing pickup/destination markers, route paint state, and estimate-to-map propagation.
- [x] **Step 5: Implement native MapLibre `PolylineLayer`, `CircleLayer`, marker widgets, camera fitting, recenter control, and matching painted fallback**.
- [x] **Step 6: Connect home state and ride options estimate callback**.
- [x] **Step 7: Run all Flutter tests and analyze to verify GREEN**.
- [ ] **Step 8: Commit** with `git commit -m "feat: render rider road routes"`.

### Task 8: End-to-End Verification and Preview

**Files:**
- Modify: `tech_stack.md`
- Modify: `README.md` if startup environment documentation is missing
- Modify: `docs/superpowers/plans/2026-07-11-tami-rider-completion-plan.md`

**Interfaces:**
- Produces: documented production and development environment contracts and a verified preview URL.

- [ ] **Step 1: Run API unit and integration suites** including a clean migration/seed against `postgresql://tami:tami@127.0.0.1:5434/tami`.
- [ ] **Step 2: Run API typecheck/build** and confirm no provider secret appears in generated output.
- [ ] **Step 3: Run Flutter tests, analyze, Android debug build, and web build** with explicit API/map environment values.
- [ ] **Step 4: Rebuild and serve the browser preview** and verify OTP, profile, current/manual pickup, live destination search, fare, route drawing, immediate ride, and scheduled ride.
- [ ] **Step 5: Check browser logs and responsive layouts** at mobile and wide viewports.
- [ ] **Step 6: Update the completion checklist and provider setup documentation with verified commands**.
- [ ] **Step 7: Commit** with `git commit -m "docs: verify rider map booking flow"`.
