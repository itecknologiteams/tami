# Tami Rider Development Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add development OTP login, Tami-owned rider sessions, secured profile and booking APIs, and Flutter rider onboarding.

**Architecture:** The NestJS API issues a five-minute development OTP challenge in memory, then persists only hashed 30-day session tokens after verification. The bearer guard resolves an authenticated rider and supplies booking ownership; clients never send rider or city IDs in the public booking body. Flutter uses a small injected API client so widget tests use fakes and device builds can call the local API.

**Tech Stack:** NestJS 11.1.6, TypeScript 5.9.3, Prisma 6.19.2, PostgreSQL/PostGIS, Vitest 3.2.4, Flutter/Dart, `http` Dart package, Flutter Test.

## Global Constraints

- Development OTP is explicit and must be replaced by an SMS provider before public launch.
- OTP codes live only in memory, expire after five minutes, and are returned only by the development endpoint.
- Persist only SHA-256 session token hashes; raw tokens are returned once.
- Bookings derive `riderId` and `cityId` from bearer authentication.
- Keep unit tests independent of PostgreSQL and mobile tests independent of a running API.
- Do not add Firebase, FCM, or H3 in this slice. Evaluate Uber H3 when implementing driver searching and dispatch matching.

---

### Task 1: Add Rider Session Schema and Auth Domain

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/auth/auth.types.ts`
- Create: `apps/api/src/auth/development-otp-store.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Produces `RiderSession`, `AuthService.requestOtp(phone)`, and `AuthService.verifyRider(request)`.
- Produces `AuthenticatedRider { id, cityId, phone }` and an opaque access token.

- [x] **Step 1: Write failing OTP/session tests**

```ts
it("issues a five-minute development code and exchanges it for a hashed session", async () => {
  const challenge = await service.requestOtp("+923001234567");
  const result = await service.verifyRider({
    challengeId: challenge.challengeId,
    code: challenge.developmentCode,
    cityId: "city_karachi",
  });

  expect(result.rider.phone).toBe("+923001234567");
  expect(repository.sessions[0].tokenHash).not.toBe(result.accessToken);
});
```

- [x] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @tami/api exec vitest run src/auth/auth.service.spec.ts`

Expected: FAIL because `AuthService` does not exist.

- [x] **Step 3: Implement the schema and minimal auth domain**

```prisma
model RiderSession {
  id         String    @id @default(cuid())
  riderId    String
  tokenHash  String    @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())

  rider Rider @relation(fields: [riderId], references: [id], onDelete: Cascade)
}
```

Use `randomInt(100000, 1000000)` for the code, `randomBytes(32).toString("base64url")` for the raw token, and `createHash("sha256")` for stored tokens.

- [x] **Step 4: Run the focused test**

Run: `pnpm --filter @tami/api exec vitest run src/auth/auth.service.spec.ts`

Expected: PASS.

### Task 2: Expose Auth and Rider Profile APIs

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.controller.spec.ts`
- Create: `apps/api/src/auth/rider-auth.guard.ts`
- Create: `apps/api/src/riders/rider-profile.service.ts`
- Create: `apps/api/src/riders/rider-profile.controller.ts`
- Create: `apps/api/src/riders/rider-profile.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces `POST /auth/rider/otp`, `POST /auth/rider/verify`, `GET /rider/me`, and `PUT /rider/me`.
- The guard attaches `AuthenticatedRider` after validating `Authorization: Bearer <token>`.

- [x] **Step 1: Write failing controller/profile tests**

```ts
it("returns the authenticated rider profile", async () => {
  await expect(controller.getMe(authenticatedRider)).resolves.toEqual(
    expect.objectContaining({ id: "rider_123", cityId: "city_karachi" }),
  );
});
```

- [x] **Step 2: Run tests and verify they fail**

Run: `pnpm --filter @tami/api exec vitest run src/auth/auth.controller.spec.ts src/riders/rider-profile.service.spec.ts`

Expected: FAIL because the controllers and profile service do not exist.

- [x] **Step 3: Implement token guard and profile endpoints**

The guard rejects missing, expired, and revoked sessions with HTTP 401. The profile endpoint only permits city, name, email, and image URL updates; it rejects inactive cities.

- [x] **Step 4: Run API unit tests**

Run: `pnpm --filter @tami/api test`

Expected: PASS.

### Task 3: Secure Booking Ownership

**Files:**
- Modify: `apps/api/src/bookings/booking.types.ts`
- Modify: `apps/api/src/bookings/booking.controller.ts`
- Modify: `apps/api/src/bookings/booking.controller.spec.ts`
- Modify: `apps/api/src/bookings/booking.service.spec.ts`

**Interfaces:**
- Public `CreateRideRequest` excludes `cityId` and `riderId`.
- Internal booking request combines public data with `AuthenticatedRider`.

- [x] **Step 1: Write the failing authenticated booking test**

```ts
it("uses identity from the bearer session rather than the request body", async () => {
  const ride = await controller.createRide(authenticatedRider, bookingRequest);

  expect(ride.riderId).toBe("rider_123");
  expect(ride.cityId).toBe("city_karachi");
});
```

- [x] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @tami/api exec vitest run src/bookings/booking.controller.spec.ts`

Expected: FAIL because caller-supplied identity is still required.

- [x] **Step 3: Implement the guarded endpoint and update tests**

Use `@UseGuards(RiderAuthGuard)` on `POST /bookings/rides`; combine the authenticated rider with pickup, destination, category, and optional schedule before calling `BookingService`.

- [x] **Step 4: Run API tests and typecheck**

Run: `pnpm --filter @tami/api test && pnpm --filter @tami/api typecheck`

Expected: PASS.

### Task 4: Create the Session Migration and Database Integration Test

**Files:**
- Create: `apps/api/prisma/migrations/20260710130000_rider_sessions/migration.sql`
- Create: `apps/api/src/auth/auth.integration.spec.ts`
- Modify: `apps/api/package.json`

- [x] **Step 1: Create the migration**

Run: `cd apps/api && DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" pnpm exec prisma migrate dev --schema prisma/schema.prisma --name rider_sessions`

Expected: Prisma creates the session migration and updates its client.

- [x] **Step 2: Write and run the database integration test**

```ts
it("persists a hashed session that authenticates a rider-owned booking", async () => {
  const session = await authService.verifyRider(verifiedOtpRequest);
  const ride = await bookingController.createRideFromToken(session.accessToken, bookingRequest);

  expect(ride.riderId).toBe(session.rider.id);
  expect(storedSession.tokenHash).not.toBe(session.accessToken);
});
```

Run: `DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" RUN_DATABASE_TESTS=true pnpm --filter @tami/api test:integration`

Expected: PASS.

### Task 5: Add Flutter Rider Onboarding and API Client

**Files:**
- Modify: `apps/mobile/pubspec.yaml`
- Create: `apps/mobile/lib/src/auth/rider_identity_client.dart`
- Create: `apps/mobile/lib/src/auth/rider_session.dart`
- Create: `apps/mobile/lib/src/auth/rider_onboarding_screen.dart`
- Modify: `apps/mobile/lib/src/app/tami_mobile_app.dart`
- Modify: `apps/mobile/lib/main_rider.dart`
- Create: `apps/mobile/test/rider_onboarding_screen_test.dart`

- [x] **Step 1: Write the failing onboarding test**

```dart
testWidgets('shows rider home after code verification and profile save', (tester) async {
  await tester.pumpWidget(TamiMobileApp(
    mode: TamiAppMode.rider,
    riderIdentityClient: FakeRiderIdentityClient(),
  ));

  expect(find.text('Verify your phone'), findsOneWidget);
});
```

- [x] **Step 2: Implement the injected API client and session model**

Use `package:http` for `POST /auth/rider/otp`, `POST /auth/rider/verify`, `GET /rider/me`, and `PUT /rider/me`. The client sends its Tami bearer token for profile calls and is replaceable with a fake in tests.

- [x] **Step 3: Implement onboarding flow**

Present phone, code, active-city, name, optional email, and optional image URL fields in sequence. Show the development code only when the API returns it. Navigate to `RiderHomeScreen` after profile save.

- [x] **Step 4: Run Flutter checks**

Run: `cd apps/mobile && flutter pub get && flutter test && flutter analyze`

Expected: PASS.

### Task 6: Document and Verify the Slice

**Files:**
- Modify: `README.md`
- Modify: `tech_stack.md`

- [x] **Step 1: Document development authentication**

Document the local OTP endpoints, the `127.0.0.1:5434` database workflow, and that H3 assessment belongs to the dispatch/matching plan.

- [x] **Step 2: Run full verification**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm lint && pnpm mobile:test && pnpm mobile:analyze`

Expected: all commands exit 0.

- [ ] **Step 3: Commit the completed slice**

```bash
git add apps/api apps/mobile README.md tech_stack.md docs/superpowers
git commit -m "feat: add rider development identity"
```
