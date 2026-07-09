# Tami Data Spine and Booking API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first persistent data model and booking API foundation for Tami Hailing.

**Architecture:** Keep the backend as a NestJS modular monolith. Add Prisma/PostgreSQL schema and seed data for core platform entities, then implement testable domain services around in-memory repositories so booking behavior is verified before a live database is required.

**Tech Stack:** NestJS 11.1.6, TypeScript 5.9.3, Prisma 6.19.2, PostgreSQL/PostGIS target, Vitest 3.2.4.

## Global Constraints

- Multi-city Sindh support from day one.
- Central operations team for first launch.
- Strict ride state machine.
- Dynamic pricing and payments are not implemented in this slice.
- Use Prisma 6.19.2 because Prisma 7 moves datasource URLs out of `schema.prisma`.
- Keep live database access out of unit tests.
- Backend remains API-first and modular.

---

## Task 1: Add Prisma Schema and Seed Data

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/.env.example`
- Modify: `apps/api/package.json`
- Modify: `tech_stack.md`

**Steps:**
- Add Prisma 6.19.2 and `@prisma/client` 6.19.2.
- Add a PostgreSQL schema with core models: `City`, `Zone`, `RideCategory`, `Rider`, `Driver`, `Vehicle`, `Ride`, `RideStateTransition`, and `PaymentRecord`.
- Add enums for ride state, ride category code, payment method, and payment status.
- Add seed data for Karachi, Hyderabad, Sukkur, Larkana, and Mirpur Khas plus initial ride categories.
- Run `DATABASE_URL=postgresql://tami:tami@localhost:5432/tami pnpm --filter @tami/api prisma:validate`.
- Commit with `feat: add prisma data spine`.

## Task 2: Add Platform Config API

**Files:**
- Create: `apps/api/src/platform/platform-config.service.ts`
- Create: `apps/api/src/platform/platform-config.controller.ts`
- Create: `apps/api/src/platform/platform-config.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Steps:**
- Write a failing service test that expects Sindh cities and starter categories.
- Implement a static config service for bootstrap clients.
- Expose `GET /platform/config`.
- Run API tests and typecheck.
- Commit with `feat: add platform config api`.

## Task 3: Add Booking Domain Service

**Files:**
- Create: `apps/api/src/bookings/booking.types.ts`
- Create: `apps/api/src/bookings/booking.repository.ts`
- Create: `apps/api/src/bookings/in-memory-booking.repository.ts`
- Create: `apps/api/src/bookings/booking.service.ts`
- Create: `apps/api/src/bookings/booking.service.spec.ts`

**Steps:**
- Write failing tests for immediate and scheduled ride creation.
- Implement booking service that creates rides in `requested` state.
- Persist an initial `requested` ride state transition with actor `rider`.
- Keep repository in-memory for unit tests.
- Run API tests and typecheck.
- Commit with `feat: add booking domain service`.

## Task 4: Add Booking API Controller

**Files:**
- Create: `apps/api/src/bookings/booking.controller.ts`
- Create: `apps/api/src/bookings/booking.controller.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Steps:**
- Write a failing controller test for `createRide`.
- Add `POST /bookings/rides`.
- Return ride ID, state, city ID, category code, pickup, destination, and scheduled pickup time.
- Run API tests, typecheck, and build.
- Commit with `feat: add booking api controller`.

## Task 5: Update Docs and Verify

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-09-tami-data-spine-booking-api-plan.md`

**Steps:**
- Document Prisma validation and seed commands.
- Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm mobile:test`, and `pnpm mobile:analyze`.
- Commit with `docs: document data spine workflow`.

