# Tami Hailing

Government mobility platform for a multi-city electric taxi service across Sindh.

## Current Development Slice

This repository starts with the foundation for:

- Rider mobile app
- Driver Android infotainment app
- Admin command center
- Backend API
- Shared ride state and map domain logic

## Setup

```bash
pnpm install
```

## Common Commands

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

## Stack Guardrails

Read `tech_stack.md` before adding new frameworks, map libraries, payment providers, or backend services.

## Product Design

The approved platform design is in `docs/superpowers/specs/2026-07-09-tami-hailing-government-mobility-design.md`.

## First Implementation Plan

The first implementation plan is in `docs/superpowers/plans/2026-07-09-tami-foundation-core-mvp-implementation-plan.md`.

## Mobile Direction

Mobile apps are planned in Flutter/Dart from one shared codebase. The Flutter migration plan is in `docs/superpowers/plans/2026-07-09-tami-mobile-flutter-migration-plan.md`.

## Mobile Commands

```bash
cd apps/mobile && flutter pub get
cd apps/mobile && flutter test
cd apps/mobile && flutter analyze
```

From the repository root:

```bash
pnpm mobile:test
pnpm mobile:analyze
```

Build entry points:

```bash
cd apps/mobile && flutter build apk --target lib/main_rider.dart
cd apps/mobile && flutter build ios --target lib/main_rider.dart
cd apps/mobile && flutter build apk --target lib/main_driver.dart
```

The rider app targets Android and iOS. The driver app targets Android infotainment devices.
