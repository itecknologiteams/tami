# Tami Prisma Booking Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist booking API rides and their initial audit transition in PostgreSQL through Prisma, with a reproducible local PostGIS environment.

**Architecture:** The booking service remains independent of Prisma and depends on `BookingRepository`. Production NestJS wiring supplies `PrismaBookingRepository`, which translates between Prisma records and the existing booking domain types; it creates the ride and initial rider audit event in one database transaction. Unit tests continue to use `InMemoryBookingRepository` or a small Prisma-shaped fake. A Docker Compose PostGIS service provides the local database, while Prisma migrations create the schema.

**Tech Stack:** NestJS 11.1.6, TypeScript 5.9.3, Prisma 6.19.2, PostgreSQL 16 with PostGIS 3.4, Docker Compose, Vitest 3.2.4.

## Global Constraints

- Multi-city Sindh support from day one.
- Central operations team for the initial launch.
- Strict ride state machine and durable state-transition audit trail.
- Prisma remains pinned to 6.19.2 because Prisma 7 no longer accepts the datasource URL in `schema.prisma`.
- Use PostgreSQL/PostGIS; no vehicle telemetry is introduced.
- Keep unit tests independent of a running database.
- Production booking storage must preserve the existing `POST /bookings/rides` contract.

---

### Task 1: Add a Reproducible Local Database Workflow

**Files:**
- Create: `docker-compose.yml`
- Modify: `apps/api/package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `apps/api/.env.example` with `DATABASE_URL`.
- Produces: `docker compose up -d postgres`, `pnpm --filter @tami/api prisma:migrate:dev`, and documented startup steps.

- [x] **Step 1: Add the PostGIS Compose definition**

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: tami
      POSTGRES_USER: tami
      POSTGRES_PASSWORD: tami
    ports:
      - "127.0.0.1:5434:5432"
    volumes:
      - tami-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tami -d tami"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  tami-postgres-data:
```

- [x] **Step 2: Add Prisma migration scripts**

```json
"prisma:migrate:dev": "prisma migrate dev --schema prisma/schema.prisma",
"prisma:migrate:deploy": "prisma migrate deploy --schema prisma/schema.prisma"
```

- [x] **Step 3: Document the exact local sequence**

```bash
docker compose up -d postgres
cd apps/api
cp .env.example .env
pnpm prisma:migrate:deploy
pnpm prisma:seed
```

- [x] **Step 4: Verify the Compose definition**

Run: `docker compose config`

Expected: exit code 0 and a rendered `postgres` service.

- [x] **Step 5: Commit the workflow**

```bash
git add docker-compose.yml apps/api/package.json README.md
git commit -m "chore: add local postgis workflow"
```

### Task 2: Add the Prisma Booking Repository

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/bookings/prisma-booking.repository.ts`
- Create: `apps/api/src/bookings/prisma-booking.repository.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Consumes: `BookingRepository.createRideWithInitialTransition(request, requestedAt)` and `BookingRepository.recordTransition(transition)`.
- Produces: `PrismaBookingRepository extends BookingRepository`, using `PrismaService.$transaction` for `ride.create` and `rideStateTransition.create`.

- [x] **Step 1: Write a failing repository test for ride creation**

```ts
it("creates a requested ride and audit transition in one transaction", async () => {
  const prisma = createPrismaFake();
  const repository = new PrismaBookingRepository(prisma);

  await repository.createRideWithInitialTransition(baseRequest, requestedAt);

  expect(prisma.$transaction).toHaveBeenCalledOnce();
  expect(prisma.ride.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        city: { connect: { id: "city_karachi" } },
        rider: { connect: { id: "rider_123" } },
        category: { connect: { code: "standard_taxi" } },
        state: "requested",
      }),
    }),
  );
});
```

- [x] **Step 2: Run the repository test and verify it fails**

Run: `pnpm --filter @tami/api exec vitest run src/bookings/prisma-booking.repository.spec.ts`

Expected: FAIL because `PrismaBookingRepository` does not exist.

- [x] **Step 3: Write a failing transition-recording test**

```ts
it("writes the requested audit transition", async () => {
  const prisma = createPrismaFake();
  const repository = new PrismaBookingRepository(prisma);

  await repository.recordTransition(requestedTransition);

  expect(prisma.rideStateTransition.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      rideId: "ride_123",
      fromState: null,
      toState: "requested",
      actorType: "rider",
    }),
  });
});
```

- [x] **Step 4: Add Prisma service and repository implementation**

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```ts
@Injectable()
export class PrismaBookingRepository extends BookingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createRideWithInitialTransition(request: CreateRideRequest, requestedAt: string): Promise<BookingRide> {
    return this.prisma.$transaction(async (transaction) => {
      const ride = await transaction.ride.create({
        data: {
          city: { connect: { id: request.cityId } },
          rider: { connect: { id: request.riderId } },
          category: { connect: { code: request.categoryCode } },
          state: "requested",
          pickupLatitude: request.pickup.latitude,
          pickupLongitude: request.pickup.longitude,
          pickupAddress: request.pickup.address,
          destinationLatitude: request.destination.latitude,
          destinationLongitude: request.destination.longitude,
          destinationAddress: request.destination.address,
          scheduledPickupAt: request.scheduledPickupAt ? new Date(request.scheduledPickupAt) : null,
          requestedAt: new Date(requestedAt),
        },
        include: { category: true },
      });
      await transaction.rideStateTransition.create({
        data: {
          rideId: ride.id,
          fromState: null,
          toState: "requested",
          actorType: "rider",
          actorId: request.riderId,
          occurredAt: new Date(requestedAt),
        },
      });

      return toBookingRide(ride);
    });
  }
}
```

- [x] **Step 5: Wire Prisma into the application module**

```ts
providers: [
  PrismaService,
  BookingService,
  {
    provide: BookingRepository,
    useClass: PrismaBookingRepository,
  },
]
```

- [x] **Step 6: Generate the Prisma client before API build, test, and typecheck**

```json
"test": "pnpm --filter @tami/shared build && pnpm run prisma:generate && vitest run"
```

- [x] **Step 7: Run the repository test and API suite**

Run: `pnpm --filter @tami/api exec vitest run src/bookings/prisma-booking.repository.spec.ts && pnpm --filter @tami/api test`

Expected: all tests pass without a running database.

- [x] **Step 8: Commit the repository slice**

```bash
git add apps/api/src/prisma apps/api/src/bookings/prisma-booking.repository.ts apps/api/src/bookings/prisma-booking.repository.spec.ts apps/api/src/app.module.ts apps/api/package.json
git commit -m "feat: persist bookings with prisma"
```

### Task 3: Create the Initial Migration and Verify the Full Workspace

**Files:**
- Create: `apps/api/prisma/migrations/<timestamp>_init/migration.sql`
- Modify: `README.md`

**Interfaces:**
- Consumes: local `postgres` Docker service and `apps/api/prisma/schema.prisma`.
- Produces: a versioned initial Prisma migration and a seeded local database.

- [x] **Step 1: Start PostgreSQL/PostGIS and wait for health**

Run: `docker compose up -d postgres && docker compose ps`

Expected: `postgres` reports `healthy`.

- [x] **Step 2: Create the initial migration and seed the database**

Run: `cd apps/api && DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" pnpm exec prisma migrate dev --schema prisma/schema.prisma --name init && DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" pnpm prisma:seed`

Expected: migration applied and five Sindh cities plus ride categories seeded.

- [x] **Step 3: Run schema and workspace verification**

Run: `DATABASE_URL="postgresql://tami:tami@127.0.0.1:5434/tami" pnpm --filter @tami/api prisma:validate && pnpm test && pnpm typecheck && pnpm build && pnpm lint && pnpm mobile:test && pnpm mobile:analyze`

Expected: all commands exit 0.

- [x] **Step 4: Commit the migration and documentation**

```bash
git add apps/api/prisma/migrations README.md docs/superpowers/plans/2026-07-10-tami-prisma-booking-persistence-plan.md
git commit -m "docs: document prisma booking persistence"
```
