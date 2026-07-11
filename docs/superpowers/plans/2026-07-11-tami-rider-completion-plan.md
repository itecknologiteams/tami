# Tami Rider Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-ready Android and iOS rider app for Tami Hailing, backed by authoritative APIs and complete enough to support immediate and scheduled Sindh taxi rides.

**Architecture:** The API remains the source of truth for rider profile, places, fare calculations, bookings, state, payments, chat, support records, and receipts. Flutter exposes three rider areas: booking, trips, and account. Real-time delivery improves responsiveness, while polling and reconnect synchronization preserve correctness when delivery is interrupted.

**Tech Stack:** Flutter/Dart, MapLibre Flutter Native for Android/iOS, NestJS, Prisma/PostgreSQL/PostGIS, authenticated HTTP now, WebSockets for live events, Flutter Test, Vitest, integration tests, device checks.

## Non-Negotiable Constraints

- Support multiple Sindh cities without hardcoding Karachi.
- Use Flutter for Android and iOS; no `maplibre-gl-js` integration.
- Use the approved public `streets-v2` native map style through `TAMI_MAP_STYLE_URL`.
- Keep every ride transition server-authoritative and auditable.
- Do not allow rider/driver chat before the ride reaches `accepted`.
- Support cash, JazzCash, Easypaisa, and NayaPay behind provider interfaces.
- Dynamic pricing must be explainable, capped, city-aware, auditable, and controlled by admin policy.
- Development OTP must be replaced by a production OTP provider before release.

## Current Audit

### Proven Working

- Development OTP onboarding, bearer sessions, profile update, city selection.
- Native MapLibre surface and non-GL browser preview fallback.
- Destination search prototype, category selection, immediate/scheduled booking request, rider cancellation.
- Strict domain transition tests, persisted chat messages, accepted-state chat UI.
- Flutter unit/widget suite and API unit/type checks pass.

### Not Complete

- Pickup is a hardcoded Frere Hall coordinate; destinations are a local sample list.
- The city label is hardcoded to Karachi and no service-area validation exists.
- Fare values are local constants. No server-side estimate, dynamic policy, route distance, or fare explanation exists.
- Selected payment method is not sent to the server or persisted as a payment intent.
- No rider current-ride, ride-detail, upcoming, history, receipt, rating, complaint, saved-place, payment-method, or settings API exists.
- Trips and account actions are placeholders.
- Active ride state is not fetched/resynced; no driver identity or live driver location exists.
- Chat is text-only, lacks quick messages, delivery/read state, push/realtime updates, and closure handling.
- Safety button is empty; no emergency/incident workflow exists.
- No localization, accessibility audit, offline/retry strategy, Android/iOS map-device check, or production release setup exists.

## Completion Sequence

### Milestone 1: Stabilize the Existing Vertical Slice

**Files:** Current uncommitted rider, API, chat, map, schema, documentation, and test files.

- [ ] Re-run Flutter tests/analyze, API tests/typecheck, and database integration tests with Tami's explicit database URL.
- [ ] Add controller-level tests for chat and rider cancellation authorization.
- [ ] Verify the chat migration applies from a clean database and the server starts with `DATABASE_URL=postgresql://tami:tami@127.0.0.1:5434/tami`.
- [ ] Rebuild the browser preview and manually complete phone, profile, booking, cancellation, and chat mocked-state flows.
- [ ] Remove generated preview screenshots and `.playwright-mcp` artifacts from the working tree.
- [ ] Commit the stabilized slice before broader rider work begins.

**Acceptance:** No uncommitted generated artifacts; all checks pass; local API starts; browser preview no longer hangs after a phone submission.

### Milestone 2: Rider Data and Authoritative Ride APIs

**Backend modules:** `rides`, `places`, `pricing`, `payments`, `receipts`.

- [ ] Add rider-owned endpoints for current ride, ride detail, upcoming scheduled rides, paginated history, and receipt detail.
- [ ] Add saved-place storage with labels, address, coordinates, city, and default Home/Work designations.
- [ ] Add strict server validation for coordinates, city/service-area membership, categories, schedule lead time, cancellation rules, and ownership.
- [ ] Add `GET /rides/:id` and a current-rider ride query so the Flutter app can restore state after restart.
- [ ] Persist payment method and payment intent with each booking.
- [ ] Implement a `POST /pricing/estimate` contract that returns fare minor units, currency, applicable policy/version, distance/time inputs, multiplier, caps, and explanation lines.
- [ ] Make booking independently recompute the estimate and persist the policy version and estimated fare to prevent client price tampering.
- [ ] Add receipt/final-fare/payment models and audit records; do not call a ride completed until payment handling is resolved.

**Acceptance:** Every Trips and Account screen can obtain real, rider-owned data from an authenticated API. A price displayed to the rider comes from an auditable server policy, not a Flutter constant.

### Milestone 3: Complete Booking Experience

**Flutter modules:** split `rider_home_screen.dart` into booking state, pickup/destination search, ride options, and estimate components.

- [ ] Add location permission and current-location pickup with manual correction, map pin placement, and city/service-area handling.
- [ ] Replace local destination samples with geocoding/place-search adapter results and saved places.
- [ ] Add rider city context based on profile, selected city, and pickup validation; remove hardcoded Karachi copy and coordinates.
- [ ] Load active categories and availability rules from the API.
- [ ] Load server fare estimate after pickup, destination, category, and schedule changes; show a policy explanation and payment method.
- [ ] Implement immediate and scheduled confirmation summaries, schedule validation, request idempotency, and clear failure/retry states.
- [ ] Persist successful booking and switch directly to the restored current-ride view.

**Acceptance:** A signed-in rider can choose a valid pickup/destination, choose a category/payment/schedule, see a server fare, create an idempotent ride, and recover the ride after app restart.

### Milestone 4: Live Trip and Rider Safety

**Backend modules:** dispatch read model, ride events, location events, incident/support.

- [ ] Implement rider ride-state read/synchronization with WebSocket events plus HTTP recovery polling.
- [ ] Expose masked driver/vehicle details only after assignment and state-appropriate tracking data.
- [ ] Stream driver location with server-side authorization, retention policy, rate limits, and rider map updates.
- [ ] Render every state in the approved machine: requested through completed and all cancellation/no-show/payment/incident exceptions.
- [ ] Add state-specific rider actions: cancellation reason, no-show/report flow, payment resolution, and dispute entry point.
- [ ] Build safety center: emergency action, incident report, trip sharing/contact workflow, and auditable support ticket creation.
- [ ] Add reconnect, stale-location, API failure, and expired-session handling.

**Acceptance:** The rider receives live, recoverable trip information and can use safety/support controls throughout an eligible ride without exposing unauthorized driver information.

### Milestone 5: Complete Chat

**Backend modules:** durable chat delivery and driver participant API.

- [ ] Add driver-side chat authorization and ensure both participants are scoped to the same accepted ride.
- [ ] Add WebSocket message delivery, HTTP history recovery, ordering/idempotency keys, and delivery timestamps.
- [ ] Add quick messages: arrival, waiting, call request, and exact-location request.
- [ ] Close sending after terminal states while retaining read-only history according to policy.
- [ ] Add admin-visible, role-gated investigation access and retention/audit rules.
- [ ] Add Flutter live update, retry, offline queued-send behavior, and accessibility labels.

**Acceptance:** Both rider and driver can exchange text and quick messages only during permitted ride states; missed events recover from history; terminal rides remain readable but cannot receive new messages.

### Milestone 6: Trips, Receipts, Ratings, Complaints, and Account

**Flutter modules:** replace `_TripsScreen` and `_AccountScreen` placeholders with routed feature screens.

- [ ] Build upcoming scheduled rides, cancellation/reschedule rules, and past-trip pagination/filtering.
- [ ] Build receipt screen with route summary, fare breakdown, payment status, payment provider reference, and support link.
- [ ] Add post-trip rating, feedback, complaint, dispute, lost-item, and incident escalation flows with attachment support where approved.
- [ ] Build saved-place CRUD, payment-method selection, profile/photo update, language/settings, support history, and privacy controls.
- [ ] Add English, Urdu, and Sindhi localization resources; support RTL-safe Urdu layout and locale-aware currency/date formatting.

**Acceptance:** No account/trip list item is a no-op. A rider can manage their data, locate records, obtain receipts, rate a ride, and file a support issue end to end.

### Milestone 7: Release Readiness

- [ ] Replace development OTP with approved production SMS OTP, abuse/rate limiting, secure secret management, and session revoke/logout flows.
- [ ] Add wallet-provider adapters and certified JazzCash, Easypaisa, and NayaPay flows; keep test/sandbox environments separate.
- [ ] Verify Android and iOS MapLibre rendering, location permission, app lifecycle recovery, deep links, and physical-device routes with the approved `streets-v2` style.
- [ ] Add API integration tests against a clean PostGIS database, contract tests, Flutter E2E tests, and mobile accessibility tests.
- [ ] Add observability, error reporting, privacy/data-retention policy, backups, security review, performance testing, and app-store/release configuration.

**Acceptance:** The release candidate satisfies functional, security, accessibility, resilience, and device-validation gates; all product-visible rider features are API-backed and verified.
