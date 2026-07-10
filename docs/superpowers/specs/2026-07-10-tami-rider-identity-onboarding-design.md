# Tami Rider Identity and Onboarding Design

**Date:** 2026-07-10

**Status:** Approved Firebase identity slice

## Goal

Give the Flutter rider app a real Firebase-verified phone identity and profile flow so an authenticated rider can create a booking without supplying an arbitrary rider or city identifier.

## Scope

- Android Firebase Phone Number Verification (PNV) when the device and carrier support it.
- Firebase Phone Authentication SMS fallback for Android and iOS.
- Persistent opaque rider sessions with expiry and revocation fields.
- Rider profile retrieval and update, including selected Sindh city, display name, email, and optional image URL.
- Bearer-token authentication for ride creation.
- Flutter rider onboarding screens and authenticated API client boundaries.

This slice does not integrate a separate SMS gateway, file upload storage, password login, driver/admin authentication, wallet payments, dispatch, maps, or chat.

## API Design

### Firebase Verification

The Flutter app verifies the phone number with Firebase before calling the Tami API:

- On supported Android devices, Firebase PNV obtains a carrier-verified phone number after user consent. The app sends the signed PNV proof to Tami.
- On unsupported Android devices and on iOS, Firebase Phone Authentication sends an SMS code and returns a Firebase ID token after verification.

`POST /auth/rider/verify`

Request:

```json
{
  "verificationMethod": "firebase_phone_auth",
  "firebaseProof": "firebase-id-token-or-pnv-token",
  "cityId": "city_karachi"
}
```

`verificationMethod` is either `firebase_pnv` or `firebase_phone_auth`. The backend verifies the proof, extracts the verified phone number, finds or creates the rider using the selected city, and returns a Tami session token and rider profile.

Response:

```json
{
  "accessToken": "tami-session-token",
  "rider": {
    "id": "rider_...",
    "phone": "+923001234567",
    "cityId": "city_karachi"
  }
}
```

FCM remains the notification channel for ride and dispatch events. It is not used to deliver verification codes.

### Profile

`GET /rider/me` returns the authenticated rider.

`PUT /rider/me` accepts only `cityId`, `name`, `email`, and `imageUrl`. The rider ID and phone number cannot be changed by this endpoint.

### Booking

`POST /bookings/rides` accepts only category, pickup, destination, and optional scheduled pickup time. The authentication guard derives rider ID and city ID from the valid bearer token and passes them to the booking domain service.

Missing, invalid, expired, or revoked tokens return HTTP 401. A rider whose city is not active cannot receive a session or submit a booking.

## Data Model

Add `RiderSession`:

- `id`, `riderId`, and a unique SHA-256 `tokenHash`.
- `expiresAt`, `revokedAt`, `createdAt`, and `lastUsedAt`.
- A required relationship to `Rider` with cascade deletion.

`Rider` continues to require city context. The Firebase verification exchange requires `cityId`, preventing location-less accounts from creating rides.

The raw session token is generated with Node's cryptographic random bytes, returned once, and never stored in the database. Firebase proof tokens are verified and discarded; they are not stored in the Tami database.

## Backend Structure

- `auth/`: Firebase proof verifier interface, Firebase verifier implementation, auth service, bearer-token guard, and auth controller.
- `riders/`: profile service and controller.
- `bookings/`: controller delegates identity extraction to the auth guard and no longer trusts caller-provided rider/city fields.
- `prisma/`: existing database service and a migration for rider sessions.

The auth service depends on a small Firebase proof verifier interface. This keeps PNV, Firebase Phone Authentication, and a future government identity provider behind the same backend boundary.

## Flutter Structure

- `lib/src/auth/`: Firebase phone verification client, API client, session model/store, and onboarding flow.
- Rider flow: Firebase PNV consent on compatible Android devices, or phone number -> SMS code through Firebase Phone Auth -> selected city and profile -> rider home.
- A shared API base URL is passed into the rider app entry point for device-specific local development and later deployment configuration.
- Firebase fictional phone numbers and verification codes are configured only in the Firebase console for development and test devices; no test code is embedded in the app.

The existing rider home remains the post-onboarding destination. Map selection and the detailed booking form remain a later rider-booking slice.

## Error Handling and Security

- Reject missing, invalid, expired, or unverifiable Firebase proof, city, and profile data with clear API errors.
- Require Firebase PNV device/carrier compatibility before showing the PNV consent flow; use Firebase Phone Auth SMS when it is unavailable.
- Require Firebase SMS-region policy, Android SHA configuration, and iOS APNs/FCM configuration before release testing.
- Hash session tokens before persistence and check expiry/revocation on every authenticated request.
- Keep Firebase verification explicit and isolated from the Tami session boundary.

## Testing

- Unit tests for Firebase proof verification, session hashing/expiry, and rider creation.
- Controller tests for token-protected booking requests that prove spoofed rider and city fields are ignored or rejected.
- Prisma integration test for session-backed rider creation and authenticated ride persistence.
- Flutter widget/unit tests for onboarding states, city selection, profile save, and authenticated rider home routing.

## Acceptance Criteria

1. A rider can verify their phone through Firebase PNV on supported Android devices or Firebase Phone Auth fallback, selecting an active Sindh city.
2. Firebase verification creates or reuses the rider and returns an expiring opaque Tami session token.
3. The rider can retrieve and update their profile.
4. Booking creation succeeds only with a valid rider session and always uses that rider's city and ID.
5. The Flutter rider app presents onboarding before the rider home and persists the authenticated session for the running app.
6. Existing unauthenticated booking tests are replaced with authenticated API contract tests; no production route accepts a rider ID supplied by the mobile client.
