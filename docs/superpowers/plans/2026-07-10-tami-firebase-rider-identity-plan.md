# Tami Firebase Rider Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authenticate Flutter riders with Firebase phone verification and issue Tami-owned sessions that secure rider profile and booking APIs.

**Architecture:** Flutter verifies a phone number with Firebase before exchanging proof with the NestJS API. The API verifies Firebase Phone Auth ID tokens or Firebase PNV proofs through a provider interface, creates or reuses a city-scoped rider, and persists only a hashed Tami session token. Android PNV is isolated behind a platform channel; Firebase Phone Auth is the cross-platform fallback.

**Tech Stack:** Flutter/Dart, `firebase_core`, `firebase_auth`, Android Kotlin Firebase PNV SDK, NestJS 11.1.6, Prisma 6.19.2, `firebase-admin`, PostgreSQL/PostGIS, Vitest, Flutter Test.

## Global Constraints

- Rider app remains Flutter for Android and iOS.
- Firebase PNV is Android-only and only used after a device/carrier support check.
- Firebase Phone Auth SMS is the fallback for Android and iOS.
- FCM is not an OTP delivery mechanism; reserve it for later ride and dispatch notifications.
- The Tami API remains the source of truth for rider profile, city, booking ownership, and session revocation.
- Never commit `google-services.json`, `GoogleService-Info.plist`, Firebase service-account credentials, PNV test tokens, or Tami session tokens.
- Keep unit tests independent of Firebase services and a live database.

---

## External Firebase Setup

The project owner completes these Firebase Console steps before device verification can run:

- Create or assign the Tami Firebase project and provide its project ID.
- Register Android and iOS apps with the Tami bundle/package IDs.
- Enable Firebase Authentication Phone provider and configure its SMS region policy for Pakistan.
- Add Android SHA-1/SHA-256 values and upload the iOS APNs authentication key in Firebase Cloud Messaging.
- Enable Firebase Phone Number Verification, billing, and OAuth brand verification for PNV production; grant the development team the PNV Admin IAM role for test tokens.
- Provide local-only `google-services.json`, `GoogleService-Info.plist`, generated `firebase_options.dart`, and an API service-account credential through the secure team secret channel.

### Task 1: Add Session Storage and Firebase Proof Boundary

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/auth/firebase-proof-verifier.ts`
- Create: `apps/api/src/auth/firebase-proof-verifier.spec.ts`
- Create: `apps/api/src/auth/auth.types.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces `FirebaseProofVerifier.verify(input): Promise<VerifiedFirebasePhone>`.
- Produces `RiderSession` with `tokenHash`, `expiresAt`, `revokedAt`, and `lastUsedAt`.

- [ ] **Step 1: Write the failing proof-verifier contract test**

```ts
it("rejects a Firebase proof whose verified phone is missing", async () => {
  const verifier = new FirebaseProofVerifier(fakeFirebaseAdminWithoutPhone);

  await expect(
    verifier.verify({ method: "firebase_phone_auth", proof: "id-token" }),
  ).rejects.toThrow("Firebase proof does not include a phone number");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @tami/api exec vitest run src/auth/firebase-proof-verifier.spec.ts`

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Add the session model and verifier types**

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

```ts
export type FirebaseVerificationMethod =
  | "firebase_phone_auth"
  | "firebase_pnv";

export type VerifiedFirebasePhone = {
  phone: string;
  firebaseUid: string | null;
};
```

- [ ] **Step 4: Implement the minimal verifier and run its test**

The Phone Auth implementation uses Firebase Admin `verifyIdToken` and requires a verified `phone_number` claim. The PNV implementation verifies the signed PNV token according to Firebase's server-token verification requirements. Both return `VerifiedFirebasePhone` and neither creates a session.

Run: `pnpm --filter @tami/api exec vitest run src/auth/firebase-proof-verifier.spec.ts`

Expected: PASS.

### Task 2: Exchange Firebase Proof for a Tami Session

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/auth/auth.controller.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes `FirebaseProofVerifier.verify` and `PrismaService`.
- Produces `POST /auth/rider/verify` returning `{ accessToken, rider }`.

- [ ] **Step 1: Write the failing session-exchange test**

```ts
it("creates a city-scoped rider and hashed session from Firebase proof", async () => {
  const result = await service.verifyRider({
    verificationMethod: "firebase_phone_auth",
    firebaseProof: "id-token",
    cityId: "city_karachi",
  });

  expect(result.accessToken).toEqual(expect.any(String));
  expect(repository.sessions[0].tokenHash).not.toBe(result.accessToken);
  expect(result.rider.phone).toBe("+923001234567");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @tami/api exec vitest run src/auth/auth.service.spec.ts`

Expected: FAIL because `AuthService` does not exist.

- [ ] **Step 3: Implement rider/session exchange**

Use `randomBytes(32).toString("base64url")` for the raw token and `createHash("sha256")` for stored token hashes. Reject inactive cities and issue sessions with a 30-day expiry. Reuse riders by unique phone number and update their selected active city on verified login.

- [ ] **Step 4: Add the controller contract and test it**

```ts
@Post("rider/verify")
verifyRider(@Body() request: VerifyRiderRequest) {
  return this.authService.verifyRider(request);
}
```

- [ ] **Step 5: Run API unit tests**

Run: `pnpm --filter @tami/api test`

Expected: PASS without Firebase credentials or a running database.

### Task 3: Secure Rider Profile and Booking Ownership

**Files:**
- Create: `apps/api/src/auth/rider-auth.guard.ts`
- Create: `apps/api/src/riders/rider-profile.service.ts`
- Create: `apps/api/src/riders/rider-profile.controller.ts`
- Create: `apps/api/src/riders/rider-profile.service.spec.ts`
- Modify: `apps/api/src/bookings/booking.controller.ts`
- Modify: `apps/api/src/bookings/booking.types.ts`
- Modify: `apps/api/src/bookings/booking.controller.spec.ts`

**Interfaces:**
- Produces `AuthenticatedRider { id, cityId, phone }` from a bearer token.
- Produces `GET /rider/me`, `PUT /rider/me`, and authenticated `POST /bookings/rides`.

- [ ] **Step 1: Write the failing guarded-booking controller test**

```ts
it("creates a booking with the city and rider from the session", async () => {
  const ride = await controller.createRide(
    authenticatedRider,
    bookingRequestWithoutRiderOrCity,
  );

  expect(ride.cityId).toBe(authenticatedRider.cityId);
  expect(ride.riderId).toBe(authenticatedRider.id);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @tami/api exec vitest run src/bookings/booking.controller.spec.ts`

Expected: FAIL because the controller still accepts caller-supplied identity.

- [ ] **Step 3: Implement bearer guard and profile endpoints**

The guard extracts `Authorization: Bearer <token>`, hashes the raw token, rejects missing/expired/revoked sessions with 401, and attaches `AuthenticatedRider` to the request. The profile service permits only city, name, email, and image URL changes.

- [ ] **Step 4: Remove rider and city from the public booking body**

```ts
export type CreateRideRequest = {
  categoryCode: RideCategoryCode;
  pickup: Coordinates;
  destination: Coordinates;
  scheduledPickupAt?: string;
};
```

The controller creates the internal booking request by combining this body with `AuthenticatedRider`.

- [ ] **Step 5: Run API tests and typecheck**

Run: `pnpm --filter @tami/api test && pnpm --filter @tami/api typecheck`

Expected: PASS.

### Task 4: Add Database Migration and Identity Integration Test

**Files:**
- Create: `apps/api/prisma/migrations/20260710123000_rider_sessions/migration.sql`
- Create: `apps/api/src/auth/auth.integration.spec.ts`
- Modify: `apps/api/package.json`
- Modify: `README.md`

- [ ] **Step 1: Create and apply the session migration**

Run: `cd apps/api && DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" pnpm exec prisma migrate dev --schema prisma/schema.prisma --name rider_sessions`

Expected: a migration creates `RiderSession` and Prisma client generation succeeds.

- [ ] **Step 2: Write the database integration test**

```ts
it("persists a hashed session and uses it to create a rider-owned ride", async () => {
  const session = await authService.verifyRider(firebasePhoneAuthRequest);
  const ride = await authenticatedBookingService.createRide(session.accessToken, request);

  expect(storedSession.tokenHash).not.toBe(session.accessToken);
  expect(ride.riderId).toBe(storedSession.riderId);
});
```

- [ ] **Step 3: Run the integration suite**

Run: `DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" RUN_DATABASE_TESTS=true pnpm --filter @tami/api test:integration`

Expected: PASS using a fake Firebase proof verifier.

### Task 5: Add Flutter Firebase Phone Onboarding

**Files:**
- Modify: `apps/mobile/pubspec.yaml`
- Create: `apps/mobile/lib/src/auth/rider_identity_client.dart`
- Create: `apps/mobile/lib/src/auth/rider_session.dart`
- Create: `apps/mobile/lib/src/auth/rider_onboarding_screen.dart`
- Create: `apps/mobile/lib/src/auth/firebase_pnv_channel.dart`
- Modify: `apps/mobile/lib/src/app/tami_mobile_app.dart`
- Modify: `apps/mobile/lib/main_rider.dart`
- Modify: `apps/mobile/android/app/build.gradle.kts`
- Modify: `apps/mobile/android/app/src/main/kotlin/com/example/tami_mobile/MainActivity.kt`
- Create: `apps/mobile/test/rider_onboarding_screen_test.dart`

- [ ] **Step 1: Add a failing onboarding widget test**

```dart
testWidgets('shows the rider home after a verified profile is saved', (tester) async {
  final client = FakeRiderIdentityClient(verifiedSession: riderSession);

  await tester.pumpWidget(TamiMobileApp(
    mode: TamiAppMode.rider,
    riderIdentityClient: client,
  ));

  expect(find.text('Verify your phone'), findsOneWidget);
  await tester.tap(find.text('Continue'));
  await tester.pumpAndSettle();
  expect(find.text('Book a Tami ride'), findsOneWidget);
});
```

- [ ] **Step 2: Add FlutterFire dependencies and configuration boundary**

Add `firebase_core` and `firebase_auth`. Initialize Firebase only with generated `firebase_options.dart`; keep that generated configuration out of source control until the project owner supplies it. Add Firebase PNV Android library `com.google.firebase:firebase-pnv` through the Firebase Android BoM and expose its support check/result token through a method channel.

- [ ] **Step 3: Implement Phone Auth fallback and PNV channel**

Use `FirebaseAuth.verifyPhoneNumber` for SMS verification. The Android method channel calls `getVerificationSupportInfo()` first, then calls `getVerifiedPhoneNumber()` and returns the signed PNV token to Dart. Unsupported, declined, or failed PNV attempts transition to the SMS flow.

- [ ] **Step 4: Exchange Firebase proof with Tami and retain the session in app memory**

After Firebase produces a Phone Auth ID token or PNV token, call `POST /auth/rider/verify`, store the Tami access token in the session model, then retrieve/update the profile before navigating to the rider home.

- [ ] **Step 5: Run Flutter checks**

Run: `cd apps/mobile && flutter pub get && flutter test && flutter analyze`

Expected: PASS without production Firebase credentials by using fake identity clients in widget tests.

### Task 6: Document Configuration and Verify the Workspace

**Files:**
- Modify: `README.md`
- Modify: `tech_stack.md`

- [ ] **Step 1: Document Firebase setup and local environment variables**

Document `FIREBASE_PROJECT_ID`, the secure location of Firebase service-account credentials, Firebase Console phone-auth/PNV setup, Android SHA, APNs configuration, and the PNV fallback behavior.

- [ ] **Step 2: Run final verification**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm lint && pnpm mobile:test && pnpm mobile:analyze`

Expected: all commands exit 0. Run the database integration command from Task 4 against local PostGIS.

- [ ] **Step 3: Commit the identity slice**

```bash
git add apps/api apps/mobile README.md tech_stack.md docs/superpowers/plans/2026-07-10-tami-firebase-rider-identity-plan.md pnpm-lock.yaml
git commit -m "feat: add firebase rider identity"
```
