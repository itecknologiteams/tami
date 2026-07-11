# Tami Rider Liquid Glass Product Design

Date: 2026-07-11
Status: Approved
Scope: Flutter rider application for Android and iOS

## Product Intent

Tami Rider is the citizen-facing application for Sindh's government-owned electric taxi service. Its first job is to let a rider move confidently from location selection to a completed, paid, and auditable trip. It must feel contemporary and premium while remaining legible outdoors, usable with one hand, resilient on uneven mobile networks, and appropriate for a public service.

The visual direction is **balanced civic liquid glass**. The live map is the visual ground. Translucent controls and moving sheets provide depth and context without obscuring roads, labels, safety actions, prices, or ride state. Glass is functional material, not decoration.

## Experience Principles

- Map first: pickup, destination, route, driver, and trip progress remain spatially understandable.
- One dominant action per state: search, choose, confirm, contact, pay, rate, or resolve.
- Government clarity: fares, multipliers, fees, payment status, and support outcomes are explainable.
- State continuity: reopening the app restores the authoritative current ride rather than returning to an empty home screen.
- Inclusive operation: large controls, strong contrast, reduced-motion support, screen-reader semantics, and English, Urdu, and Sindhi readiness.
- Calm urgency: safety and exception states become prominent without making normal rides feel alarming.

## Visual System

### Color Tokens

- `civicGreen` `#006C5B`: brand, primary action, active navigation, confirmed states.
- `deepGreen` `#123C34`: high-contrast headings and dark glass tint.
- `signalYellow` `#F2BC3D`: pickup focus, progress, attention, and vehicle accent.
- `routeCyan` `#2C9FA3`: route, driver movement, and informational map state.
- `mist` `#E7F0EC`: light surfaces and low-emphasis backgrounds.
- `paper` `#F8FBF9`: readable content surface.
- `danger` `#B42318`: destructive actions, payment failures, incidents.
- `ink` `#18302B`: primary text.

The palette is not a single-green theme. Yellow and cyan carry distinct operational meaning; red is reserved for true exceptions.

### Typography

- Display and section headings: `Noto Sans`, weight 700-800.
- Body and controls: `Noto Sans`, weight 400-600.
- Urdu: `Noto Nastaliq Urdu` where platform rendering is reliable, with `Noto Sans Arabic` fallback for compact controls.
- Sindhi: `Noto Sans Arabic` with locale-tested glyph support.
- Fare, ETA, vehicle plate, and compact data: tabular figures enabled where supported.

Hero-scale type is not used inside operational panels. Fare, ETA, and ride-state values are prominent but sized to remain stable on small devices.

### Glass Materials

Three reusable material levels are permitted:

1. **Navigation glass**: 70-78% light surface opacity, 18-24px backdrop blur, 1px white highlight, low green-gray shadow.
2. **Action glass**: 82-90% opacity, 14-18px blur, used for booking, ride state, payment, and safety controls where readability is critical.
3. **Dark status glass**: deep-green translucent surface with white text, used only for short high-priority status summaries over bright map areas.

Glass panels use an 8px maximum corner radius to match the Tami control system. Nested glass cards are prohibited. Blur is reduced or replaced with an opaque mist surface when the operating system requests reduced transparency, when rendering performance drops, or when contrast cannot be maintained.

### Signature Element

The signature is the **Tami route ribbon**: a thin, animated route-progress line integrated into the top edge of the active bottom sheet. Its stops correspond to pickup requested, driver assigned, driver arrived, trip started, destination reached, and payment completed. It communicates actual ride progress and is not decorative.

## App Structure

The signed-in app has three stable destinations:

- **Book**: map, location selection, fare estimate, booking, and current ride.
- **Trips**: upcoming scheduled rides, active ride recovery, past rides, receipts, ratings, and support links.
- **Account**: profile, saved places, payment methods, safety, support history, language, privacy, and settings.

The bottom navigation uses a liquid-glass bar over the map only. On content-heavy Trips and Account screens, it becomes a nearly opaque action-glass surface for predictable reading.

## Core Screen Design

### Onboarding

Phone, code, city, and profile remain a short staged flow. The civic route ribbon becomes a three-stop progress rail. Inputs use solid action-glass fields rather than transparent fields. Phone submission always exposes loading, retry, and precise network failure states. Profile photo is optional and can be skipped.

### Map and Location Selection

The native MapLibre map fills the viewport. The top glass bar contains city context, profile access, and safety. A compact action-glass composer at the bottom contains pickup and destination. Riders can:

- use current GPS location;
- move a pickup pin;
- search provider-backed addresses and landmarks;
- choose Home, Work, or favorites;
- inspect service-area or city restrictions before continuing.

The web build remains a development preview and does not introduce `maplibre-gl-js`. Android and iOS use the approved public `streets-v2` style URL.

### Ride Options and Fare

The destination selection expands into a draggable action-glass sheet. Categories are horizontally scannable rows with vehicle icon, category name, capacity/eligibility note, ETA, and server-provided fare. Immediate and scheduled modes use a segmented control. Payment uses a provider row with recognizable wallet marks and cash.

The fare summary shows total estimate first, followed by distance/time basis, category or schedule fee, demand multiplier, subsidy/discount, and government cap when applicable. The confirmation action repeats destination, schedule, category, payment method, and final estimate validity window.

### Matching and Active Ride

The active sheet is driven exclusively by backend ride state. The route ribbon and copy change for every normal and exception state. Matching shows cancellability and elapsed wait. Accepted and later states reveal masked driver identity, vehicle plate, ETA, live location, call policy, chat, and safety. Chat is unavailable before `accepted` and read-only after terminal states.

Driver movement is rendered on the map with a clear route line and stale-location indication. HTTP state restoration and retry remain available when real-time delivery is interrupted.

### Chat

Chat opens as a 72% height glass sheet. Messages sit on quiet, high-contrast surfaces; rider and driver messages are differentiated by alignment and restrained color. Quick messages include arrival, waiting, call request, and exact-location request. Sending exposes queued, sent, delivered, failed, and retry states. Message history is server persisted and ride scoped.

### Safety and Support

Safety opens as an opaque action sheet, not transparent glass. It provides emergency contact, trusted-contact trip sharing, incident reporting, driver/vehicle details, and Tami support. Destructive or emergency actions require explicit confirmation while preserving a fast path. Every submitted incident or complaint returns a reference number and support status.

### Payment, Receipt, and Rating

At destination, the active sheet transitions into payment. Cash records collection state; wallets use provider adapters and display pending, paid, failed, refunded, or disputed status. Receipt includes route summary, fare breakdown, payment reference, driver/vehicle, timestamps, and support action. Rating follows completion and can be dismissed without blocking receipt access.

### Trips

Trips has segmented Upcoming and Past views. Upcoming supports scheduled ride detail and policy-controlled cancellation/rescheduling. Past rides are paginated and searchable by date, city, and status. Each trip opens receipt, rating, complaint, dispute, lost-item, and incident actions appropriate to its state.

### Account

Every account row opens a functioning screen. Profile supports photo, name, email, city, and phone display. Saved places supports Home, Work, and favorites. Payment methods lists cash and configured wallets. Settings supports English, Urdu, Sindhi, notification preferences, privacy, accessibility, logout, and session management.

## Architecture and Boundaries

The current monolithic `rider_home_screen.dart` is split by responsibility:

- `features/booking`: location search, pickup pin, categories, estimate, confirmation.
- `features/active_ride`: state presentation, driver tracking, cancellation, payment transition.
- `features/chat`: message history, composer, quick messages, delivery state.
- `features/trips`: upcoming, history, receipt, rating, complaints.
- `features/account`: profile, places, payments, safety, support, settings.
- `ui`: theme tokens, glass material, route ribbon, shared status and error controls.

API clients return typed domain models and never own widget state. The backend is authoritative for cities, categories, service areas, fare estimates, bookings, state, driver/location snapshots, payment status, receipts, messages, and support records. Flutter caches only the minimum needed for session restoration and graceful offline presentation.

## Data Flow

1. Session restore resolves rider, city, current ride, saved places, and configured payment methods.
2. Location permission and map camera resolve pickup; search resolves destination.
3. Pickup, destination, category, schedule, and payment trigger a server fare estimate.
4. Confirmation creates an idempotent booking; server recomputes and persists the estimate policy/version.
5. WebSocket events update ride state, driver location, chat, and payment. HTTP fetches reconcile missed events on reconnect.
6. Terminal payment state produces receipt and rating eligibility; Trips remains the durable record.

## Failure and Recovery

- Every network action has loading, success, precise failure, and retry presentation.
- Booking confirmation uses an idempotency key to prevent duplicate rides.
- Expired fare estimates refresh before booking.
- App restart restores current ride from the server.
- Stale driver location is labeled and never presented as live.
- Wallet pending status survives app closure and is reconciled from the provider/backend.
- Session expiry returns to OTP without silently discarding the current ride reference.
- Unsupported city/service area is explained before confirmation.

## Accessibility and Performance

- Minimum interactive target: 48 logical pixels.
- Text and icons meet WCAG AA contrast on the composited glass background.
- Text scaling is verified through 200%; fare and state containers do not clip.
- Screen readers receive semantic labels for map controls, ride progress, vehicle details, chat delivery, and payment state.
- Reduced motion disables route-ribbon animation and nonessential sheet motion.
- Reduced transparency or low-performance mode replaces blur with opaque surfaces.
- Map, blur, and location updates are profiled on representative mid-range Android hardware and supported iPhones.

## Verification

- Unit tests cover typed clients, fare/ride/payment state presentation, localization, and recovery reducers.
- Widget tests cover onboarding, booking, scheduling, cancellation, state restoration, chat gating, payment, receipts, trips, account, support, and accessibility semantics.
- API tests cover ownership, validation, idempotency, pricing policy, state transitions, payments, receipts, places, chat, and support.
- Integration tests run against a clean PostGIS database and verify migrations.
- End-to-end tests cover immediate ride, scheduled ride, cancellation, accepted chat, payment failure/retry, receipt, rating, and complaint.
- Physical Android and iOS checks verify MapLibre rendering, GPS permission, background/resume recovery, keyboard behavior, screen sizes, and network loss.

## Definition of Done

The rider app is complete only when no visible command is a no-op, all rider records are API backed, the app restores an active ride after restart, every ride state has deliberate UI, fare and payment data are server authoritative, accepted-only chat works end to end, all required support/account/trip flows are functional, Android and iOS device checks pass, and production external providers are configured and certified for the launch environment.
