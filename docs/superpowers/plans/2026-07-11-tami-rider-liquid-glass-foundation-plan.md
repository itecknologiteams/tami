# Tami Rider Liquid Glass Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the approved balanced civic liquid-glass design system and apply it to the rider onboarding, map-first booking shell, navigation, ride options, active ride, and chat surfaces without changing existing API behavior.

**Architecture:** Introduce a focused `ui` package for theme tokens and reusable glass materials, then split the current 1,000-line rider home screen by feature responsibility. Existing injected clients and public widget contracts remain intact so current tests continue to protect booking, cancellation, scheduling, and accepted-only chat behavior.

**Tech Stack:** Flutter/Dart, Material 3, `BackdropFilter`, MapLibre Flutter Native, Flutter Test, golden/visual browser checks.

## Global Constraints

- Use Flutter for Android and iOS and do not introduce `maplibre-gl-js`.
- Keep MapLibre as the full-viewport map ground.
- Use `civicGreen #006C5B`, `deepGreen #123C34`, `signalYellow #F2BC3D`, `routeCyan #2C9FA3`, `mist #E7F0EC`, `paper #F8FBF9`, `danger #B42318`, and `ink #18302B`.
- Glass panels use at most 8px corner radius and must preserve WCAG AA composited contrast.
- Support reduced transparency and reduced motion with opaque fallbacks.
- Keep minimum interactive targets at 48 logical pixels.
- Preserve every existing booking, scheduling, cancellation, state, and chat test behavior.
- Do not add fake backend data or broaden API contracts in this visual foundation slice.

---

### Task 1: Protect the Current Rider Vertical Slice

**Files:**
- Create: `apps/api/src/chat/ride-chat.controller.spec.ts`
- Modify: `apps/api/src/bookings/booking.controller.spec.ts`
- Test: `apps/mobile/test/rider_home_screen_test.dart`
- Stabilize and commit: current uncommitted API chat/cancellation, Flutter booking/map/shell, migration, web-preview, and documentation files.

**Interfaces:**
- Consumes existing `BookingController.cancelRide`, `RideChatController.listMessages`, and `RideChatController.sendMessage`.
- Produces regression coverage for rider ownership and accepted-only chat before the UI is split.

- [ ] **Step 1: Add controller tests for chat ownership and pre-acceptance rejection**

Create controller tests using an `InMemoryBookingRepository` and in-memory chat repository. Assert that `sendMessage` succeeds for an accepted rider-owned ride and rejects a requested ride with `Chat is available after the driver accepts the ride`.

- [ ] **Step 2: Run the focused API tests**

Run: `pnpm --filter @tami/api exec vitest run src/chat/ride-chat.controller.spec.ts src/bookings/booking.controller.spec.ts`

Expected: all focused tests pass after the controller test fixture is wired correctly.

- [ ] **Step 3: Run the existing Flutter rider tests**

Run: `cd apps/mobile && flutter test test/rider_home_screen_test.dart test/rider_shell_test.dart test/rider_onboarding_screen_test.dart`

Expected: all existing rider tests pass before refactoring.

- [ ] **Step 4: Remove generated preview artifacts and commit the stabilized vertical slice**

```bash
git add README.md tech_stack.md apps/api apps/mobile docs/superpowers/plans
git commit -m "feat: add rider map booking and accepted chat"
```

### Task 2: Add Civic Theme and Glass Material Primitives

**Files:**
- Create: `apps/mobile/lib/src/ui/tami_colors.dart`
- Create: `apps/mobile/lib/src/ui/tami_theme.dart`
- Create: `apps/mobile/lib/src/ui/tami_glass.dart`
- Create: `apps/mobile/lib/src/ui/tami_route_ribbon.dart`
- Create: `apps/mobile/test/tami_glass_test.dart`
- Modify: `apps/mobile/lib/src/app/tami_mobile_app.dart`

**Interfaces:**
- Produces `TamiColors`, `buildTamiTheme()`, `TamiGlass`, `TamiGlassLevel`, and `TamiRouteRibbon`.
- `TamiGlass` accepts `child`, `level`, `padding`, `borderRadius`, and optional `semanticLabel`.
- `TamiRouteRibbon` accepts `currentStep`, `steps`, and `animate`.

- [ ] **Step 1: Write failing primitive widget tests**

Test that `TamiGlass(level: TamiGlassLevel.action)` renders a `BackdropFilter`, constrains radius to 8, provides an opaque surface when `MediaQueryData.disableAnimations` is true, and preserves its semantic label. Test route ribbon active/completed/inactive segment keys.

- [ ] **Step 2: Run the primitive tests and verify failure**

Run: `cd apps/mobile && flutter test test/tami_glass_test.dart`

Expected: FAIL because the `ui` primitives do not exist.

- [ ] **Step 3: Implement exact theme tokens and primitives**

Define the eight approved colors, Material 3 input/button/navigation themes, 48px minimum controls, and no radius above 8px. Implement glass with `ClipRRect`, `BackdropFilter(ImageFilter.blur)`, a composited translucent fill, 1px highlight border, and opaque reduced-motion fallback. Implement the route ribbon as stable `Expanded` segments keyed `route-ribbon-segment-<index>`.

- [ ] **Step 4: Apply the theme at the app root**

Replace `ColorScheme.fromSeed` in `TamiMobileApp` with `buildTamiTheme()` and keep rider/driver entry points unchanged.

- [ ] **Step 5: Run tests and analysis**

Run: `cd apps/mobile && flutter test test/tami_glass_test.dart && flutter analyze`

Expected: PASS with no analyzer issues.

- [ ] **Step 6: Commit the UI foundation**

```bash
git add apps/mobile/lib/src/ui apps/mobile/lib/src/app/tami_mobile_app.dart apps/mobile/test/tami_glass_test.dart
git commit -m "feat: add tami liquid glass design system"
```

### Task 3: Split the Rider Booking Surface by Responsibility

**Files:**
- Create: `apps/mobile/lib/src/features/rider/booking/tami_place.dart`
- Create: `apps/mobile/lib/src/features/rider/booking/destination_search_sheet.dart`
- Create: `apps/mobile/lib/src/features/rider/booking/ride_options_sheet.dart`
- Create: `apps/mobile/lib/src/features/rider/active_ride/active_ride_panel.dart`
- Create: `apps/mobile/lib/src/features/rider/chat/ride_chat_sheet.dart`
- Modify: `apps/mobile/lib/src/features/rider/rider_home_screen.dart`
- Test: `apps/mobile/test/rider_home_screen_test.dart`

**Interfaces:**
- Preserve public `RiderHomeScreen`, `TamiPlace`, `RiderBookingClient`, and `RiderChatClient` test contracts.
- Produce `DestinationSearchSheet`, `RideOptionsSheet`, `RideSelection`, `ActiveRidePanel`, and `RideChatSheet` with callback-driven APIs.

- [ ] **Step 1: Add a public-contract regression test**

Add a widget test proving an injected `initialRide` and `initialDestination` still render accepted ride state and expose chat without relying on private widgets.

- [ ] **Step 2: Run the rider test and verify it passes before movement**

Run: `cd apps/mobile && flutter test test/rider_home_screen_test.dart`

Expected: PASS, establishing the refactor baseline.

- [ ] **Step 3: Move place and destination search code**

Move `TamiPlace`, destination fixtures, search filtering, and the destination sheet into `booking/` while keeping the same keys and visible strings required by tests.

- [ ] **Step 4: Move ride options and schedule code**

Move category/payment enums, `RideSelection`, estimate presentation, date/time selection, and confirmation into `ride_options_sheet.dart`. Keep callback behavior unchanged; server pricing replaces constants in a later backend milestone.

- [ ] **Step 5: Move active ride and chat code**

Move state headings, chat gating, cancellation action, message loading, and sending into `active_ride/` and `chat/`. Preserve accepted-only chat behavior and error copy.

- [ ] **Step 6: Reduce `RiderHomeScreen` to orchestration**

Leave map composition, client/session coordination, destination selection, booking request, cancellation, and modal opening in `RiderHomeScreen`. Target fewer than 350 lines.

- [ ] **Step 7: Run the full mobile suite**

Run: `cd apps/mobile && flutter test && flutter analyze`

Expected: all current tests pass with no analyzer issues.

- [ ] **Step 8: Commit the feature split**

```bash
git add apps/mobile/lib/src/features/rider apps/mobile/test/rider_home_screen_test.dart
git commit -m "refactor: split rider booking experience"
```

### Task 4: Apply Liquid Glass to Onboarding and Rider Shell

**Files:**
- Modify: `apps/mobile/lib/src/auth/rider_onboarding_screen.dart`
- Modify: `apps/mobile/lib/src/features/rider/rider_shell.dart`
- Create: `apps/mobile/lib/src/features/rider/trips/rider_trips_screen.dart`
- Create: `apps/mobile/lib/src/features/rider/account/rider_account_screen.dart`
- Test: `apps/mobile/test/rider_onboarding_screen_test.dart`
- Test: `apps/mobile/test/rider_shell_test.dart`

**Interfaces:**
- Preserve `RiderOnboardingScreen(client, bookingClient, chatClient)` and `RiderShell(session, bookingClient, chatClient)`.
- Produce dedicated Trips and Account screens while retaining their current data limitations until their API milestone.

- [ ] **Step 1: Extend tests for glass and navigation semantics**

Assert onboarding contains a semantic route ribbon, the primary action remains reachable, the shell navigation has Book/Trips/Account destinations, and text scaling to 2.0 does not overflow at 390x844.

- [ ] **Step 2: Run tests and verify the new expectations fail**

Run: `cd apps/mobile && flutter test test/rider_onboarding_screen_test.dart test/rider_shell_test.dart`

Expected: FAIL because the screens do not use the new glass/ribbon primitives.

- [ ] **Step 3: Restyle onboarding**

Use paper/mist background, civic route ribbon, action-glass input area, precise loading/error states, and a stable bottom primary action. Keep OTP behavior and development code visibility unchanged.

- [ ] **Step 4: Restyle and split the shell**

Use navigation glass on the map and action glass on content screens. Move Trips and Account into dedicated files, remove the inline temporary screen classes, and keep existing labels and navigation behavior.

- [ ] **Step 5: Run tests and analysis**

Run: `cd apps/mobile && flutter test test/rider_onboarding_screen_test.dart test/rider_shell_test.dart && flutter analyze`

Expected: PASS without overflow exceptions.

- [ ] **Step 6: Commit the shell redesign**

```bash
git add apps/mobile/lib/src/auth apps/mobile/lib/src/features/rider apps/mobile/test
git commit -m "feat: apply liquid glass rider shell"
```

### Task 5: Apply the Map-First Booking and Active-Ride Visual System

**Files:**
- Modify: `apps/mobile/lib/src/features/rider/rider_home_screen.dart`
- Modify: `apps/mobile/lib/src/features/rider/booking/destination_search_sheet.dart`
- Modify: `apps/mobile/lib/src/features/rider/booking/ride_options_sheet.dart`
- Modify: `apps/mobile/lib/src/features/rider/active_ride/active_ride_panel.dart`
- Modify: `apps/mobile/lib/src/features/rider/chat/ride_chat_sheet.dart`
- Test: `apps/mobile/test/rider_home_screen_test.dart`

**Interfaces:**
- Consumes `TamiGlass`, `TamiRouteRibbon`, and existing booking/chat clients.
- Preserves all booking keys: `rider-map`, `destination-trigger`, `destination-search`, `schedule-picker`, `chat-input`, and `send-chat`.

- [ ] **Step 1: Add visual-structure widget assertions**

Assert the map remains full-screen, top controls use navigation glass, booking/active sheets use action glass, accepted state includes the route ribbon and chat, and requested state retains progress and cancellation.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd apps/mobile && flutter test test/rider_home_screen_test.dart`

Expected: FAIL on glass/ribbon expectations.

- [ ] **Step 3: Implement the map overlay hierarchy**

Use compact navigation-glass city and safety controls at the top. Use one action-glass bottom composer with stable dimensions. Keep the map unframed and visible around controls.

- [ ] **Step 4: Implement the booking sheet hierarchy**

Apply action glass, compact category choices, Now/Later segmented control, payment selector, readable fare summary, and one dominant confirm action. Do not add nested cards.

- [ ] **Step 5: Implement active ride and chat visuals**

Add the route ribbon, state-appropriate dark/action glass, stable status typography, clear chat/safety/cancel actions, and high-contrast message surfaces.

- [ ] **Step 6: Run mobile tests and analysis**

Run: `cd apps/mobile && flutter test && flutter analyze`

Expected: PASS.

- [ ] **Step 7: Commit the rider visual system**

```bash
git add apps/mobile/lib/src/features/rider apps/mobile/test
git commit -m "feat: redesign rider map and trip surfaces"
```

### Task 6: Build and Visually Verify the Preview

**Files:**
- Modify: `apps/mobile/README.md` only if preview commands change.
- Generated but do not commit: `apps/mobile/build/web` and Playwright screenshots.

**Interfaces:**
- Produces a browser preview at `http://127.0.0.1:4174` using the non-GL map fallback.

- [ ] **Step 1: Run complete checks**

Run: `cd apps/mobile && flutter test && flutter analyze`

Run: `pnpm --filter @tami/api test && pnpm --filter @tami/api typecheck`

Expected: all commands exit 0.

- [ ] **Step 2: Build the browser preview**

Run: `cd apps/mobile && flutter build web --target lib/main_rider.dart --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000`

Expected: `build/web` is produced without `maplibre-gl-js` integration.

- [ ] **Step 3: Verify desktop and mobile viewports**

Inspect 390x844, 430x932, and 1200x811 screenshots. Verify no overlap, clipping, unreadable composited text, layout shift, blank map, or inaccessible primary action. Confirm reduced-motion and text-scale 2.0 behavior in widget tests.

- [ ] **Step 4: Remove generated artifacts**

Remove only screenshots and `.playwright-mcp` files generated during this task. Preserve source and user-owned artifacts.

- [ ] **Step 5: Commit documentation adjustments if required**

```bash
git add apps/mobile/README.md
git commit -m "docs: update rider preview workflow"
```

## Completion Gate

This foundation plan is complete when the existing rider behavior remains green, the approved liquid-glass primitives are reusable and accessible, onboarding and all current rider surfaces use them consistently, `rider_home_screen.dart` is split into focused modules, and browser/mobile viewport checks prove the interface is readable and stable. Completion of this plan does not mark the full rider product complete; execution continues with `2026-07-11-tami-rider-completion-plan.md` for authoritative data, live rides, payments, trips, support, localization, and release readiness.
