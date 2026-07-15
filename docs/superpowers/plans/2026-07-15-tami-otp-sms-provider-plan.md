# Tami Real OTP/SMS Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the development-only OTP mechanism (code returned directly in the API response) with real SMS delivery through a swappable provider, plus Redis-backed rate limiting on the rider/driver auth endpoints.

**Architecture:** Follow the existing swappable-provider pattern used by `PushNotificationProvider`/`GeocodingProvider`/`RoutingProvider`: an abstract `SmsProvider` class, a `TwilioSmsProvider` concrete implementation (plain `fetch`, no vendor SDK), a `DevelopmentSmsProvider` console-log fallback, and a factory function in `app.module.ts` that throws in production when Twilio env vars are missing. `DevelopmentOtpStore` is renamed to `OtpService` and gains an injected `SmsProvider` and a new Redis-backed `OtpRateLimiter`. Redis is introduced as new infrastructure (first use in this codebase) via `ioredis`, backing both the per-phone rate limiter and a `@nestjs/throttler` guard on the four auth HTTP routes.

**Tech Stack:** NestJS 11.1.6, `ioredis@5.11.1`, `@nestjs/throttler@6.5.0`, `@nest-lab/throttler-storage-redis@1.2.0`, Vitest, Redis 7 (docker-compose service), Twilio REST API (via `fetch`, no SDK).

## Global Constraints

- OTP code format stays 6-digit numeric — no change to `randomInt(100000, 1000000)`.
- Challenge lifecycle stays single-use, 5-minute expiry, delete-on-consume.
- SMS send failures must throw (surfaced to the caller as a 502), unlike push notifications which swallow failures.
- Rate limit exceeded returns 429 with a `retryAfterSeconds` field.
- Redis unavailable fails OTP issuance closed (same fail-fast philosophy as the existing Nominatim/OSRM production checks) — never silently skip rate limiting.
- `developmentCode` stays in the response when `NODE_ENV !== "production"`; omitted in production.
- Per-phone limit: 3 requests / 10 minutes. Per-IP limit (via `@nestjs/throttler`): 10 requests / 10 minutes, applied to `POST /auth/rider/otp`, `POST /auth/driver/otp`, `POST /auth/rider/verify`, `POST /auth/driver/verify`.
- New env vars: `TAMI_TWILIO_ACCOUNT_SID`, `TAMI_TWILIO_AUTH_TOKEN`, `TAMI_TWILIO_FROM_NUMBER`, `TAMI_REDIS_URL` (default `redis://127.0.0.1:6379` in dev, required in production).
- Twilio implementation is an explicit placeholder — documented in-code as swappable for a Pakistani SMS aggregator without touching `OtpService`/`AuthService`/`DriverAuthService`.

---

### Task 1: Redis infrastructure (docker-compose + env)

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Modify: `apps/api/.env.example`
- Modify: `README.md` (env var documentation section only — the "Rider Development Login" section referencing OTP wording comes in Task 9)

**Interfaces:**
- Produces: a `redis` service reachable at `127.0.0.1:6390` in dev (mapped from container port `6379`, avoiding collision with a developer's local Redis) and `redis:6379` inside the prod compose network. `TAMI_REDIS_URL` env var convention for later tasks to read.

- [ ] **Step 1: Add the `redis` service to `docker-compose.yml`**

Add this service alongside `postgres` and `nominatim` (before the `volumes:` key):

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6390:6379"
    volumes:
      - tami-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10
```

Add `tami-redis-data:` under the existing `volumes:` key at the bottom of the file.

- [ ] **Step 2: Add the `redis` service to `docker-compose.prod.yml`**

Add this service (after `nominatim`, before `api`):

```yaml
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - tami-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10
```

Add `tami-redis-data:` under the existing `volumes:` key. Add `TAMI_REDIS_URL: redis://redis:6379` to the `api` service's `environment:` block. Add a `redis:` entry under the `api` service's `depends_on:` block with `condition: service_healthy`, matching the `postgres`/`nominatim` entries already there. Update the file's top comment block to list `TAMI_REDIS_URL` alongside the other required vars (note it has a default so it isn't `:?required` like `TAMI_DB_PASSWORD`).

- [ ] **Step 3: Add Redis and Twilio vars to `apps/api/.env.example`**

Append to the end of the file:

```
# Redis: required in production for OTP rate limiting.
# Defaults to the local docker-compose service outside production.
TAMI_REDIS_URL="redis://127.0.0.1:6390"

# SMS delivery (Twilio placeholder — required in production).
# Falls back to a development logger when unset outside production.
# TAMI_TWILIO_ACCOUNT_SID=""
# TAMI_TWILIO_AUTH_TOKEN=""
# TAMI_TWILIO_FROM_NUMBER=""

# Admin command center shared token (required in production).
# TAMI_ADMIN_TOKEN=""

# Comma-separated origins allowed to call the API (leave empty in development).
# TAMI_CORS_ORIGINS=""
```

(The last two — `TAMI_ADMIN_TOKEN` and `TAMI_CORS_ORIGINS` — were used in code but missing from this file before this change; adding them here per the spec's documentation note.)

- [ ] **Step 4: Verify the Redis service starts and responds**

Run: `docker compose up -d redis`
Then: `docker compose exec redis redis-cli ping`
Expected: `PONG`

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml apps/api/.env.example
git commit -m "feat: add redis infrastructure for otp rate limiting"
```

---

### Task 2: `SmsProvider` abstraction + `DevelopmentSmsProvider`

**Files:**
- Create: `apps/api/src/sms/sms.provider.ts`
- Create: `apps/api/src/sms/development-sms.provider.ts`
- Test: `apps/api/src/sms/development-sms.provider.spec.ts`

**Interfaces:**
- Produces: `abstract class SmsProvider { abstract send(phone: string, body: string): Promise<void>; }`, `class DevelopmentSmsProvider extends SmsProvider`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/sms/development-sms.provider.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { DevelopmentSmsProvider } from "./development-sms.provider";

describe("DevelopmentSmsProvider", () => {
  it("logs the phone and body instead of sending anything", async () => {
    const provider = new DevelopmentSmsProvider();
    const logSpy = vi.spyOn(provider.logger, "log").mockImplementation(() => undefined);

    await provider.send("+923001234567", "Your Tami code is 123456.");

    expect(logSpy).toHaveBeenCalledWith(
      "[dev sms] -> +923001234567: Your Tami code is 123456.",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/sms/development-sms.provider.spec.ts`
Expected: FAIL — `Cannot find module './development-sms.provider'`

- [ ] **Step 3: Write `sms.provider.ts`**

```ts
export abstract class SmsProvider {
  abstract send(phone: string, body: string): Promise<void>;
}
```

- [ ] **Step 4: Write `development-sms.provider.ts`**

```ts
import { Injectable, Logger } from "@nestjs/common";
import { SmsProvider } from "./sms.provider";

@Injectable()
export class DevelopmentSmsProvider extends SmsProvider {
  readonly logger = new Logger(DevelopmentSmsProvider.name);

  async send(phone: string, body: string): Promise<void> {
    this.logger.log(`[dev sms] -> ${phone}: ${body}`);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/sms/development-sms.provider.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/sms/sms.provider.ts apps/api/src/sms/development-sms.provider.ts apps/api/src/sms/development-sms.provider.spec.ts
git commit -m "feat: add sms provider abstraction and development fallback"
```

---

### Task 3: `TwilioSmsProvider`

**Files:**
- Create: `apps/api/src/sms/twilio-sms.provider.ts`
- Test: `apps/api/src/sms/twilio-sms.provider.spec.ts`

**Interfaces:**
- Consumes: `SmsProvider` (Task 2).
- Produces: `class TwilioSmsProvider extends SmsProvider`, constructed with `{accountSid: string; authToken: string; fromNumber: string; fetcher?: Fetcher; timeoutMilliseconds?: number}`. Throws `SmsDeliveryException` (exported) on failure.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/sms/twilio-sms.provider.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { SmsDeliveryException, TwilioSmsProvider } from "./twilio-sms.provider";

describe("TwilioSmsProvider", () => {
  it("posts the message to the Twilio messages endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", {status: 201}));
    const provider = new TwilioSmsProvider({
      accountSid: "AC_test",
      authToken: "secret",
      fromNumber: "+15005550006",
      fetcher,
    });

    await provider.send("+923001234567", "Your Tami code is 123456.");

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/AC_test/Messages.json",
    );
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe(
      `Basic ${Buffer.from("AC_test:secret").toString("base64")}`,
    );
    const body = new URLSearchParams(init.body as string);
    expect(body.get("To")).toBe("+923001234567");
    expect(body.get("From")).toBe("+15005550006");
    expect(body.get("Body")).toBe("Your Tami code is 123456.");
  });

  it("throws SmsDeliveryException when Twilio is unreachable", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    const provider = new TwilioSmsProvider({
      accountSid: "AC_test",
      authToken: "secret",
      fromNumber: "+15005550006",
      fetcher,
    });

    await expect(
      provider.send("+923001234567", "code"),
    ).rejects.toThrow(SmsDeliveryException);
  });

  it("throws SmsDeliveryException on a non-success response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("Bad Request", {status: 400}));
    const provider = new TwilioSmsProvider({
      accountSid: "AC_test",
      authToken: "secret",
      fromNumber: "+15005550006",
      fetcher,
    });

    await expect(
      provider.send("+923001234567", "code"),
    ).rejects.toThrow("SMS delivery failed with status 400");
  });

  it("rejects blank credentials", () => {
    expect(
      () =>
        new TwilioSmsProvider({
          accountSid: "   ",
          authToken: "secret",
          fromNumber: "+15005550006",
        }),
    ).toThrow("TAMI_TWILIO_ACCOUNT_SID is required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/sms/twilio-sms.provider.spec.ts`
Expected: FAIL — `Cannot find module './twilio-sms.provider'`

- [ ] **Step 3: Write `twilio-sms.provider.ts`**

```ts
import { Injectable, Logger } from "@nestjs/common";
import { SmsProvider } from "./sms.provider";

export class SmsDeliveryException extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SmsDeliveryException";
  }
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type TwilioSmsProviderOptions = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  fetcher?: Fetcher;
  timeoutMilliseconds?: number;
};

/**
 * Placeholder SMS provider using Twilio's REST API directly. Production
 * Sindh deployment may swap this for a local aggregator by implementing
 * SmsProvider — no other file in the auth flow needs to change.
 */
@Injectable()
export class TwilioSmsProvider extends SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly fetcher: Fetcher;
  private readonly timeoutMilliseconds: number;

  constructor(options: TwilioSmsProviderOptions) {
    super();
    this.accountSid = options.accountSid.trim();
    if (this.accountSid.length === 0) {
      throw new Error("TAMI_TWILIO_ACCOUNT_SID is required");
    }
    this.authToken = options.authToken.trim();
    if (this.authToken.length === 0) {
      throw new Error("TAMI_TWILIO_AUTH_TOKEN is required");
    }
    this.fromNumber = options.fromNumber.trim();
    if (this.fromNumber.length === 0) {
      throw new Error("TAMI_TWILIO_FROM_NUMBER is required");
    }
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 5000;
  }

  async send(phone: string, body: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = Buffer.from(
      `${this.accountSid}:${this.authToken}`,
    ).toString("base64");

    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          To: phone,
          From: this.fromNumber,
          Body: body,
        }).toString(),
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
    } catch (error) {
      this.logger.error(
        `SMS delivery failed for ${phone}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new SmsDeliveryException("SMS delivery is unavailable", {
        cause: error,
      });
    }

    if (!response.ok) {
      this.logger.error(
        `SMS delivery failed for ${phone} with status ${response.status}`,
      );
      throw new SmsDeliveryException(
        `SMS delivery failed with status ${response.status}`,
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/sms/twilio-sms.provider.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sms/twilio-sms.provider.ts apps/api/src/sms/twilio-sms.provider.spec.ts
git commit -m "feat: add twilio sms provider"
```

---

### Task 4: `OtpRateLimiter` (Redis-backed, per-phone)

**Files:**
- Create: `apps/api/src/auth/otp-rate-limiter.ts`
- Test: `apps/api/src/auth/otp-rate-limiter.spec.ts`

**Interfaces:**
- Consumes: an `ioredis`-compatible client with `incr(key)` and `expire(key, seconds)` and `ttl(key)` methods.
- Produces: `class OtpRateLimiter`, constructor `(redis: Redis)`, method `assertNotRateLimited(phone: string): Promise<void>` that throws `TooManyRequestsException` (from `@nestjs/common`, message including a `retryAfterSeconds`-bearing payload) once a phone exceeds 3 requests in a 10-minute window. Later tasks (`OtpService`) call `assertNotRateLimited` before issuing a code.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/auth/otp-rate-limiter.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { OtpRateLimiter } from "./otp-rate-limiter";

class FakeRedis {
  private readonly counts = new Map<string, number>();
  private readonly expiries = new Map<string, number>();

  async incr(key: string): Promise<number> {
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.expiries.set(key, seconds);
    return 1;
  }

  async ttl(key: string): Promise<number> {
    return this.expiries.get(key) ?? -1;
  }
}

describe("OtpRateLimiter", () => {
  it("allows up to 3 requests per phone in the window", async () => {
    const limiter = new OtpRateLimiter(new FakeRedis() as never);

    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
  });

  it("rejects the 4th request in the window with a retry hint", async () => {
    const limiter = new OtpRateLimiter(new FakeRedis() as never);

    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");

    await expect(
      limiter.assertNotRateLimited("+923001234567"),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        retryAfterSeconds: expect.any(Number),
      }),
    });
  });

  it("tracks phones independently", async () => {
    const limiter = new OtpRateLimiter(new FakeRedis() as never);

    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");
    await limiter.assertNotRateLimited("+923001234567");

    await limiter.assertNotRateLimited("+923009876543");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/auth/otp-rate-limiter.spec.ts`
Expected: FAIL — `Cannot find module './otp-rate-limiter'`

- [ ] **Step 3: Write `otp-rate-limiter.ts`**

```ts
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type Redis from "ioredis";

const windowSeconds = 10 * 60;
const maxRequestsPerWindow = 3;

@Injectable()
export class OtpRateLimiter {
  constructor(private readonly redis: Redis) {}

  async assertNotRateLimited(phone: string): Promise<void> {
    const key = `otp-rate-limit:${phone}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    if (count > maxRequestsPerWindow) {
      const retryAfterSeconds = await this.redis.ttl(key);
      throw new HttpException(
        {
          message: "Too many OTP requests for this phone number",
          retryAfterSeconds: retryAfterSeconds > 0 ? retryAfterSeconds : windowSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/auth/otp-rate-limiter.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/otp-rate-limiter.ts apps/api/src/auth/otp-rate-limiter.spec.ts
git commit -m "feat: add redis-backed per-phone otp rate limiter"
```

---

### Task 5: Rename `DevelopmentOtpStore` to `OtpService`, wire in SMS + rate limiting

This is the core behavior change. `DevelopmentOtpStore` (`apps/api/src/auth/development-otp-store.ts`) becomes `OtpService` (`apps/api/src/auth/otp.service.ts`), gaining `SmsProvider` and `OtpRateLimiter` dependencies. A test fixture factory absorbs the fallout so the 13 unrelated call sites across 8 spec files need only a mechanical import/name swap.

**Files:**
- Create: `apps/api/src/auth/otp.service.ts` (renamed/modified from `development-otp-store.ts`)
- Create: `apps/api/src/auth/otp.test-fixture.ts`
- Delete: `apps/api/src/auth/development-otp-store.ts`
- Test: `apps/api/src/auth/otp.service.spec.ts` (renamed/modified from the implicit coverage currently inline in `auth.service.spec.ts`/`driver-auth.service.spec.ts` — this task adds a dedicated spec for the new SMS/rate-limit behavior; the existing specs keep their own behavior coverage via Task 6's fixture swap)
- Modify: `apps/api/src/auth/auth.service.ts` (import path only: `development-otp-store` → `otp.service`, type name `DevelopmentOtpStore` → `OtpService`)
- Modify: `apps/api/src/auth/driver-auth.service.ts` (same import/type rename)

**Interfaces:**
- Consumes: `SmsProvider` (Task 2/3), `OtpRateLimiter` (Task 4).
- Produces: `class OtpService`, constructor `(smsProvider: SmsProvider, rateLimiter: OtpRateLimiter)`, same public methods as before — `issue(phone: string): Promise<DevelopmentOtpChallenge>`, `consume(challengeId: string, code: string): string`, `assertPhone(phone: string): void` — plus `createTestOtpService(overrides?: {smsProvider?: SmsProvider; rateLimiter?: OtpRateLimiter}): OtpService` exported from `otp.test-fixture.ts` for Task 6 to use. `DevelopmentOtpChallenge` type (`{challengeId, developmentCode, expiresAt}`) is unchanged in shape but `developmentCode` becomes conditionally present (see Step 3).

- [ ] **Step 1: Write the failing test for SMS + rate-limit behavior**

Create `apps/api/src/auth/otp.service.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { OtpService } from "./otp.service";
import { OtpRateLimiter } from "./otp-rate-limiter";
import { SmsProvider } from "../sms/sms.provider";

class FakeSmsProvider extends SmsProvider {
  readonly sent: Array<{phone: string; body: string}> = [];
  async send(phone: string, body: string): Promise<void> {
    this.sent.push({phone, body});
  }
}

function fixture() {
  const smsProvider = new FakeSmsProvider();
  const rateLimiter = {
    assertNotRateLimited: vi.fn().mockResolvedValue(undefined),
  } as unknown as OtpRateLimiter;
  const service = new OtpService(smsProvider, rateLimiter);
  return {smsProvider, rateLimiter, service};
}

describe("OtpService", () => {
  it("sends the code by sms and checks the rate limiter", async () => {
    const {smsProvider, rateLimiter, service} = fixture();

    const challenge = await service.issue("+923001234567");

    expect(rateLimiter.assertNotRateLimited).toHaveBeenCalledWith(
      "+923001234567",
    );
    expect(smsProvider.sent).toEqual([
      {
        phone: "+923001234567",
        body: expect.stringContaining(challenge.developmentCode),
      },
    ]);
  });

  it("propagates a rate limit rejection before sending sms", async () => {
    const {smsProvider, rateLimiter, service} = fixture();
    vi.mocked(rateLimiter.assertNotRateLimited).mockRejectedValue(
      new Error("Too many OTP requests for this phone number"),
    );

    await expect(service.issue("+923001234567")).rejects.toThrow(
      "Too many OTP requests for this phone number",
    );
    expect(smsProvider.sent).toEqual([]);
  });

  it("propagates an sms delivery failure", async () => {
    const {rateLimiter} = fixture();
    const failingSms: SmsProvider = {
      send: vi.fn().mockRejectedValue(new Error("SMS delivery is unavailable")),
    };
    const service = new OtpService(failingSms, rateLimiter);

    await expect(service.issue("+923001234567")).rejects.toThrow(
      "SMS delivery is unavailable",
    );
  });

  it("still consumes a valid challenge exactly once", async () => {
    const {service} = fixture();
    const challenge = await service.issue("+923001234567");

    expect(service.consume(challenge.challengeId, challenge.developmentCode)).toBe(
      "+923001234567",
    );
    expect(() =>
      service.consume(challenge.challengeId, challenge.developmentCode),
    ).toThrow("OTP challenge is invalid or already used");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/auth/otp.service.spec.ts`
Expected: FAIL — `Cannot find module './otp.service'`

- [ ] **Step 3: Create `otp.service.ts`** (adapted from `development-otp-store.ts`, adding SMS + rate limiting)

```ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomInt, randomUUID } from "node:crypto";
import { SmsProvider } from "../sms/sms.provider";
import { OtpRateLimiter } from "./otp-rate-limiter";

type OtpChallenge = {
  phone: string;
  code: string;
  expiresAt: Date;
};

export type DevelopmentOtpChallenge = {
  challengeId: string;
  developmentCode: string;
  expiresAt: string;
};

@Injectable()
export class OtpService {
  private readonly challenges = new Map<string, OtpChallenge>();

  constructor(
    private readonly smsProvider: SmsProvider,
    private readonly rateLimiter: OtpRateLimiter,
  ) {}

  async issue(phone: string): Promise<DevelopmentOtpChallenge> {
    this.assertPhone(phone);
    await this.rateLimiter.assertNotRateLimited(phone);

    const challengeId = `challenge_${randomUUID()}`;
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.challenges.set(challengeId, { phone, code, expiresAt });

    await this.smsProvider.send(
      phone,
      `Your Tami verification code is ${code}. It expires in 5 minutes.`,
    );

    return {
      challengeId,
      developmentCode: process.env.NODE_ENV === "production" ? "" : code,
      expiresAt: expiresAt.toISOString(),
    };
  }

  consume(challengeId: string, code: string): string {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new UnauthorizedException("OTP challenge is invalid or already used");
    }

    this.challenges.delete(challengeId);

    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("OTP challenge has expired");
    }

    if (challenge.code !== code) {
      throw new UnauthorizedException("OTP code is invalid");
    }

    return challenge.phone;
  }

  assertPhone(phone: string) {
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      throw new BadRequestException("Phone number must use international format");
    }
  }
}
```

Note: `developmentCode` becomes `""` in production rather than being omitted from the type, keeping the return type stable for `AuthService`/`DriverAuthService`/controllers. Task 8 updates the controllers to strip the field entirely from the production HTTP response.

- [ ] **Step 4: Create the test fixture factory**

Create `apps/api/src/auth/otp.test-fixture.ts`:

```ts
import { OtpRateLimiter } from "./otp-rate-limiter";
import { OtpService } from "./otp.service";
import { SmsProvider } from "../sms/sms.provider";

class NoopSmsProvider extends SmsProvider {
  async send(): Promise<void> {}
}

function noopRateLimiter(): OtpRateLimiter {
  return { assertNotRateLimited: async () => undefined } as unknown as OtpRateLimiter;
}

/**
 * Builds an OtpService with a no-op SMS provider and no-op rate limiter,
 * for specs whose subject is not OTP delivery itself (auth guard tests,
 * rider/driver profile tests, realtime gateway tests, etc.).
 */
export function createTestOtpService(): OtpService {
  return new OtpService(new NoopSmsProvider(), noopRateLimiter());
}
```

- [ ] **Step 5: Delete `development-otp-store.ts`**

Run: `git rm apps/api/src/auth/development-otp-store.ts`

- [ ] **Step 6: Update `auth.service.ts` import and type**

In `apps/api/src/auth/auth.service.ts`, change:

```ts
import {
  DevelopmentOtpChallenge,
  DevelopmentOtpStore,
} from "./development-otp-store";
```

to:

```ts
import { DevelopmentOtpChallenge, OtpService } from "./otp.service";
```

And change the constructor parameter type from `private readonly otpStore: DevelopmentOtpStore` to `private readonly otpStore: OtpService`, and `this.otpStore.issue(phone)` stays the same call (method name unchanged).

- [ ] **Step 7: Update `driver-auth.service.ts` import and type**

Same rename in `apps/api/src/auth/driver-auth.service.ts`: `development-otp-store` → `otp.service`, `DevelopmentOtpStore` → `OtpService`.

- [ ] **Step 8: Run the new spec to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/auth/otp.service.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/auth/otp.service.ts apps/api/src/auth/otp.service.spec.ts apps/api/src/auth/otp.test-fixture.ts apps/api/src/auth/auth.service.ts apps/api/src/auth/driver-auth.service.ts
git rm apps/api/src/auth/development-otp-store.ts 2>/dev/null || true
git commit -m "feat: replace development otp store with sms-backed otp service"
```

(This commit intentionally leaves the other 8 spec files broken — Task 6 fixes them. If your git workflow requires every commit to pass tests, squash Task 5 and Task 6 into one commit instead; do not skip either step's content.)

---

### Task 6: Update all existing call sites to the test fixture

**Files:**
- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/auth/driver-auth.service.spec.ts`
- Modify: `apps/api/src/auth/auth.controller.spec.ts`
- Modify: `apps/api/src/auth/auth.integration.spec.ts`
- Modify: `apps/api/src/auth/rider-auth.guard.spec.ts`
- Modify: `apps/api/src/riders/rider-profile.service.spec.ts`
- Modify: `apps/api/src/riders/rider-profile.controller.spec.ts`
- Modify: `apps/api/src/realtime/realtime.gateway.spec.ts`

**Interfaces:**
- Consumes: `createTestOtpService` from `apps/api/src/auth/otp.test-fixture.ts` (Task 5).

- [ ] **Step 1: Confirm the current failure**

Run: `cd apps/api && pnpm exec vitest run 2>&1 | grep -E "FAIL|Cannot find"`
Expected: failures in all 8 files above, each citing `Cannot find module './development-otp-store'` or similar.

- [ ] **Step 2: Apply the mechanical replacement to each file**

In each of the 8 files, replace the import:

```ts
import { DevelopmentOtpStore } from "./development-otp-store";
```
(or the `../auth/development-otp-store` relative variant for files outside `src/auth/`)

with:

```ts
import { createTestOtpService } from "./otp.test-fixture";
```
(or `../auth/otp.test-fixture` for files outside `src/auth/`)

And replace every `new DevelopmentOtpStore()` call with `createTestOtpService()`.

Concretely:
- `apps/api/src/auth/auth.service.spec.ts`: 5 occurrences of `new DevelopmentOtpStore()`.
- `apps/api/src/auth/driver-auth.service.spec.ts`: 6 occurrences.
- `apps/api/src/auth/auth.controller.spec.ts`: 1 occurrence.
- `apps/api/src/auth/auth.integration.spec.ts`: 1 occurrence.
- `apps/api/src/auth/rider-auth.guard.spec.ts`: 1 occurrence.
- `apps/api/src/riders/rider-profile.service.spec.ts`: 1 occurrence.
- `apps/api/src/riders/rider-profile.controller.spec.ts`: 1 occurrence.
- `apps/api/src/realtime/realtime.gateway.spec.ts`: 8 occurrences.

Use a project-wide search/replace scoped to these 8 files rather than editing by hand one-by-one, then re-check each file compiles.

- [ ] **Step 3: Run the full API test suite**

Run: `cd apps/api && pnpm exec vitest run`
Expected: all test files pass, no `Cannot find module` errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/auth.service.spec.ts apps/api/src/auth/driver-auth.service.spec.ts apps/api/src/auth/auth.controller.spec.ts apps/api/src/auth/auth.integration.spec.ts apps/api/src/auth/rider-auth.guard.spec.ts apps/api/src/riders/rider-profile.service.spec.ts apps/api/src/riders/rider-profile.controller.spec.ts apps/api/src/realtime/realtime.gateway.spec.ts
git commit -m "test: switch otp store call sites to the test fixture"
```

---

### Task 7: Wire `OtpService`, `SmsProvider`, `OtpRateLimiter`, and a Redis client into `app.module.ts`

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/redis/redis-client.provider.ts`

**Interfaces:**
- Consumes: `OtpService` (Task 5), `TwilioSmsProvider`/`DevelopmentSmsProvider` (Tasks 2/3), `OtpRateLimiter` (Task 4).
- Produces: a `REDIS_CLIENT` DI token (exported `const REDIS_CLIENT = Symbol("REDIS_CLIENT")`) providing an `ioredis` instance, for `OtpRateLimiter` and (Task 8) the throttler storage adapter to consume.

- [ ] **Step 1: Add the `ioredis` dependency**

Run: `cd apps/api && pnpm add ioredis@5.11.1`

- [ ] **Step 2: Create the Redis client provider**

Create `apps/api/src/redis/redis-client.provider.ts`:

```ts
import Redis from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

export function createRedisClient(): Redis {
  const url = process.env.TAMI_REDIS_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TAMI_REDIS_URL is required in production");
    }
    return new Redis("redis://127.0.0.1:6390");
  }
  return new Redis(url);
}
```

- [ ] **Step 3: Update `app.module.ts` imports**

Add these imports alongside the existing `notifications`/`places` provider imports:

```ts
import { DevelopmentSmsProvider } from "./sms/development-sms.provider";
import { SmsProvider } from "./sms/sms.provider";
import { TwilioSmsProvider } from "./sms/twilio-sms.provider";
import { OtpRateLimiter } from "./auth/otp-rate-limiter";
import { OtpService } from "./auth/otp.service";
import { REDIS_CLIENT, createRedisClient } from "./redis/redis-client.provider";
```

Remove the now-stale import:

```ts
import { DevelopmentOtpStore } from "./auth/development-otp-store";
```

- [ ] **Step 4: Replace the `DevelopmentOtpStore` provider entry**

In the `providers:` array, replace:

```ts
    DevelopmentOtpStore,
```

with:

```ts
    OtpService,
    OtpRateLimiter,
    {
      provide: REDIS_CLIENT,
      useFactory: createRedisClient,
    },
    {
      provide: SmsProvider,
      useFactory: createSmsProvider,
    },
```

Note `OtpRateLimiter`'s constructor takes a `Redis` positional argument, not the `REDIS_CLIENT` token directly — NestJS needs `@Inject(REDIS_CLIENT)` on that constructor param. Update `apps/api/src/auth/otp-rate-limiter.ts` from Task 4 to add the decorator:

```ts
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis-client.provider";

@Injectable()
export class OtpRateLimiter {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  // ... rest unchanged
```

- [ ] **Step 5: Add the `createSmsProvider` factory function**

At the bottom of `app.module.ts`, alongside `createPushNotificationProvider`:

```ts
function createSmsProvider(): SmsProvider {
  const accountSid = process.env.TAMI_TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TAMI_TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TAMI_TWILIO_FROM_NUMBER?.trim();
  if (accountSid && authToken && fromNumber) {
    return new TwilioSmsProvider({accountSid, authToken, fromNumber});
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TAMI_TWILIO_ACCOUNT_SID, TAMI_TWILIO_AUTH_TOKEN, and TAMI_TWILIO_FROM_NUMBER are required in production",
    );
  }
  return new DevelopmentSmsProvider();
}
```

- [ ] **Step 6: Run typecheck**

Run: `cd apps/api && pnpm run typecheck`
Expected: no errors.

- [ ] **Step 7: Run the full test suite**

Run: `cd apps/api && pnpm exec vitest run`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/src/app.module.ts apps/api/src/redis/redis-client.provider.ts apps/api/src/auth/otp-rate-limiter.ts
git commit -m "feat: wire otp service, sms provider, and redis client into app module"
```

---

### Task 8: Strip `developmentCode` from production HTTP responses; 502 on SMS failure

**Files:**
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/driver-auth.controller.ts`
- Test: `apps/api/src/auth/auth.controller.spec.ts` (already updated in Task 6 for the fixture swap; this task adds production-shape coverage)
- Test: `apps/api/src/auth/driver-auth.controller.spec.ts` — **check first whether this file exists**; if not, create it following the shape of `auth.controller.spec.ts`.

**Interfaces:**
- Consumes: `OtpService.issue` (Task 5) — returns `{challengeId, developmentCode, expiresAt}` where `developmentCode` is `""` in production.
- Produces: controller-level response shaping — `{challengeId, expiresAt}` in production, `{challengeId, developmentCode, expiresAt}` otherwise.

- [ ] **Step 1: Check whether `driver-auth.controller.spec.ts` exists**

Run: `test -f apps/api/src/auth/driver-auth.controller.spec.ts && echo EXISTS || echo MISSING`

If `MISSING`, create it mirroring `auth.controller.spec.ts`'s structure but for `DriverAuthController`/`DriverAuthService`/`InMemoryDriverAuthRepository` (all three already exist in the codebase).

- [ ] **Step 2: Write the failing test**

Add to `apps/api/src/auth/auth.controller.spec.ts` (appending a new `it` block; keep the existing test from Task 6's fixture swap):

```ts
  it("omits the development code in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const controller = new AuthController(
        new AuthService(
          new InMemoryAuthRepository([{ id: "city_karachi", active: true }]),
          createTestOtpService(),
        ),
      );

      const challenge = await controller.requestOtp({ phone: "+923001234567" });

      expect(challenge).toEqual({
        challengeId: expect.any(String),
        expiresAt: expect.any(String),
      });
      expect(challenge).not.toHaveProperty("developmentCode");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
```

(Repeat the same test shape in `driver-auth.controller.spec.ts` for `DriverAuthController`.)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/auth/auth.controller.spec.ts`
Expected: FAIL — `challenge` currently includes `developmentCode: ""`.

- [ ] **Step 4: Update `auth.controller.ts`**

Change the `requestOtp` handler:

```ts
  @Post("otp")
  async requestOtp(@Body() request: { phone: string }) {
    const challenge = await this.authService.requestOtp(request.phone);
    if (process.env.NODE_ENV === "production") {
      return { challengeId: challenge.challengeId, expiresAt: challenge.expiresAt };
    }
    return challenge;
  }
```

- [ ] **Step 5: Apply the same change to `driver-auth.controller.ts`**

Same shape, same handler body, for `DriverAuthController.requestOtp`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/api && pnpm exec vitest run src/auth/auth.controller.spec.ts src/auth/driver-auth.controller.spec.ts`
Expected: PASS.

- [ ] **Step 7: Add a controller-level SMS-failure test**

Append to `apps/api/src/auth/auth.controller.spec.ts`:

```ts
  it("surfaces sms delivery failure as an error", async () => {
    const failingSmsService = new AuthService(
      new InMemoryAuthRepository([{ id: "city_karachi", active: true }]),
      new OtpService(
        { send: async () => { throw new Error("SMS delivery is unavailable"); } },
        { assertNotRateLimited: async () => undefined } as never,
      ),
    );
    const controller = new AuthController(failingSmsService);

    await expect(
      controller.requestOtp({ phone: "+923001234567" }),
    ).rejects.toThrow("SMS delivery is unavailable");
  });
```

Add the corresponding imports (`OtpService`) at the top of the file.

- [ ] **Step 8: Run test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/auth/auth.controller.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/auth/auth.controller.ts apps/api/src/auth/driver-auth.controller.ts apps/api/src/auth/auth.controller.spec.ts apps/api/src/auth/driver-auth.controller.spec.ts
git commit -m "feat: strip development otp code from production responses"
```

---

### Task 9: `@nestjs/throttler` per-IP guard on the four auth routes

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/driver-auth.controller.ts`
- Test: `apps/api/src/auth/auth.controller.spec.ts`

**Interfaces:**
- Produces: `ThrottlerModule` registered globally in `AppModule` with a Redis storage backend; `@Throttle` decorators applied to the four routes (`otp`/`verify` on both controllers).

- [ ] **Step 1: Add dependencies**

Run: `cd apps/api && pnpm add @nestjs/throttler@6.5.0 @nest-lab/throttler-storage-redis@1.2.0`

- [ ] **Step 2: Write the failing test**

Append to `apps/api/src/auth/auth.controller.spec.ts`:

```ts
  it("applies a 10-request-per-10-minute throttle to the otp route", () => {
    const limit = Reflect.getMetadata(
      "THROTTLER:LIMITdefault",
      AuthController.prototype.requestOtp,
    );
    const ttl = Reflect.getMetadata(
      "THROTTLER:TTLdefault",
      AuthController.prototype.requestOtp,
    );

    expect(limit).toBe(10);
    expect(ttl).toBe(600000);
  });
```

`@nestjs/throttler`'s `@Throttle` decorator stores each option (`limit`, `ttl`, ...) under its own `Reflect` metadata key, suffixed with the throttler name (`"default"` here) — e.g. `THROTTLER:LIMIT` + `"default"` — rather than one combined object, which is why the test reads two separate keys instead of one options blob.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/auth/auth.controller.spec.ts`
Expected: FAIL — both `limit` and `ttl` are `undefined` (no `@Throttle` applied yet).

- [ ] **Step 4: Register `ThrottlerModule` in `app.module.ts`**

Add imports:

```ts
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { APP_GUARD } from "@nestjs/core";
```

Add to the `@Module` decorator's `imports:` array (create one if it doesn't exist yet — check the current `@Module` block first, since it may only have `controllers`/`providers` today):

```ts
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{ limit: 10, ttl: 600000 }],
        storage: new ThrottlerStorageRedisService(createRedisClient()),
      }),
    }),
  ],
```

Add to `providers:`:

```ts
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
```

- [ ] **Step 5: Apply `@Throttle` to the four routes**

In `auth.controller.ts`, import `Throttle` from `@nestjs/throttler` and decorate:

```ts
  @Post("otp")
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  async requestOtp(@Body() request: { phone: string }) {
```

and

```ts
  @Post("verify")
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  verifyRider(@Body() request: VerifyRiderRequest) {
```

Apply the identical decorators to `DriverAuthController.requestOtp` and `DriverAuthController.verifyDriver`.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/auth/auth.controller.spec.ts`
Expected: PASS.

- [ ] **Step 7: Run the full test suite and typecheck**

Run: `cd apps/api && pnpm run typecheck && pnpm exec vitest run`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/src/app.module.ts apps/api/src/auth/auth.controller.ts apps/api/src/auth/driver-auth.controller.ts apps/api/src/auth/auth.controller.spec.ts
git commit -m "feat: add per-ip rate limiting to auth otp and verify routes"
```

---

### Task 10: Redis health check

**Files:**
- Modify: `apps/api/src/health/health.controller.ts`
- Test: `apps/api/src/health/health.controller.spec.ts`

**Interfaces:**
- Consumes: `REDIS_CLIENT` token (Task 7).
- Produces: `GET /health` returns `{status: "ok" | "degraded", service: "tami-api", redis: "ok" | "unreachable"}`.

- [ ] **Step 1: Read the existing spec to match its style**

Run: `cat apps/api/src/health/health.controller.spec.ts`

- [ ] **Step 2: Write the failing test**

Replace the contents of `apps/api/src/health/health.controller.spec.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports ok when redis responds", async () => {
    const redis = { ping: vi.fn().mockResolvedValue("PONG") };
    const controller = new HealthController(redis as never);

    await expect(controller.check()).resolves.toEqual({
      status: "ok",
      service: "tami-api",
      redis: "ok",
    });
  });

  it("reports degraded when redis is unreachable", async () => {
    const redis = { ping: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) };
    const controller = new HealthController(redis as never);

    await expect(controller.check()).resolves.toEqual({
      status: "degraded",
      service: "tami-api",
      redis: "unreachable",
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/health/health.controller.spec.ts`
Expected: FAIL — constructor takes no arguments today.

- [ ] **Step 4: Update `health.controller.ts`**

```ts
import { Controller, Get, Inject } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis-client.provider";

@Controller("health")
export class HealthController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @Get()
  async check() {
    const redisStatus = await this.checkRedis();
    return {
      status: redisStatus === "ok" ? "ok" : "degraded",
      service: "tami-api",
      redis: redisStatus,
    };
  }

  private async checkRedis(): Promise<"ok" | "unreachable"> {
    try {
      await this.redis.ping();
      return "ok";
    } catch {
      return "unreachable";
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/health/health.controller.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/health/health.controller.ts apps/api/src/health/health.controller.spec.ts
git commit -m "feat: check redis connectivity in the health endpoint"
```

---

### Task 11: Documentation and full-gate verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the "Rider Development Login" section**

In `README.md`, rewrite the paragraph currently starting "The current rider login flow is development-only..." to:

```markdown
## Rider Login

`POST /auth/rider/otp` sends a six-digit code by SMS (via the configured
`SmsProvider`) and returns a `challengeId`; `POST /auth/rider/verify`
exchanges the code and a selected city ID for a Tami bearer token. Outside
production, the response also includes `developmentCode` so the code can be
read directly without a live SMS account — this field is omitted in
production. Configure `TAMI_TWILIO_ACCOUNT_SID`, `TAMI_TWILIO_AUTH_TOKEN`,
and `TAMI_TWILIO_FROM_NUMBER` for real SMS delivery; the API refuses to
boot in production without them. OTP requests are rate-limited to 3 per
phone number and 10 per IP address per 10 minutes.
```

Update the "Driver Ride Loop" section's opening sentence ("Drivers sign in with the same phone/OTP/city flow...") to add: "(see Rider Login above for the SMS/rate-limiting configuration, which the driver flow shares)."

- [ ] **Step 2: Add Redis to the "Production Deployment" section**

Add a line noting `TAMI_REDIS_URL` alongside the existing `TAMI_NOMINATIM_BASE_URL`/`TAMI_ROUTING_BASE_URL` production-required-vars sentence, and add `TAMI_TWILIO_ACCOUNT_SID`, `TAMI_TWILIO_AUTH_TOKEN`, `TAMI_TWILIO_FROM_NUMBER` to the same list.

- [ ] **Step 3: Run the full workspace gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all green.

- [ ] **Step 4: Run the database integration suite**

Run: `docker compose up -d postgres redis && DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" RUN_DATABASE_TESTS=true pnpm --filter @tami/api test:integration`
Expected: passes.

- [ ] **Step 5: Manual smoke test against a live Redis (development SMS provider)**

Run: `docker compose up -d postgres redis nominatim && cd apps/api && pnpm run dev`

In a second terminal:
```bash
curl -s -X POST http://127.0.0.1:4000/auth/rider/otp -H "content-type: application/json" -d '{"phone": "+923001234567"}'
```
Expected: JSON response with `challengeId`, `developmentCode` (6 digits), `expiresAt`; server log line `[dev sms] -> +923001234567: Your Tami verification code is ...`.

Run the same request 4 times in a row within 10 minutes; the 4th should return HTTP 429 with a `retryAfterSeconds` field.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: document real sms otp delivery and rate limiting"
```

## Self-Review Notes

- **Spec coverage**: `SmsProvider`/`TwilioSmsProvider`/`DevelopmentSmsProvider` (Tasks 2–3), factory wiring (Task 7), response shape change (Task 8), per-phone + per-IP rate limiting (Tasks 4, 9), Redis infra (Tasks 1, 7), health check (Task 10), docs (Task 11) — every spec section has a task.
- **Placeholder scan**: no TBD/TODO; every code step shows complete code.
- **Type consistency checked**: `OtpService.issue` return type `DevelopmentOtpChallenge` is identical across Tasks 5, 8, 9; `SmsProvider.send(phone, body)` signature matches across Tasks 2, 3, 5; `OtpRateLimiter.assertNotRateLimited(phone)` matches across Tasks 4, 5, 7.
- Task 5's commit intentionally lands mid-broken (other spec files not yet updated) — flagged explicitly with a squash alternative for teams that require every commit green.
- **Verified against real package internals** (not assumed): extracted `@nestjs/throttler@6.5.0`'s published `dist/throttler.constants.js` and `dist/throttler.decorator.js` to confirm `@Throttle` stores each option under its own suffixed `Reflect` metadata key (e.g. `THROTTLER:LIMIT` + throttler name) rather than one combined object — Task 9's test was corrected from an initial guess to match. Also confirmed `@nest-lab/throttler-storage-redis` latest is `1.2.0` (plan initially guessed `1.1.0`) and its peer deps are satisfied by this project's `@nestjs/throttler@6.5.0`/`ioredis@5.11.1`.
