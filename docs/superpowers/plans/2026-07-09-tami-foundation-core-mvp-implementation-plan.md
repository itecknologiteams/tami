# Tami Foundation and Core MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial Tami Hailing development foundation: monorepo, shared domain model, backend API shell, ride state machine, real-time contract, and app shells for admin, rider, and driver.

**Architecture:** Use a TypeScript pnpm monorepo with a NestJS modular backend, Next.js admin command center, Flutter mobile app, and shared domain package. The first backend is a modular monolith with PostgreSQL/PostGIS, Prisma, Redis-ready boundaries, and strict ride state transition tests before any dispatch complexity is added.

**Tech Stack:** TypeScript, Dart, pnpm workspaces, Flutter, NestJS, Prisma, PostgreSQL/PostGIS, Redis, Next.js, React, Tailwind CSS, MapLibre-compatible Flutter maps, Zod, TanStack Query.

## Mobile Stack Amendment

2026-07-09 update: the mobile direction is changed from React Native to Flutter/Dart so rider and driver apps can share one mobile codebase. The React Native rider and driver scaffold tasks in this plan are superseded by `docs/superpowers/plans/2026-07-09-tami-mobile-flutter-migration-plan.md`.

Updated mobile target:

- Create one Flutter project at `apps/mobile`.
- Build rider as Android/iOS Flutter app.
- Build driver as Android-only Flutter app for infotainment.
- Use app flavors or separate entry points for rider and driver.
- Keep shared ride state, API, map, chat, auth, theme, and localization code inside the Flutter project.
- Select a Flutter MapLibre package before implementing map screens.

## Global Constraints

- Follow `tech_stack.md`.
- Use MapLibre-based public maps without making `maplibre-gl-js` the default map implementation.
- Support multi-city Sindh from day one.
- Operations are centrally managed for the first launch.
- Implement strict ride state management with auditable transitions.
- Open driver/rider chat only after ride acceptance.
- Keep payment providers behind internal interfaces.
- Keep driver contract/payout rules configurable.
- Commit after each task.

---

## Scope Boundary

This plan covers the first executable development slice. It does not complete the full government mobility platform. Later plans should cover:

- Full dispatch optimization.
- Wallet provider integrations.
- Dynamic pricing administration.
- Complaint and incident workflows.
- Driver contract and payout management.
- Heatmaps and government reporting dashboards.
- Production deployment and observability hardening.

## Planned File Structure

- Create: `package.json` for root scripts and workspaces.
- Create: `pnpm-workspace.yaml` for monorepo package discovery.
- Create: `tsconfig.base.json` for shared TypeScript settings.
- Create: `.gitignore` for generated files and secrets.
- Create: `.editorconfig` for consistent editing rules.
- Create: `apps/api` for the NestJS backend.
- Create: `apps/admin` for the Next.js admin command center.
- Create: `apps/mobile` for the Flutter rider and driver app variants. The earlier React Native `apps/rider` and `apps/driver` scaffolds are superseded by the Flutter migration plan.
- Create: `packages/shared` for domain types, schemas, and ride state logic.
- Create: `packages/config` for shared TypeScript and lint configuration.
- Modify: `tech_stack.md` only when a stack decision changes.

---

### Task 1: Initialize Monorepo Foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`

**Interfaces:**
- Consumes: No prior project code.
- Produces: Workspace scripts and TypeScript base configuration used by all later tasks.

- [ ] **Step 1: Create root workspace files**

Create `package.json`:

```json
{
  "name": "tami-hailing",
  "private": true,
  "packageManager": "pnpm@latest",
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm -r --parallel dev",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

Create `.gitignore`:

```gitignore
node_modules
.pnpm-store
.turbo
dist
build
.next
coverage
.env
.env.*
!.env.example
*.log
ios/Pods
android/.gradle
android/app/build
```

Create `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
```

- [ ] **Step 2: Create shared config package**

Create `packages/config/package.json`:

```json
{
  "name": "@tami/config",
  "private": true,
  "version": "0.0.0"
}
```

Create `packages/config/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json"
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile is created and install exits with code 0.

- [ ] **Step 4: Verify workspace command**

Run:

```bash
pnpm typecheck
```

Expected: command exits with code 0 or reports no matching package scripts before app packages exist.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .editorconfig packages/config
git commit -m "chore: initialize monorepo foundation"
```

---

### Task 2: Create Shared Domain Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/geo.ts`
- Create: `packages/shared/src/ride-states.ts`
- Create: `packages/shared/src/ride-state-machine.ts`
- Create: `packages/shared/src/ride-state-machine.test.ts`

**Interfaces:**
- Consumes: Root TypeScript config from Task 1.
- Produces:
  - `RideState`
  - `RideTransitionActorType`
  - `RideStateTransitionInput`
  - `canTransitionRideState(from: RideState, to: RideState): boolean`
  - `assertRideStateTransition(input: RideStateTransitionInput): RideStateTransitionInput`

- [ ] **Step 1: Add shared package configuration**

Create `packages/shared/package.json`:

```json
{
  "name": "@tami/shared",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "latest"
  },
  "devDependencies": {
    "vitest": "latest"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing ride state tests**

Create `packages/shared/src/ride-state-machine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  assertRideStateTransition,
  canTransitionRideState,
} from "./ride-state-machine";

describe("ride state machine", () => {
  it("allows the normal ride lifecycle", () => {
    expect(canTransitionRideState("requested", "matching")).toBe(true);
    expect(canTransitionRideState("matching", "offered_to_driver")).toBe(true);
    expect(canTransitionRideState("offered_to_driver", "accepted")).toBe(true);
    expect(canTransitionRideState("accepted", "driver_en_route_to_pickup")).toBe(true);
    expect(canTransitionRideState("driver_en_route_to_pickup", "arrived_at_pickup")).toBe(true);
    expect(canTransitionRideState("arrived_at_pickup", "rider_onboarded")).toBe(true);
    expect(canTransitionRideState("rider_onboarded", "in_progress")).toBe(true);
    expect(canTransitionRideState("in_progress", "arrived_at_destination")).toBe(true);
    expect(canTransitionRideState("arrived_at_destination", "payment_pending")).toBe(true);
    expect(canTransitionRideState("payment_pending", "completed")).toBe(true);
  });

  it("blocks invalid backward transitions", () => {
    expect(canTransitionRideState("completed", "in_progress")).toBe(false);
    expect(() =>
      assertRideStateTransition({
        rideId: "ride_123",
        from: "completed",
        to: "in_progress",
        actorType: "driver",
        actorId: "driver_123",
        occurredAt: "2026-07-09T12:00:00.000Z",
      }),
    ).toThrow("Invalid ride state transition: completed -> in_progress");
  });

  it("allows cancellation from active pre-completion states", () => {
    expect(canTransitionRideState("requested", "cancelled_by_rider")).toBe(true);
    expect(canTransitionRideState("accepted", "cancelled_by_driver")).toBe(true);
    expect(canTransitionRideState("in_progress", "cancelled_by_admin")).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter @tami/shared test
```

Expected: FAIL because `./ride-state-machine` does not exist yet.

- [ ] **Step 4: Implement shared domain types**

Create `packages/shared/src/ride-states.ts`:

```ts
export const normalRideStates = [
  "requested",
  "matching",
  "offered_to_driver",
  "accepted",
  "driver_en_route_to_pickup",
  "arrived_at_pickup",
  "rider_onboarded",
  "in_progress",
  "arrived_at_destination",
  "payment_pending",
  "completed",
] as const;

export const exceptionRideStates = [
  "cancelled_by_rider",
  "cancelled_by_driver",
  "cancelled_by_admin",
  "no_show",
  "driver_timeout",
  "payment_failed",
  "disputed",
  "incident_reported",
] as const;

export type NormalRideState = (typeof normalRideStates)[number];
export type ExceptionRideState = (typeof exceptionRideStates)[number];
export type RideState = NormalRideState | ExceptionRideState;

export type RideTransitionActorType = "rider" | "driver" | "admin" | "system";
```

Create `packages/shared/src/geo.ts`:

```ts
export type Coordinates = {
  latitude: number;
  longitude: number;
};
```

- [ ] **Step 5: Implement ride state machine**

Create `packages/shared/src/ride-state-machine.ts`:

```ts
import type { Coordinates } from "./geo";
import type { RideState, RideTransitionActorType } from "./ride-states";

const transitions: Record<RideState, readonly RideState[]> = {
  requested: ["matching", "cancelled_by_rider", "cancelled_by_admin"],
  matching: ["offered_to_driver", "driver_timeout", "cancelled_by_rider", "cancelled_by_admin"],
  offered_to_driver: ["accepted", "driver_timeout", "cancelled_by_rider", "cancelled_by_admin"],
  accepted: [
    "driver_en_route_to_pickup",
    "cancelled_by_rider",
    "cancelled_by_driver",
    "cancelled_by_admin",
    "incident_reported",
  ],
  driver_en_route_to_pickup: [
    "arrived_at_pickup",
    "cancelled_by_rider",
    "cancelled_by_driver",
    "cancelled_by_admin",
    "incident_reported",
  ],
  arrived_at_pickup: [
    "rider_onboarded",
    "no_show",
    "cancelled_by_rider",
    "cancelled_by_driver",
    "cancelled_by_admin",
    "incident_reported",
  ],
  rider_onboarded: ["in_progress", "cancelled_by_admin", "incident_reported"],
  in_progress: [
    "arrived_at_destination",
    "cancelled_by_admin",
    "incident_reported",
    "disputed",
  ],
  arrived_at_destination: ["payment_pending", "disputed", "incident_reported"],
  payment_pending: ["completed", "payment_failed", "disputed"],
  completed: ["disputed"],
  cancelled_by_rider: ["disputed"],
  cancelled_by_driver: ["disputed"],
  cancelled_by_admin: ["disputed"],
  no_show: ["disputed"],
  driver_timeout: ["matching", "cancelled_by_admin"],
  payment_failed: ["payment_pending", "disputed"],
  disputed: [],
  incident_reported: ["disputed", "cancelled_by_admin"],
};

export type RideStateTransitionInput = {
  rideId: string;
  from: RideState;
  to: RideState;
  actorType: RideTransitionActorType;
  actorId: string;
  occurredAt: string;
  location?: Coordinates;
  reason?: string;
  source?: "rider_app" | "driver_app" | "admin" | "system";
};

export function canTransitionRideState(from: RideState, to: RideState): boolean {
  return transitions[from].includes(to);
}

export function assertRideStateTransition(
  input: RideStateTransitionInput,
): RideStateTransitionInput {
  if (!canTransitionRideState(input.from, input.to)) {
    throw new Error(`Invalid ride state transition: ${input.from} -> ${input.to}`);
  }

  return input;
}
```

Create `packages/shared/src/index.ts`:

```ts
export type { Coordinates } from "./geo";
export type {
  ExceptionRideState,
  NormalRideState,
  RideState,
  RideTransitionActorType,
} from "./ride-states";
export { exceptionRideStates, normalRideStates } from "./ride-states";
export type { RideStateTransitionInput } from "./ride-state-machine";
export {
  assertRideStateTransition,
  canTransitionRideState,
} from "./ride-state-machine";
```

- [ ] **Step 6: Run tests and typecheck**

Run:

```bash
pnpm --filter @tami/shared test
pnpm --filter @tami/shared typecheck
```

Expected: both commands exit with code 0.

- [ ] **Step 7: Commit**

```bash
git add packages/shared package.json pnpm-lock.yaml
git commit -m "feat: add shared ride state domain"
```

---

### Task 3: Scaffold Backend API Shell

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.controller.spec.ts`

**Interfaces:**
- Consumes: `@tami/shared` package from Task 2.
- Produces: NestJS API with `GET /health` returning `{ "status": "ok", "service": "tami-api" }`.

- [ ] **Step 1: Add API package configuration**

Create `apps/api/package.json`:

```json
{
  "name": "@tami/api",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "latest",
    "@nestjs/core": "latest",
    "@nestjs/platform-express": "latest",
    "@tami/shared": "workspace:*",
    "reflect-metadata": "latest",
    "rxjs": "latest"
  },
  "devDependencies": {
    "@nestjs/cli": "latest",
    "@nestjs/testing": "latest",
    "@types/node": "latest",
    "eslint": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing health controller test**

Create `apps/api/src/health/health.controller.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns API health", () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      status: "ok",
      service: "tami-api",
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter @tami/api test
```

Expected: FAIL because `health.controller.ts` does not exist yet.

- [ ] **Step 4: Implement API shell**

Create `apps/api/src/health/health.controller.ts`:

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "tami-api",
    };
  }
}
```

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";

@Module({
  controllers: [HealthController],
})
export class AppModule {}
```

Create `apps/api/src/main.ts`:

```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
```

- [ ] **Step 5: Run API checks**

Run:

```bash
pnpm install
pnpm --filter @tami/api test
pnpm --filter @tami/api typecheck
```

Expected: install exits with code 0; test and typecheck exit with code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api package.json pnpm-lock.yaml
git commit -m "feat: scaffold api shell"
```

---

### Task 4: Add Ride Module Transition Service

**Files:**
- Create: `apps/api/src/rides/ride-transition.service.ts`
- Create: `apps/api/src/rides/ride-transition.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `assertRideStateTransition(input: RideStateTransitionInput)` from `@tami/shared`.
- Produces:
  - `RideTransitionService.recordTransition(input: RideStateTransitionInput): RideStateTransitionInput`

- [ ] **Step 1: Write failing service test**

Create `apps/api/src/rides/ride-transition.service.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RideTransitionService } from "./ride-transition.service";

describe("RideTransitionService", () => {
  it("records a valid transition", () => {
    const service = new RideTransitionService();

    const transition = service.recordTransition({
      rideId: "ride_123",
      from: "requested",
      to: "matching",
      actorType: "system",
      actorId: "system",
      occurredAt: "2026-07-09T12:00:00.000Z",
      source: "system",
    });

    expect(transition.to).toBe("matching");
  });

  it("rejects invalid transitions", () => {
    const service = new RideTransitionService();

    expect(() =>
      service.recordTransition({
        rideId: "ride_123",
        from: "completed",
        to: "accepted",
        actorType: "admin",
        actorId: "admin_123",
        occurredAt: "2026-07-09T12:00:00.000Z",
        source: "admin",
      }),
    ).toThrow("Invalid ride state transition: completed -> accepted");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @tami/api test
```

Expected: FAIL because `ride-transition.service.ts` does not exist yet.

- [ ] **Step 3: Implement ride transition service**

Create `apps/api/src/rides/ride-transition.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import {
  assertRideStateTransition,
  type RideStateTransitionInput,
} from "@tami/shared";

@Injectable()
export class RideTransitionService {
  recordTransition(input: RideStateTransitionInput): RideStateTransitionInput {
    return assertRideStateTransition(input);
  }
}
```

Modify `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { RideTransitionService } from "./rides/ride-transition.service";

@Module({
  controllers: [HealthController],
  providers: [RideTransitionService],
})
export class AppModule {}
```

- [ ] **Step 4: Run API checks**

Run:

```bash
pnpm --filter @tami/api test
pnpm --filter @tami/api typecheck
```

Expected: both commands exit with code 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src
git commit -m "feat: add ride transition service"
```

---

### Task 5: Scaffold Admin Command Center Shell

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/next.config.mjs`
- Create: `apps/admin/src/app/layout.tsx`
- Create: `apps/admin/src/app/page.tsx`
- Create: `apps/admin/src/app/page.test.tsx`

**Interfaces:**
- Consumes: Monorepo TypeScript setup.
- Produces: Admin home screen with title `Tami Command Center`.

- [ ] **Step 1: Add admin package configuration**

Create `apps/admin/package.json`:

```json
{
  "name": "@tami/admin",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "build": "next build",
    "dev": "next dev --port 3000",
    "lint": "next lint",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@tami/shared": "workspace:*",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Create `apps/admin/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `apps/admin/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 2: Write failing admin page test**

Create `apps/admin/src/app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("Admin home page", () => {
  it("renders command center title", () => {
    render(<Page />);

    expect(screen.getByText("Tami Command Center")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter @tami/admin test
```

Expected: FAIL because `page.tsx` does not exist yet.

- [ ] **Step 4: Implement admin shell**

Create `apps/admin/src/app/layout.tsx`:

```tsx
import type { ReactNode } from "react";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `apps/admin/src/app/page.tsx`:

```tsx
export default function Page() {
  return (
    <main>
      <h1>Tami Command Center</h1>
      <p>Central operations dashboard for the Sindh electric taxi fleet.</p>
    </main>
  );
}
```

- [ ] **Step 5: Run admin checks**

Run:

```bash
pnpm install
pnpm --filter @tami/admin test
pnpm --filter @tami/admin typecheck
```

Expected: install exits with code 0; test and typecheck exit with code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/admin package.json pnpm-lock.yaml
git commit -m "feat: scaffold admin command center"
```

---

### Task 6: Scaffold Rider App Shell (Superseded)

This task was superseded by the Flutter mobile migration plan. Do not use it for new implementation.

**Files:**
- Create: `apps/rider/package.json`
- Create: `apps/rider/tsconfig.json`
- Create: `apps/rider/App.tsx`
- Create: `apps/rider/src/HomeScreen.tsx`
- Create: `apps/rider/src/HomeScreen.test.tsx`

**Interfaces:**
- Consumes: `@tami/shared`.
- Produces: Rider app home screen with title `Book a Tami ride`.

- [ ] **Step 1: Add rider package configuration**

Create `apps/rider/package.json`:

```json
{
  "name": "@tami/rider",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "react-native start",
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@maplibre/maplibre-react-native": "latest",
    "@tami/shared": "workspace:*",
    "react": "latest",
    "react-native": "latest"
  },
  "devDependencies": {
    "@testing-library/react-native": "latest",
    "@types/react": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Create `apps/rider/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-native",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 2: Write failing rider home test**

Create `apps/rider/src/HomeScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { HomeScreen } from "./HomeScreen";

describe("HomeScreen", () => {
  it("renders the booking title", () => {
    render(<HomeScreen />);

    expect(screen.getByText("Book a Tami ride")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter @tami/rider test
```

Expected: FAIL because `HomeScreen.tsx` does not exist yet.

- [ ] **Step 4: Implement rider shell**

Create `apps/rider/src/HomeScreen.tsx`:

```tsx
import { Text, View } from "react-native";

export function HomeScreen() {
  return (
    <View>
      <Text>Book a Tami ride</Text>
      <Text>Immediate and scheduled rides across Sindh.</Text>
    </View>
  );
}
```

Create `apps/rider/App.tsx`:

```tsx
import { HomeScreen } from "./src/HomeScreen";

export default function App() {
  return <HomeScreen />;
}
```

- [ ] **Step 5: Run rider checks**

Run:

```bash
pnpm install
pnpm --filter @tami/rider test
pnpm --filter @tami/rider typecheck
```

Expected: install exits with code 0; test and typecheck exit with code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/rider package.json pnpm-lock.yaml
git commit -m "feat: scaffold rider app"
```

---

### Task 7: Scaffold Driver Android App Shell (Superseded)

This task was superseded by the Flutter mobile migration plan. Do not use it for new implementation.

**Files:**
- Create: `apps/driver/package.json`
- Create: `apps/driver/tsconfig.json`
- Create: `apps/driver/App.tsx`
- Create: `apps/driver/src/DriverHomeScreen.tsx`
- Create: `apps/driver/src/DriverHomeScreen.test.tsx`

**Interfaces:**
- Consumes: `@tami/shared`.
- Produces: Driver app home screen with title `Tami Driver`.

- [ ] **Step 1: Add driver package configuration**

Create `apps/driver/package.json`:

```json
{
  "name": "@tami/driver",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "react-native start",
    "android": "react-native run-android",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@maplibre/maplibre-react-native": "latest",
    "@tami/shared": "workspace:*",
    "react": "latest",
    "react-native": "latest"
  },
  "devDependencies": {
    "@testing-library/react-native": "latest",
    "@types/react": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Create `apps/driver/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-native",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 2: Write failing driver home test**

Create `apps/driver/src/DriverHomeScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { DriverHomeScreen } from "./DriverHomeScreen";

describe("DriverHomeScreen", () => {
  it("renders the driver title", () => {
    render(<DriverHomeScreen />);

    expect(screen.getByText("Tami Driver")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter @tami/driver test
```

Expected: FAIL because `DriverHomeScreen.tsx` does not exist yet.

- [ ] **Step 4: Implement driver shell**

Create `apps/driver/src/DriverHomeScreen.tsx`:

```tsx
import { Text, View } from "react-native";

export function DriverHomeScreen() {
  return (
    <View>
      <Text>Tami Driver</Text>
      <Text>Go online to receive assigned ride offers.</Text>
    </View>
  );
}
```

Create `apps/driver/App.tsx`:

```tsx
import { DriverHomeScreen } from "./src/DriverHomeScreen";

export default function App() {
  return <DriverHomeScreen />;
}
```

- [ ] **Step 5: Run driver checks**

Run:

```bash
pnpm install
pnpm --filter @tami/driver test
pnpm --filter @tami/driver typecheck
```

Expected: install exits with code 0; test and typecheck exit with code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/driver package.json pnpm-lock.yaml
git commit -m "feat: scaffold driver app"
```

---

### Task 8: Add Map Provider Contract

**Files:**
- Create: `packages/shared/src/maps.ts`
- Create: `packages/shared/src/maps.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `Coordinates` from `packages/shared/src/geo.ts`.
- Produces:
  - `MapProviderName = "maplibre_public"`
  - `MapStyleConfig`
  - `defaultSindhMapStyle`

- [ ] **Step 1: Write failing map provider tests**

Create `packages/shared/src/maps.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultSindhMapStyle } from "./maps";

describe("map provider config", () => {
  it("uses the approved MapLibre public provider", () => {
    expect(defaultSindhMapStyle.provider).toBe("maplibre_public");
  });

  it("does not use maplibre-gl-js as a package decision", () => {
    expect(defaultSindhMapStyle.webPackage).not.toBe("maplibre-gl-js");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @tami/shared test
```

Expected: FAIL because `maps.ts` does not exist yet.

- [ ] **Step 3: Implement map provider contract**

Create `packages/shared/src/maps.ts`:

```ts
import type { Coordinates } from "./geo";

export type MapProviderName = "maplibre_public";

export type MapStyleConfig = {
  provider: MapProviderName;
  mobilePackage: "@maplibre/maplibre-react-native";
  webPackage: "non_gl_admin_map_pending";
  styleUrl: string;
  defaultCenter: Coordinates;
  defaultZoom: number;
};

export const defaultSindhMapStyle: MapStyleConfig = {
  provider: "maplibre_public",
  mobilePackage: "@maplibre/maplibre-react-native",
  webPackage: "non_gl_admin_map_pending",
  styleUrl: "https://demotiles.maplibre.org/style.json",
  defaultCenter: {
    latitude: 24.8607,
    longitude: 67.0011,
  },
  defaultZoom: 11,
};
```

Modify `packages/shared/src/index.ts`:

```ts
export type { Coordinates } from "./geo";
export type {
  MapProviderName,
  MapStyleConfig,
} from "./maps";
export { defaultSindhMapStyle } from "./maps";
export type {
  ExceptionRideState,
  NormalRideState,
  RideState,
  RideTransitionActorType,
} from "./ride-states";
export { exceptionRideStates, normalRideStates } from "./ride-states";
export type { RideStateTransitionInput } from "./ride-state-machine";
export {
  assertRideStateTransition,
  canTransitionRideState,
} from "./ride-state-machine";
```

- [ ] **Step 4: Run shared checks**

Run:

```bash
pnpm --filter @tami/shared test
pnpm --filter @tami/shared typecheck
```

Expected: both commands exit with code 0.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src
git commit -m "feat: add approved map provider contract"
```

---

### Task 9: Add Development README

**Files:**
- Create: `README.md`
- Modify: `tech_stack.md` only if a verified stack decision changed during tasks.

**Interfaces:**
- Consumes: Completed monorepo scripts from earlier tasks.
- Produces: Contributor entry point for installing, testing, and understanding the first development slice.

- [ ] **Step 1: Create project README**

Create `README.md`:

```md
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

\`\`\`bash
pnpm install
\`\`\`

## Common Commands

\`\`\`bash
pnpm test
pnpm typecheck
pnpm build
\`\`\`

## Stack Guardrails

Read `tech_stack.md` before adding new frameworks, map libraries, payment providers, or backend services.

## Product Design

The approved platform design is in `docs/superpowers/specs/2026-07-09-tami-hailing-government-mobility-design.md`.

## First Implementation Plan

The first implementation plan is in `docs/superpowers/plans/2026-07-09-tami-foundation-core-mvp-implementation-plan.md`.
```

- [ ] **Step 2: Verify documentation references**

Run:

```bash
test -f tech_stack.md
test -f docs/superpowers/specs/2026-07-09-tami-hailing-government-mobility-design.md
test -f docs/superpowers/plans/2026-07-09-tami-foundation-core-mvp-implementation-plan.md
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Commit**

```bash
git add README.md tech_stack.md docs/superpowers/plans/2026-07-09-tami-foundation-core-mvp-implementation-plan.md
git commit -m "docs: add development stack and implementation plan"
```

---

## Self-Review Notes

Spec coverage in this plan:

- Multi-city architecture: covered by shared map config, domain package, and stack constraints.
- Ride state management: covered by Tasks 2 and 4.
- Driver/rider chat: acknowledged as a global constraint; implementation belongs in the next real-time/chat plan after API and app shells exist.
- Real-time layer: acknowledged as architecture; implementation belongs in the next backend/socket plan.
- Rider app: shell covered by Task 6.
- Driver app: shell covered by Task 7.
- Admin command center: shell covered by Task 5.
- Backend: API shell and ride transition service covered by Tasks 3 and 4.
- Payments/pricing/contracts: intentionally deferred to later plans after foundation and ride state are in place.
- MapLibre public maps without GL JS default: covered by `tech_stack.md` and Task 8.

Known follow-up plans:

- Ride booking API and database schema.
- Real-time dispatch, ride tracking, and chat.
- Rider booking UI with MapLibre map screen.
- Driver ride offer and navigation UI.
- Admin live operations dashboard.
- Pricing and payment reconciliation.
