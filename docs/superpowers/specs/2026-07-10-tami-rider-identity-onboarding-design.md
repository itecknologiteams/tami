# Tami Rider Identity and Onboarding Design

**Date:** 2026-07-10

**Status:** Approved development slice

## Goal

Give the Flutter rider app a real development login and profile flow so an authenticated rider can create a booking without supplying an arbitrary rider or city identifier.

## Scope

- Development-only rider OTP issuance and verification.
- Persistent opaque rider sessions with expiry and revocation fields.
- Rider profile retrieval and update, including selected Sindh city, display name, email, and optional image URL.
- Bearer-token authentication for ride creation.
- Flutter rider onboarding screens and authenticated API client boundaries.

This slice does not integrate a live SMS gateway, file upload storage, password login, driver/admin authentication, wallet payments, dispatch, maps, or chat.

## API Design

### Development OTP

`POST /auth/rider/otp`

Request:

```json
{ "phone": "+923001234567" }
```

Response in development mode:

```json
{
  "challengeId": "challenge_...",
  "expiresAt": "2026-07-10T12:05:00.000Z",
  "developmentCode": "123456"
}
```

The six-digit code expires after five minutes and is kept only in the development auth service. `developmentCode` is never returned outside the development auth mode.

`POST /auth/rider/verify`

Request:

```json
{
  "challengeId": "challenge_...",
  "code": "123456",
  "cityId": "city_karachi"
}
```

On successful verification, the API finds or creates a rider using the verified phone number and selected city. It returns an opaque access token and the rider profile.

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

`Rider` continues to require city context. The OTP verification request requires `cityId`, preventing location-less accounts from creating rides.

The raw session token is generated with Node's cryptographic random bytes, returned once, and never stored in the database. Development OTP codes are not persisted or logged outside their immediate response.

## Backend Structure

- `auth/`: challenge store, auth service, bearer-token guard, and auth controller.
- `riders/`: profile service and controller.
- `bookings/`: controller delegates identity extraction to the auth guard and no longer trusts caller-provided rider/city fields.
- `prisma/`: existing database service and a migration for rider sessions.

The auth service depends on a small `DevelopmentOtpChallengeStore` interface so a future SMS/OTP provider can replace it without changing session or rider logic.

## Flutter Structure

- `lib/src/auth/`: API client, session model/store, and onboarding flow.
- Rider flow: phone number -> code -> selected city and profile -> rider home.
- A shared API base URL is passed into the rider app entry point for device-specific local development and later deployment configuration.
- The development code is displayed only when the API explicitly returns it, so the mobile UI has no hidden test credentials.

The existing rider home remains the post-onboarding destination. Map selection and the detailed booking form remain a later rider-booking slice.

## Error Handling and Security

- Normalize phone numbers to the submitted E.164-style string for this development slice; production national-number normalization is deferred with the real SMS provider.
- Reject missing phone, code, challenge, city, and profile data with clear API errors.
- Allow one active challenge per phone number; issuing a new code invalidates the previous one.
- Reject expired or consumed challenges.
- Hash session tokens before persistence and check expiry/revocation on every authenticated request.
- Keep the development OTP adapter explicit and isolated from the production provider boundary.

## Testing

- Unit tests for OTP issuance/verification, challenge invalidation, session hashing/expiry, and rider creation.
- Controller tests for token-protected booking requests that prove spoofed rider and city fields are ignored or rejected.
- Prisma integration test for session-backed rider creation and authenticated ride persistence.
- Flutter widget/unit tests for onboarding states, city selection, profile save, and authenticated rider home routing.

## Acceptance Criteria

1. A rider can request and verify a development OTP, selecting an active Sindh city.
2. Verification creates or reuses the rider and returns an expiring opaque session token.
3. The rider can retrieve and update their profile.
4. Booking creation succeeds only with a valid rider session and always uses that rider's city and ID.
5. The Flutter rider app presents onboarding before the rider home and persists the authenticated session for the running app.
6. Existing unauthenticated booking tests are replaced with authenticated API contract tests; no production route accepts a rider ID supplied by the mobile client.
