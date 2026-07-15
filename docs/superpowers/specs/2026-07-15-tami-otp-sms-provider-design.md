# Tami Real OTP/SMS Provider Design (2026-07-15)

## Goal

Replace the development-only OTP mechanism (`DevelopmentOtpStore`, which
returns the six-digit code directly in the API response) with real SMS
delivery, following the swappable-provider pattern already established by
`PushNotificationProvider`/`GeocodingProvider`/`RoutingProvider`. Add basic
anti-abuse rate limiting to the OTP and verify endpoints, backed by Redis —
the platform's first Redis-backed infrastructure, anticipating the cache/queue
role `tech_stack.md` already assigns it.

This closes one of the hard launch blockers identified in the production
readiness review: rider and driver login currently work by reading the OTP
code out of the JSON response, which is explicitly called out as
development-only in `README.md` and cannot ship publicly.

## Current state

- `apps/api/src/auth/development-otp-store.ts`: in-memory `Map<challengeId,
  {phone, code, expiresAt}>`, random 6-digit code via `randomInt`, 5-minute
  expiry, single-use (deleted on `consume`). Both `AuthService.requestOtp`
  (rider) and `DriverAuthService.requestOtp` (driver) share this same store
  instance and return `{challengeId, developmentCode, expiresAt}` straight
  from the controller.
- No SMS provider integration anywhere in the repo.
- No rate limiting anywhere in the API (`@nestjs/throttler` is not a
  dependency; `main.ts` only configures CORS and shutdown hooks).
- No Redis anywhere in the stack (not in either docker-compose file, not a
  dependency, not referenced in code) despite `tech_stack.md` listing it as
  a required cache/queue layer.
- The existing provider-swap pattern (`apps/api/src/notifications/`):
  an abstract class (`PushNotificationProvider`) with one method, a concrete
  real implementation (`FcmPushNotificationProvider`, plain `fetch`, no
  vendor SDK), a `Development*Provider` fallback, and a factory function in
  `app.module.ts` (`createPushNotificationProvider`) that throws if the real
  provider's env vars are missing in production and otherwise falls back to
  the development implementation.

## Design

### SMS provider abstraction

`apps/api/src/sms/sms.provider.ts`:

```ts
export abstract class SmsProvider {
  abstract send(phone: string, body: string): Promise<void>;
}
```

Unlike push notifications (best-effort, failures are logged and swallowed),
an OTP SMS that fails to send must surface to the caller — the rider/driver
has no other way to get the code. `send` throws `SmsDeliveryException` on
any failure (non-2xx response, timeout, network error); callers decide what
to do with it (the OTP flow turns it into a 502 to the client).

### Twilio implementation (placeholder, swappable)

`apps/api/src/sms/twilio-sms.provider.ts`: calls Twilio's REST API directly
via `fetch` (no `twilio` SDK dependency, consistent with the FCM provider's
approach). Reads `TAMI_TWILIO_ACCOUNT_SID`, `TAMI_TWILIO_AUTH_TOKEN`,
`TAMI_TWILIO_FROM_NUMBER`. Documented in-code as an explicit placeholder —
production Sindh deployment may swap this for a local Pakistani aggregator
without touching `OtpService` or either auth service, the same way routing
and geocoding providers are swappable.

### Development implementation

`apps/api/src/sms/development-sms.provider.ts`: logs the phone and body via
`Logger` instead of sending anything. Used whenever `TAMI_TWILIO_*` vars are
unset outside production (mirrors `DevelopmentPushNotificationProvider`).

### DI wiring

`app.module.ts` gains `createSmsProvider()` next to
`createPushNotificationProvider()`: constructs `TwilioSmsProvider` when all
three Twilio env vars are present, throws if `NODE_ENV=production` and they
are missing, otherwise returns `DevelopmentSmsProvider`.

### OTP flow changes

`DevelopmentOtpStore` is renamed to `OtpService`
(`apps/api/src/auth/otp.service.ts`) and gains:

- an injected `SmsProvider`, used in `issue()` to send `"Your Tami code is
  {code}. It expires in 5 minutes."` to the phone
- an injected `OtpRateLimiter` (see below), checked at the start of `issue()`
  before generating a code; throws `TooManyRequestsException` (429) when the
  per-phone limit is exceeded

Response shape: `developmentCode` is only included when
`NODE_ENV !== "production"` (keeps today's rider/driver dev login working
without a live Twilio account). In production the response is
`{challengeId, expiresAt}` only — no code, no masked phone (masking the
phone back to the same client that just submitted it adds no security value
and the client already has it).

`AuthService.requestOtp` and `DriverAuthService.requestOtp` are otherwise
unchanged — they already just delegate to the shared OTP store/service.

### Rate limiting

New Redis-backed infrastructure:

- `docker-compose.yml` and `docker-compose.prod.yml`: add a `redis`
  service (`redis:7-alpine`), matching the existing lightweight
  `postgres`/`nominatim` service style, with a healthcheck.
- `apps/api`: add `ioredis` as a dependency.
- New env var `TAMI_REDIS_URL`, defaulting to `redis://127.0.0.1:6379` in
  development, required in production (same fail-fast pattern as
  `TAMI_NOMINATIM_BASE_URL`/`TAMI_ROUTING_BASE_URL`).
- `@nestjs/throttler` + a Redis storage adapter, applied as a route-level
  guard on `POST /auth/rider/otp`, `POST /auth/driver/otp`,
  `POST /auth/rider/verify`, `POST /auth/driver/verify`: 10 requests per
  10 minutes per IP.
- A separate `OtpRateLimiter` service (`apps/api/src/auth/otp-rate-limiter.ts`)
  using direct `ioredis` `INCR`+`EXPIRE` keyed by normalized phone number:
  3 OTP requests per 10 minutes per phone, independent of IP (closes the
  gap where rotating IPs bypasses the throttler guard). Invoked from
  `OtpService.issue()` before the SMS send.
- `apps/api/src/health/health.controller.ts` gains a Redis ping alongside
  whatever else it checks, so a down Redis is visible in health checks
  rather than silently degrading OTP issuance.

### What does not change

- OTP code format: 6-digit numeric, unchanged (already implemented, tested,
  and matches both mobile apps' input UX).
- Challenge lifecycle: single-use, 5-minute expiry, delete-on-consume —
  unchanged.
- `RiderAuthGuard`/`DriverAuthGuard`, session issuance, `AuthRepository`/
  `DriverAuthRepository` — untouched.

## Error handling

- SMS send failure (`SmsDeliveryException`) → `OtpService.issue` propagates
  it; the controller returns 502 with a generic "could not send verification
  code, try again" message (no provider error details leaked to the client).
- Rate limit exceeded (either per-phone or per-IP) → 429 with a
  `retryAfterSeconds` hint.
- Redis unavailable → OTP issuance fails closed (better to block login
  temporarily than to silently skip rate limiting); this is the same
  fail-fast philosophy already used for Nominatim/OSRM in production.

## Testing

- `TwilioSmsProvider` unit spec: mocked `fetch`, covers success, non-2xx
  response, timeout — same shape as `fcm-push-notification.provider.spec.ts`.
- `OtpRateLimiter` unit spec: mocked/in-memory Redis client (ioredis has an
  in-memory-compatible test double pattern; if none is idiomatic here, a
  minimal fake implementing the two calls used is acceptable, matching how
  other providers are faked in this codebase), covers under-limit,
  at-limit, and window-reset behavior.
- `OtpService` unit spec: updated from today's `development-otp-store.spec.ts`
  equivalent coverage, plus new cases for SMS send failure and rate-limit
  rejection.
- `AuthController`/`DriverAuthController` specs: updated for the
  production response shape (no `developmentCode`).
- Integration: exercise the full rider OTP → verify flow against the real
  Redis and development SMS provider (`RUN_DATABASE_TESTS=true` style gate),
  confirming rate limiting actually blocks the 4th request in a window.

## Documentation

- `README.md`: rewrite the rider/driver login section — remove "returns a
  six-digit code" as the production description, keep it as the explicit
  development-mode behavior, add `TAMI_TWILIO_*` and `TAMI_REDIS_URL` to the
  production setup steps.
- `apps/api/.env.example`: add `TAMI_TWILIO_ACCOUNT_SID`,
  `TAMI_TWILIO_AUTH_TOKEN`, `TAMI_TWILIO_FROM_NUMBER`, `TAMI_REDIS_URL`.
  While here, also add `TAMI_ADMIN_TOKEN` and `TAMI_CORS_ORIGINS`, which are
  used in code today but were missing from this file (pre-existing gap, not
  caused by this change, but adjacent enough to fix in the same pass).

## Out of scope (tracked separately)

- Payment gateway integration (JazzCash/Easypaisa/NayaPay).
- Admin RBAC (still a single static token after this change).
- Mobile FCM registration (server-side push already works; the Flutter app
  does not yet obtain/register real FCM tokens).
- Broader operational hardening: CI, global `ValidationPipe`/DTOs, `helmet`,
  S3 file storage. `@nestjs/throttler` is introduced here scoped to the auth
  endpoints only, not as a global rate-limiting policy.
