# Shared API — Forest Monitoring

Backend for the mobile app, website, and Raspberry Pi. See the
[main README](../README.md) for architecture diagrams, services, and design decisions.

## Current Status

This folder contains an initial Express server, documentation, and database
migrations. `GET /api/health` reports process liveness, and `GET /api/routes`
reads public trail metadata and geometry from Supabase when configured. Health
does not verify the database. Requests, login, device
ingestion, occupancy matching, alerts and client integration remain pending.
The server uses Node.js and JavaScript, with Supabase PostgreSQL planned as the
central database and Supabase Auth for administrator credentials.

## Local Server — First Startup

Requires Node.js 22.9 or newer (`.nvmrc` selects Node 22). From `backend/`:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:3001/api/health`. Expected response:

```json
{ "status": "ok" }
```

`npm run dev` reloads on source changes. Use `npm start` without watch mode,
`npm run check` for JavaScript syntax checks, and `npm test` for route/configuration
tests with simulated database responses (no real keys required). No Supabase keys
are needed for the health check. Copy `.env.example` to `.env` if it does not
already exist, and change `HOST`/`PORT` as needed. `.env` is ignored by Git.
Bind defaults to `127.0.0.1` for
local use; access from a physical phone will require a reachable host configuration
at the client-integration stage.

`src/app.js` defines the application and JSON errors; `src/server.js` starts the
listener. `src/services/supabase.js` configures the privileged database client;
`src/repositories/routes.js` reads and projects public route data. JSON bodies
are limited to 16 KiB. Unknown endpoints return JSON `404`;
malformed JSON returns `400` and oversized JSON returns `413`, without reflecting
request bodies or internal errors. Administrative endpoints are not implemented
and do not expose database data. Authentication, CORS, request throttling and the
full deployment configuration will be added with the real endpoints.

## Supabase Connection — Public Routes

In the ignored local `backend/.env`, fill `SUPABASE_URL` with the Project URL
(for example, `https://<project-ref>.supabase.co`) and `SUPABASE_SECRET_KEY` with a
Secret key beginning with `sb_secret_`. Obtain them from the dashboard's Connect
dialog or Project Settings / API Keys. Do not use the PostgreSQL connection string,
database password or a publishable key here. Do not copy the secret into web/mobile
environment variables, chat, screenshots or committed files. The privileged client
does not persist or refresh user sessions and must never be reused for user login.

Restart `npm run dev` after editing `.env` to reload environment configuration.
Then open `http://127.0.0.1:3001/api/routes`. With the demonstration seeds applied,
expect an `items` array with three routes and six coordinate pairs per route.
The response contains only `id`, `name`, `color` and `coordinates`; it never queries
or returns sensors, credentials, requests or occupancy state. This reads Supabase;
it does not yet switch the website's simulated data adapter to the API.

An unconfigured connection or database query failure returns `503`, not an empty
catalog. An actually empty catalog returns `200` with `items: []`. One relational
query reads route metadata and path points together, with a 10-second timeout.
Geometry is ordered by position and must contain at least two valid coordinate
pairs; invalid geometry returns `500 ROUTE_CONFIGURATION_INVALID`. An exact count
checks that the top-level result was not truncated by the Data API row limit.
This is a small-catalog MVP; large geometries/catalogs need deliberate pagination
and verification of embedded-result limits before increasing scope.

The local connection was verified after the owner populated the ignored `.env`:
`GET /api/routes` returned HTTP 200 with `encino`, `mirador`, and `pino`, each with
six coordinate pairs. Credentials remain local. Automated tests additionally
cover responses using simulated database results; the live check is read-only.

## Help Requests — Validation Only

`POST /api/help-requests` requires a JSON body and validates it through
`src/validation/helpRequest.js` using Zod. The strict schema requires a UUID v4,
UTC creation/capture timestamps, finite latitude/longitude in range and a
nonnegative accuracy value (or explicit `null`). Unknown fields are rejected;
timestamps more than five minutes ahead are rejected, while delayed offline
requests are allowed. Valid dates and UUIDs are normalized for future duplicate
comparison without changing the input object.

Unsupported media returns `415`; invalid fields return `400 VALIDATION_ERROR`
with field paths and Spanish messages. Valid input still returns `501
NOT_IMPLEMENTED`: persistence and receipt/deduplication are not implemented yet.
The tests exercise these boundaries without inserting real requests into Supabase.

## Database Setup — First Table

Run `migrations/001_create_help_requests.sql` once in the Supabase SQL Editor,
using the project database owner (the dashboard's default `postgres` role).
The migration creates `public.help_requests`, its validation constraints, and
an index for administrative pagination inside a transaction. It does not insert
sample requests. Do not rerun an applied migration or delete existing tables to
resolve an error; inspect the error and use a later migration for changes.

The phone supplies the UUID and original creation timestamp. PostgreSQL supplies
`received_at`. The UUID primary key prevents duplicate rows; returning the original
receipt for identical retries and rejecting conflicting payloads still require
API implementation.

RLS is enabled. Direct access for `anon` and `authenticated` is revoked, with no
client policies. The trusted backend's `service_role` receives only `select` and
`insert`; the API must perform its own authorization because this role bypasses
RLS. Its privileged credential must remain on the server.

After successful execution, check the columns with:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'help_requests'
order by ordinal_position;
```

The result should contain seven columns: `id`, `created_at`, `received_at`,
`latitude`, `longitude`, `accuracy`, and `location_captured_at`.
Only `accuracy` is nullable; `received_at` has a `now()` default.

This migration has not been applied to a remote project by Codex. Confirm its
result in the dashboard before continuing with other tables or the API.

## Database Setup — Routes

Next, run `migrations/002_create_routes.sql` once as the project database owner.
It creates `routes` (ID, name, and map color) and `route_path_points` (ordered
latitude/longitude pairs). Path points describe trail geometry; the future
`sensor_points` table will describe monitoring locations separately.

A foreign key prevents path points from referencing a nonexistent route. The
composite primary key prevents repeated positions in a route. Coordinate ranges,
nonnegative positions, names, identifiers, and hexadecimal colors are validated.
The primary-key index supports reading each path in ascending position order.

This normalized storage keeps coordinate validation in PostgreSQL without storing
an unvalidated JSON array. The API will reconstruct the existing `coordinates`
array as `[latitude, longitude]` pairs, ordered by `position`. Before publishing a
route, the API must verify that it has at least two path points; this minimum is
not enforced across rows by this migration. An incomplete route is a configuration
error, not an empty or valid path. Catalog loading must insert the route and its
path in the same transaction and validate that minimum.

Both tables have RLS enabled and no direct client access. Only the backend's
`service_role` has SELECT access. Catalog changes are performed by the database
owner through reviewed SQL; there are no catalog-editing endpoints in the MVP.
This migration contains no seed data and has not been executed remotely by Codex.

### Development Seed

For a development project only, run `seeds/001_demo_routes.sql` once after migration
002 as the project database owner. It inserts the three fictional trails from
`web/src/data/routes.js` and their 18 ordered path points in a transaction, without
overwriting existing IDs. These are demonstration coordinates, not verified trails.
The final verification query should return `encino`, `mirador`, and `pino`, each
with `path_point_count = 6`. If the script fails, inspect the error before retrying;
do not delete existing catalog entries to make it run. Codex has not executed this
seed remotely. Loading it does not connect the website to the database yet.

## Database Setup — Sensor Points

Run `migrations/003_create_sensor_points.sql` once after migration 002 as the
project database owner. It creates monitoring locations with `id`, `route_id`,
`latitude`, and `longitude`, all required. The final read-only query should show
those four columns with `is_nullable = NO`. No sensor fixtures are inserted.

The foreign key requires an existing route. An index supports filtering by route;
coordinate constraints reject invalid ranges. RLS is enabled and direct client
access is revoked. The backend receives SELECT only and must check administrative
permissions before returning sensor locations. Device authorization and detections
will be implemented in later migrations; a sensor point is not itself a device or
an authentication credential. Codex has not applied this migration remotely.

For development only, run `seeds/002_demo_sensor_points.sql` once after migration
003 and the demo routes seed. It inserts the six fictional monitoring locations
from `web/src/data/sensorPoints.js`. The verification query joins points to routes:
`P-01`/`P-02` belong to `pino`, `P-03`/`P-04` to `encino`, and `P-05`/`P-06` to
`mirador`. These rows describe locations, not connected hardware or live readings.
The seed does not overwrite existing IDs and has not been executed remotely by
Codex.

## Database Setup — Devices and Point Authorization

Run `migrations/004_create_devices.sql` once after migration 003 as the project
database owner. The verification query should return `device_sensor_points` and
`devices`, both with `rowsecurity = true`. No device or credential is seeded.

`devices` stores a name, a unique credential digest, an active flag (false by
default), and server-generated identity and creation time. `device_sensor_points`
stores explicit device-to-point authorizations. Foreign keys require both records
to exist, and the composite primary key prevents duplicate authorization pairs.
The confirmed prototype has one Raspberry Pi and three IR sensors. Register one
device and associate its actual IR points through this table. Multiple points may
belong to that device; no migration change is needed for this topology. The schema
does not enforce a single-device limit or exclusive point ownership. Existing six
demo sensor locations are fixtures, not the physical inventory.

The future enrollment procedure must generate a token from at least 32 bytes of
cryptographically secure randomness and store only its lowercase hexadecimal
SHA-256 digest. The token is a high-entropy device secret, not an administrator
password. The schema validates digest format, not randomness or token ownership;
enrollment is responsible for generation. Do not invent or commit demonstration
credentials. Keep the original token on the corresponding Pi.

Only the backend has SELECT permission on these two tables. Enrollment, rotation,
activation and point assignment are owner-managed in the MVP. For every received
detection, Express must hash the supplied token, require an active matching device,
and check the point authorization. RLS does not perform those checks on behalf of
the privileged backend. No public or administrative API response may include
`credential_hash`. Authentication code and physical-device configuration are still
pending; creating these tables alone does not authenticate hardware. Codex has not
applied this migration remotely.

The Pi also has a humidity detector and a physical SOS button. Humidity needs a
separate measurement model after its format/unit is confirmed. Hardware SOS needs
source/device attribution and trusted fixed-location configuration via a later
additive migration to help requests; it must not use the anonymous mobile endpoint
to claim hardware identity. See `../hardware/README.md` for the integration questions.
The per-activation IR contract remains provisional until the teammate confirms
whether the Pi produces individual events, interval increments or cumulative totals.

The intended counting semantics are now entry on IR 1 (+1), exit on IR 2 (-1),
and no assigned role or occupancy effect for IR 3. The target is estimated occupancy
with possible overdue-presence alerts, rather than only cumulative detections.
The route/segment mapping, baseline, entry/exit matching policy and timeout remain
to be defined. Future schema/API work must retain event history, handle inconsistent
counts and evaluate pending deadlines without waiting for new messages. Existing
migrations have not been rewritten; roles, occupancy and alerts need later migrations.

## Database Setup — Occupancy Configuration

Run `migrations/005_add_occupancy_configuration.sql` once after migrations 001-004.
It adds a positive `routes.occupancy_timeout_seconds` (prototype default: 120) and
`sensor_points.occupancy_role` (`entry`, `exit`, or `unassigned`, defaulting to
`unassigned`). Existing catalog privileges remain unchanged. The timeout is the
total allowed duration from an unmatched entry; no extra margin is added to 120.

For the development demo, then run `seeds/003_demo_occupancy_configuration.sql`
after the two earlier demo seeds. It assigns `P-01` as entry and `P-02` as exit on
the fictional Pino trail, with a 120-second timeout. The verification query should
return those two rows. These are illustrative assignments, not confirmed hardware
locations or GPIO mapping. Other demo points remain unassigned on a fresh setup;
IR 3 still has no defined role. The seed intentionally updates only the named demo
rows and does not overwrite other assignments.

Neither script creates detections, occupancy balances, visit matching, alert
history or a timer. Those are subsequent implementation steps. The accepted demo
policy starts with one visitor from a known empty baseline; multiple anonymous
visitors will use an explicitly approximate oldest-pending-entry-first policy.
A later exit resolves the matched overdue alert while preserving its history;
it does not close an SOS. Deadlines, matching and resolution must be persisted
and deduplicated by the future backend. Codex has not executed these scripts remotely.

## Database Setup — Entry and Exit History

Run `migrations/006_create_detections.sql` once after migrations 001-005 as the
project database owner. Its final query should show seven required columns: `id`,
`device_id`, `sensor_point_id`, `route_id`, `event_type`, `occurred_at`, and
`received_at`. No events or device credentials are seeded. Codex has not applied
this migration remotely.

`id` is generated once by the Pi per filtered activation and reused on retries.
`event_type` is `entry` or `exit`. The API will derive it and `route_id` from the
point's trusted configuration and preserve these snapshots, so later catalog
changes do not reclassify previously saved events. IR 3 remains unassigned and
does not generate occupancy events. The original event time and server receipt
time remain separate, with a route/time/ID index for chronological history.

The database enforces unique IDs, required fields, valid event types, finite
timestamps and existence of referenced devices, points and routes. These independent
foreign keys do not enforce that the point belongs to the stored route or that
the device is currently active and assigned to the point. Before inserting, the
future API must authenticate the device, authorize its point, derive route/role
and take a consistent configuration snapshot in a database transaction. It must
not accept client-supplied device identity, route or event type as authoritative.
Keep those checks in the future ingestion transaction/RPC, not in unrelated
requests that could race with configuration changes. On a duplicate ID, compare
the original validated input (device, point and original timestamp) and return
the original receipt without recomputing or replacing stored snapshots.

RLS is enabled and direct client access is revoked. The backend receives SELECT
and INSERT only. Raw history has no UPDATE/DELETE permissions for that role;
future corrections must be explicit rather than silently editing past events.
This table does not calculate balances, match visits, store alert history or run
timers. Baseline, matching and deadline processing remain subsequent steps.

## Database Setup — Pending Visits and Alert History

Run `migrations/007_create_route_visits_and_alerts.sql` once after migrations
001-006 as the project database owner. Its final query should show `occupancy_alerts`
and `route_visits`, each with `rowsecurity = true`. It inserts no sample rows and
has not been executed remotely by Codex.

`route_visits` associates one entry event with at most one exit event. The original
entry timestamp and its deadline are persisted. At entry processing, the backend
will compute `deadline_at = entered_at + occupancy_timeout_seconds` using the
route configuration captured in the ingestion transaction. Later arrivals, restarts
or timeout changes must not reset existing deadlines. For multiple visitors the
agreed oldest-pending-entry-first policy is an anonymous approximation, not identity
tracking. Keep unmatched/invalid exits in raw event history for reconciliation;
they do not create negative visits or silently close an unrelated route's visit.

`occupancy_alerts` stores at most one possible-overdue alert per visit. An alert
is open when `resolved_at IS NULL`; after a matched exit the backend records its
server resolution time without deleting history. The original exit event time
remains in `route_visits.exited_at`, separately from alert processing time. Neither
an occupancy alert nor its resolution creates or resolves a mobile/physical SOS.

The database enforces unique entry/exit references, coherent exit fields, finite
timestamps, a deadline later than entry and one alert per visit. Foreign keys
ensure records exist but do not validate event roles, route correspondence,
timestamps matching the source events, chronological matching, overdue conditions,
or valid state transitions. Those checks and single-assignment behavior must be
enforced in the future transactional ingestion/matching/evaluation functions. RLS
alone does not validate writes from the privileged backend.

The backend receives SELECT/INSERT and column-specific UPDATE permissions for
resolution fields only. It cannot update original deadlines or DELETE history
using these grants. Serialize entry/exit processing per route. The evaluator and
exit processor must lock the same visit rows and recheck pending/due state so an
exit and alert check cannot race into an inconsistent open alert. Unique visit
references prevent multiple alert rows but do not replace transactional checks.

An evaluator must run periodically, including while no device messages arrive,
and query persisted pending deadlines after restarts. It must not rely solely on
an in-memory timeout. Delayed/out-of-order events require reconciliation rather
than assuming receipt order is event order. The prototype still requires a known
empty baseline; these tables do not establish physical occupancy automatically.
Creating this schema does not start a worker, perform matching or generate alerts.

## Database Setup — Administrative Membership and Sessions

Run `migrations/008_create_admin_access.sql` once after migrations 001-007 as the
project database owner. Its final query should return `admin_memberships` and
`admin_sessions`, both with `rowsecurity = true`. It does not create users, grant
membership or start sessions. Codex has not executed it remotely.

Supabase Auth manages accounts and passwords. `admin_memberships.user_id` references
the Auth user's primary key; its owner-managed `active` flag is false by default.
Being an Auth user does not grant administrative access. Do not infer admin access
from user-editable metadata. Deleting an Auth user cascades through membership and
sessions, without deleting requests, sensor events or occupancy alerts.

The future login flow will verify credentials with Supabase Auth, require active
membership, generate at least 32 random bytes for the cookie token, and persist
only its lowercase SHA-256 digest in `admin_sessions`. Generate an independent
32-byte hex CSRF token and store it with the session. Its plaintext is required
for authenticated `/auth/me` restoration and does not itself authenticate requests.
Never log or expose the session table through general administrative endpoints.

Sessions have an absolute lifetime of at most eight hours; neither access nor
logout extends it. The API must check active membership, expiry and revocation
on every private request. The database validates field shapes/times, not random
token strength, password verification or live session validity. At logout set
`revoked_at` once and clear the cookie; never clear a revocation to revive a session.
The backend can read membership and insert/read sessions, and update only their
revocation field. It cannot grant membership or extend session expiry through its
table privileges. Expired rows do not delete themselves; owner-managed cleanup
can be added separately. Cookies, CSRF/Origin checks, credential verification,
generic login errors, throttling and account disablement handling remain backend
implementation tasks. A Supabase account ban/disable must also revoke these custom
sessions via a controlled admin procedure; custom sessions are not automatically
revoked by every Supabase Auth action.

## Planned Operations

- Provide public routes without exposing sensors or private help requests.
- Verify credentials and manage administrative sessions.
- Provide authorized access to sensors, counts, and help requests.
- Receive detections from authorized devices.
- Receive help requests and prevent duplicate records by ID.
- Confirm receipt only after data has been persisted.

Exact paths, HTTP methods, and request and response schemas will be published
with their implementation and contract. This list does not represent endpoints
that are currently available.

## Pending Configuration

Before running the server, document:

| Configuration | Purpose |
| --- | --- |
| Port and allowed website origin | Server startup and browser access configuration. |
| Supabase project URL | Connection to central services. |
| Server and authentication service keys | Data access and credential verification. |
| Session settings | Expiration and administrative cookie configuration. |
| Device credentials | Authorization of detections sent by the Raspberry Pi. |

Final variable names will be defined when implementing the server. Provide an
`.env.example` with placeholder values; keep secrets out of Git and do not send
them to the mobile app or browser.

## Planned Tests

- Accept valid records and reject invalid data.
- Reject unauthorized devices and administrative queries.
- Prevent duplicates when the same identifier is resent.
- Confirm receipt only after central persistence.
- Keep route counts separate and distinguish zero from errors.
- Check session termination and expiration.

When implementing the API, add reproducible installation, startup, and test
commands, database schema setup instructions, and usage examples for available
endpoints.
