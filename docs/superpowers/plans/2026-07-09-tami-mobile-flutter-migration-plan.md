# Tami Mobile Flutter Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the transitional React Native rider and driver app scaffolds with one Flutter mobile codebase that builds the rider app for Android/iOS and the driver app for Android infotainment.

**Architecture:** Create a single Flutter project at `apps/mobile` with shared Dart code and separate rider/driver entry points. Keep the backend, admin web app, and TypeScript shared package intact; mobile will consume API contracts through generated or hand-written Dart models until contract generation is introduced.

**Tech Stack:** Flutter, Dart, Material 3, app flavors or separate Dart entry points, Flutter test, MapLibre-compatible Flutter mapping package to be finalized before map screen implementation.

## Global Constraints

- Follow `tech_stack.md`.
- Use Flutter/Dart for rider and driver mobile apps.
- Use one shared mobile codebase under `apps/mobile`.
- Rider app must support Android and iOS.
- Driver app must support Android-only infotainment deployment.
- Use MapLibre-based public maps.
- Use the requested `streets-v2` style family.
- Do not use React Native for new mobile development.
- Do not introduce `maplibre-gl-js` for mobile.
- Keep strict ride state terminology aligned with `packages/shared`.

---

## Task 1: Remove Transitional React Native Mobile Scaffolds

**Files:**
- Delete: `apps/rider`
- Delete: `apps/driver`
- Modify: `pnpm-workspace.yaml` only if needed after removal.
- Modify: `README.md`

**Steps:**

- [ ] Delete `apps/rider`.
- [ ] Delete `apps/driver`.
- [ ] Run `pnpm install`.
- [ ] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm lint`.
- [ ] Commit with `chore: remove react native mobile scaffolds`.

## Task 2: Create Flutter Mobile Project

**Files:**
- Create: `apps/mobile/pubspec.yaml`
- Create: `apps/mobile/analysis_options.yaml`
- Create: `apps/mobile/lib/main_rider.dart`
- Create: `apps/mobile/lib/main_driver.dart`
- Create: `apps/mobile/lib/src/app/tami_mobile_app.dart`
- Create: `apps/mobile/lib/src/features/rider/rider_home_screen.dart`
- Create: `apps/mobile/lib/src/features/driver/driver_home_screen.dart`
- Create: `apps/mobile/test/rider_home_screen_test.dart`
- Create: `apps/mobile/test/driver_home_screen_test.dart`

**Steps:**

- [ ] Create a Flutter project under `apps/mobile`.
- [ ] Add rider and driver entry points.
- [ ] Add a shared `TamiMobileApp` widget that accepts an app mode.
- [ ] Add rider home screen text: `Book a Tami ride`.
- [ ] Add driver home screen text: `Tami Driver`.
- [ ] Add Flutter widget tests for both entry flows.
- [ ] Run `flutter test`.
- [ ] Run `flutter analyze`.
- [ ] Commit with `feat: scaffold flutter mobile app`.

## Task 3: Add Mobile Domain Models

**Files:**
- Create: `apps/mobile/lib/src/domain/ride_state.dart`
- Create: `apps/mobile/test/ride_state_test.dart`

**Steps:**

- [ ] Implement Dart ride state enum values matching `packages/shared/src/ride-states.ts`.
- [ ] Implement allowed transition checks matching `packages/shared/src/ride-state-machine.ts`.
- [ ] Add tests for normal lifecycle, invalid backward transition, and cancellation states.
- [ ] Run `flutter test`.
- [ ] Run `flutter analyze`.
- [ ] Commit with `feat: add flutter ride state domain`.

## Task 4: Select Flutter MapLibre Package

**Files:**
- Modify: `tech_stack.md`
- Modify: `apps/mobile/pubspec.yaml`
- Create: `apps/mobile/lib/src/maps/map_config.dart`
- Create: `apps/mobile/test/map_config_test.dart`

**Steps:**

- [ ] Evaluate current Flutter MapLibre package options.
- [ ] Choose one package and record it in `tech_stack.md`.
- [ ] Add dependency to `apps/mobile/pubspec.yaml`.
- [ ] Add map config with provider `maplibre_public` and style id `streets-v2`.
- [ ] Add a test ensuring the mobile map config does not reference `maplibre-gl-js`.
- [ ] Run `flutter test`.
- [ ] Run `flutter analyze`.
- [ ] Commit with `feat: add flutter map provider config`.

## Task 5: Update Development Commands

**Files:**
- Modify: `README.md`
- Modify: root `package.json` only if a wrapper script is useful.

**Steps:**

- [ ] Document backend/admin commands with pnpm.
- [ ] Document mobile commands with Flutter:
  - `cd apps/mobile && flutter pub get`
  - `cd apps/mobile && flutter test`
  - `cd apps/mobile && flutter analyze`
  - rider Android build command
  - rider iOS build command
  - driver Android build command
- [ ] Run documented verification commands.
- [ ] Commit with `docs: document flutter mobile workflow`.

## Self-Review Notes

- This plan intentionally does not implement booking, chat, navigation, or payment screens.
- This plan exists to correct the mobile technology direction before real mobile feature work starts.
- Backend and admin work from the foundation branch remains valid.
- The React Native mobile scaffolds should be treated as throwaway transitional code.

