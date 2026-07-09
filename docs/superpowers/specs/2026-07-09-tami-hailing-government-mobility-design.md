# Tami Hailing Government Mobility Platform Design

Date: 2026-07-09
Status: Draft for review
Scope: Multi-city Sindh launch for a government-owned electric taxi service

## 1. Product Vision

Tami Hailing will be a government mobility platform for a centrally managed, multi-city electric taxi fleet across Sindh. The first operating fleet is expected to include approximately 1,000 EV taxis. The platform must support citizen ride booking, contracted driver operations, real-time command center visibility, dynamic pricing under government controls, payment reconciliation, and auditable operational reporting.

The system should be built as a government-grade platform rather than a simple taxi booking app. It must support launch operations now while leaving room for future integrations with EV charging systems, depot systems, public dashboards, emergency services, traffic systems, and transport authority reporting.

## 2. Approved Operating Assumptions

- The platform serves multiple cities across Sindh from day one.
- Operations are centrally managed for now by one government command team.
- Vehicles are electric taxis, but the first driver screen will not connect directly to vehicle telemetry.
- The driver device is an Android-based in-dash infotainment screen used for ride acceptance, fare display, and navigation.
- Riders can book immediate rides and scheduled rides.
- Riders sign up with quick phone OTP onboarding and can complete a personal profile with image later.
- Drivers are contracted drivers.
- Driver compensation rules are not settled, so the platform must support configurable contract models.
- Payments must support cash and local e-wallets such as JazzCash, Easypaisa, and NayaPay.
- Pricing must be dynamic, with admin-controlled overrides, caps, and audit logs.
- Ride categories should be supported from the start.
- Driver/rider chat must open once a ride is accepted.
- Ride state management must be strict, auditable, and resilient to network interruptions.

## 3. Platform Products

### 3.1 Rider Mobile App

The rider app will be available on Android and iOS. It allows citizens to book, track, pay for, and review taxi rides.

Core capabilities:

- OTP signup and login
- Personal profile with name, optional email, and profile photo
- Saved home, work, and favorite places
- City-aware pickup and destination selection
- Immediate ride booking
- Scheduled ride booking
- Ride category selection
- Fare estimate before confirmation
- Live driver tracking
- Ride state updates
- Driver/rider chat after ride acceptance
- Cash and e-wallet payment selection
- Trip receipt and trip history
- Cancellation and no-show handling
- Complaint and dispute submission
- Safety reporting and emergency contact workflow
- Multilingual readiness for English, Urdu, and Sindhi

### 3.2 Driver Android Infotainment App

The driver app will run on the dedicated Android in-dash screen. It should be optimized for clarity, low distraction, and fast decision-making while driving.

Core capabilities:

- Driver login
- Vehicle assignment
- Online, offline, and shift state
- Ride offer screen with accept/decline and timeout
- Pickup navigation
- Destination navigation
- Ride state controls
- Driver/rider chat after ride acceptance
- Fare and payment display
- Trip history
- Issue reporting
- Emergency/admin contact

The driver app will not require EV battery, range, charging, odometer, or diagnostics data in the first version.

### 3.3 Admin Command Center

The admin command center is a web application for the central government operations team.

Core capabilities:

- Live Sindh map with city, zone, depot, category, and vehicle filters
- Vehicle, driver, rider, and trip search
- Real-time ride monitoring
- Dispatch override tools
- Scheduled ride queue
- Demand and supply heatmaps
- Dynamic pricing controls
- Fare cap and policy controls
- Driver contract and payout configuration
- Cash and e-wallet reconciliation
- Complaint and dispute management
- Incident management
- City, zone, depot, and service area management
- Reporting dashboards
- Role-based access control
- Full audit logs

The command center should make abnormal rides highly visible, including long pickup delays, drivers not moving, riders waiting too long, route deviation, repeated cancellations, payment failure, complaints, and incidents.

### 3.4 Backend Platform

The backend platform provides the shared services and APIs used by the rider app, driver app, and admin command center.

Core backend modules:

- Identity and access management
- Booking service
- Dispatch and matching service
- Ride state machine
- Pricing service
- Payment and reconciliation service
- Real-time messaging service
- Notification service
- Location tracking service
- Complaint and incident service
- Driver contract service
- Admin reporting service
- Audit logging service
- Configuration and policy service

The first implementation should use a modular backend with clear boundaries rather than many independent microservices. Services can be split later when scale, team structure, or operational load justifies it.

## 4. Architecture Principles

### 4.1 Multi-City From Day One

Every important object should support city or zone context where relevant:

- Fares
- Categories
- Vehicles
- Drivers
- Depots
- Scheduled rides
- Demand heatmaps
- Reports
- Pricing overrides
- Operational policies
- Admin permissions

Karachi may launch first operationally, but the system must not be hardcoded around Karachi.

### 4.2 Central Operations First

The initial operations model is one central government team managing the Sindh fleet. The platform should still keep city, zone, and depot boundaries in the data model so local operations teams can be added later without redesigning the system.

### 4.3 API-First Platform

The backend should expose stable APIs for official first-party apps and future integrations. Future integrations may include:

- EV charging networks
- Depot management systems
- Government dashboards
- Emergency services
- Traffic data providers
- Transport authority systems
- Public reporting dashboards

### 4.4 Auditability

The platform must preserve a clear trail for pricing changes, dispatch decisions, ride state changes, payment events, driver actions, admin overrides, complaints, and incident handling.

## 5. Ride State Management

Ride state management is a core domain of the platform. Every ride must follow a strict state machine so operations can track trips, recover from network interruptions, investigate disputes, and produce government audit reports.

### 5.1 Normal Ride States

1. `requested`
2. `matching`
3. `offered_to_driver`
4. `accepted`
5. `driver_en_route_to_pickup`
6. `arrived_at_pickup`
7. `rider_onboarded`
8. `in_progress`
9. `arrived_at_destination`
10. `payment_pending`
11. `completed`

### 5.2 Exception States

- `cancelled_by_rider`
- `cancelled_by_driver`
- `cancelled_by_admin`
- `no_show`
- `driver_timeout`
- `payment_failed`
- `disputed`
- `incident_reported`

### 5.3 State Transition Audit Data

Each ride state transition must record:

- Ride ID
- Previous state
- New state
- Actor type: rider, driver, admin, or system
- Actor ID
- Timestamp
- Location when relevant
- Reason or system rule when relevant
- Source app or service
- Device/network metadata where useful

### 5.4 Recovery Rules

The ride state machine should tolerate app restarts and temporary network loss. The backend remains the source of truth. Rider and driver apps should resync the current ride state when they reconnect.

## 6. Driver/Rider Chat

Once a ride reaches `accepted`, the backend creates a private chat channel between the rider and driver.

Capabilities:

- Text messages
- Quick messages such as "I have arrived", "I am waiting", "Please call me", and "Where are you exactly?"
- Message timestamps and delivery state
- Admin visibility for complaints and investigations under role-based permissions
- Chat closure after ride completion or cancellation
- Chat history retention according to government policy

If voice calling is added later, phone number masking should be used to protect privacy.

## 7. Real-Time Layer

The platform needs a real-time layer for operational correctness and user experience.

Real-time events:

- Ride status updates
- Dispatch offers
- Driver accept/decline events
- Rider and driver location updates
- Chat messages
- Admin live map updates
- Scheduled ride assignment alerts
- Payment state changes
- Emergency and incident alerts

The backend remains authoritative. Real-time delivery improves responsiveness, but all critical events must also be persisted.

## 8. Ride Flow

### 8.1 Immediate Ride Flow

1. Rider selects pickup, destination, city, category, and payment method.
2. Backend calculates a fare estimate using city rules, distance, time, category, demand/supply conditions, and admin caps.
3. Rider confirms the request.
4. Ride enters `requested`, then `matching`.
5. Dispatch engine identifies eligible nearby drivers.
6. Ride offer is sent to one or more drivers depending on the dispatch strategy.
7. Driver accepts.
8. Ride enters `accepted`, chat opens, and live tracking begins.
9. Driver navigates to pickup.
10. Driver marks arrival at pickup.
11. Rider boards and trip starts.
12. Driver navigates to destination.
13. Trip ends and final fare is calculated.
14. Rider pays by cash or e-wallet.
15. Backend records receipt, payment event, driver economics, reconciliation entry, ride audit trail, and reporting data.

### 8.2 Scheduled Ride Flow

1. Rider creates a scheduled ride with pickup time, pickup, destination, category, and payment method.
2. System validates service availability and estimates fare.
3. Scheduled ride appears in admin queue.
4. Rider receives reminder notifications before pickup.
5. Dispatch assignment begins before the pickup window according to city/category policy.
6. Admin dashboard highlights unassigned or at-risk scheduled rides.
7. Once a driver accepts, the normal ride flow continues.

## 9. Dispatch and Matching

The dispatch engine should consider:

- City and zone
- Driver online/shift status
- Driver distance to pickup
- Driver heading and recent movement
- Vehicle/category eligibility
- Scheduled ride priority
- Recent driver cancellation behavior
- Driver workload and fairness
- Admin dispatch overrides
- Service area restrictions

Initial dispatch can use a practical rules-based model. Later versions can add optimization, batching, demand prediction, and machine learning.

## 10. Ride Categories

Ride categories should be configurable. Initial categories can include:

- Standard Taxi
- Women/Family Preferred
- Airport
- Accessible / Special Assistance
- Government / Staff Movement
- Scheduled Ride

Categories may overlap. The data model should allow category rules to define eligibility, pricing modifiers, service areas, and admin controls.

## 11. Pricing

Pricing should be dynamic but controlled by government policy.

Pricing engine inputs:

- Base fare
- Per-kilometer fare
- Per-minute fare
- Minimum fare
- Waiting charge
- Cancellation/no-show charge
- Category multiplier
- Scheduled ride fee
- Airport or zone fee
- Demand/supply multiplier
- Admin manual override
- City-specific pricing
- Maximum surge cap
- Subsidy or discount rules

Admin pricing controls:

- Configure pricing by city, zone, category, date/time, and event
- Set minimum and maximum fare limits
- Set surge multiplier limits
- Create temporary special event pricing
- Apply subsidy or discount programs
- View why a fare changed
- Audit who changed pricing, when, why, and for what duration

The platform should avoid unexplained black-box pricing. Admins must be able to understand and explain pricing behavior.

## 12. Payments and Reconciliation

Payment methods for launch:

- Cash
- JazzCash
- Easypaisa
- NayaPay

Future payment methods:

- Card payments
- Bank transfer
- Additional wallets
- Government subsidy wallets or vouchers

Payment system requirements:

- Fare estimate and final fare records
- Trip receipts
- Payment method selected before ride confirmation
- Cash collection records
- E-wallet transaction records
- Failed payment handling
- Refunds and adjustments
- Complaint-linked payment holds where needed
- Daily reconciliation by city, driver, vehicle, payment method, and trip

## 13. Driver Contracts and Payouts

Driver contract rules must be configurable because the final business model is not settled.

Supported models:

- Fixed daily, weekly, or monthly pay
- Commission per trip
- Hybrid fixed plus commission
- Bonuses for peak hours or completed ride targets
- Penalties for cancellations, no-shows, incidents, or policy violations
- Cash collection reconciliation
- City/category-specific driver rules

The driver economics module should record the calculation used for every trip so finance and operations teams can audit payouts.

## 14. Admin Roles

Initial role examples:

- Super Admin
- Operations Manager
- Dispatcher
- Pricing Manager
- Finance/Reconciliation Officer
- Complaint Officer
- Incident Officer
- Read-Only Government Viewer

Role permissions should control access to sensitive actions such as pricing changes, dispatch overrides, refunds, complaint evidence, driver penalties, and audit logs.

## 15. Development Phases

### Phase 0: Foundation and Product Setup

Goal: Establish the project structure, technical foundations, and shared domain model.

Todos:

- Choose the initial technical stack for backend, web admin, rider app, and driver app.
- Set up repository structure.
- Define environments: local, staging, production.
- Create shared domain model for city, zone, rider, driver, vehicle, ride, payment, category, and audit event.
- Define API style and authentication strategy.
- Create base database schema.
- Create seed data for Sindh cities, starter zones, categories, and admin roles.
- Set up logging, error tracking, and basic observability.
- Set up CI checks.

### Phase 1: Core Ride Platform MVP

Goal: Support real immediate rides with rider app, driver app, backend, and basic admin visibility.

Todos:

- Build rider OTP signup and login.
- Build rider profile with optional photo.
- Build pickup and destination selection.
- Build fare estimate API.
- Build ride request creation.
- Build driver login and online/offline status.
- Build dispatch offer flow.
- Build driver accept/decline flow.
- Implement ride state machine.
- Implement rider and driver ride state synchronization.
- Implement pickup navigation handoff.
- Implement destination navigation handoff.
- Implement final fare calculation.
- Implement cash payment completion.
- Build basic trip receipt.
- Build admin live trip list.
- Build admin live map with driver and ride markers.
- Build core audit logging.

### Phase 2: Real-Time, Chat, and Scheduled Rides

Goal: Make the ride experience operationally complete and reliable.

Todos:

- Implement real-time event delivery for ride updates.
- Implement driver/rider location streaming.
- Implement accepted-ride chat.
- Implement quick chat messages.
- Implement scheduled ride creation.
- Build scheduled ride admin queue.
- Implement scheduled ride reminders.
- Implement scheduled ride assignment window.
- Add admin alerts for at-risk scheduled rides.
- Add retry and recovery behavior for app reconnects.

### Phase 3: Pricing, Payments, and Reconciliation

Goal: Support government-controlled dynamic pricing and digital payment operations.

Todos:

- Build pricing rules by city, zone, category, and time.
- Build demand/supply multiplier support.
- Build max surge caps.
- Build admin pricing override workflow.
- Add pricing audit trail.
- Integrate JazzCash.
- Integrate Easypaisa.
- Integrate NayaPay.
- Build failed payment handling.
- Build refunds and adjustments.
- Build cash reconciliation dashboard.
- Build digital payment reconciliation dashboard.
- Build daily finance exports.

### Phase 4: Admin Command Center

Goal: Give the central team strong operational control across Sindh.

Todos:

- Build city, zone, depot, and category management.
- Build vehicle and driver management.
- Build driver document/status management.
- Build driver contract configuration.
- Build driver payout calculation reports.
- Build demand and supply heatmaps.
- Build dispatch override tools.
- Build stuck ride and delayed pickup alerts.
- Build complaint management workflow.
- Build incident management workflow.
- Build role-based access controls.
- Build admin activity audit log views.
- Build government reporting dashboards.

### Phase 5: Scale, Hardening, and Future Integrations

Goal: Prepare the platform for full fleet rollout and future government integrations.

Todos:

- Load test dispatch and real-time systems.
- Add rate limiting and abuse protection.
- Add fraud and suspicious activity signals.
- Add disaster recovery backups.
- Add operational runbooks.
- Add support for local city operations teams if needed.
- Add EV charging/depot data import when external systems are ready.
- Add transport authority reporting integrations.
- Add public dashboard APIs if approved.
- Add advanced demand forecasting.

## 16. Suggested Initial Technical Direction

The exact stack can be finalized before implementation. A practical starting point:

- Mobile apps: Flutter with Dart for shared rider and driver mobile development.
- Mobile structure: one Flutter project with separate rider and driver app flavors/entry points.
- Rider app: Flutter Android and iOS app.
- Driver app: Flutter Android-only build optimized for the in-dash screen.
- Admin command center: React/Next.js web application.
- Backend: Node.js/NestJS or Java/Spring Boot modular monolith.
- Database: PostgreSQL with PostGIS for geospatial queries.
- Real-time: WebSockets or managed real-time service.
- Cache/queue: Redis for dispatch state, timeouts, and queues.
- Maps/navigation: Google Maps, Mapbox, or a locally approved maps provider.
- Hosting: Government-approved cloud or data center environment.

The recommended backend direction is a modular monolith first, with clear internal boundaries. This reduces launch complexity while preserving the option to split high-load modules later.

## 17. Key Development Risks

- Dispatch complexity can grow quickly if assignment, timeout, and override rules are not finalized before launch.
- Dynamic pricing must be explainable to avoid public trust issues.
- Cash reconciliation can become operationally messy without strong process design.
- Scheduled rides require careful alerting so bookings do not silently fail.
- Driver app UX must be simple enough for in-dash usage.
- Admin permissions must be strict because pricing, refunds, penalties, and complaints are sensitive.
- Wallet integrations may require compliance, certification, and settlement workflows.
- Government reporting requirements may expand after launch.

## 18. Immediate Next Decisions

Before implementation starts, the team should decide:

- Preferred technical stack.
- First launch cities and zone definitions.
- Initial ride categories.
- Initial fare formula.
- Dispatch strategy for the first version.
- Maps/navigation provider.
- Wallet integration order.
- Hosting and data residency requirements.
- Admin role list and approval workflow.
- Driver onboarding and contract process.
