# Shared API — Forest Monitoring

Planned backend for the mobile app, website, and Raspberry Pi. See the
[main README](../README.md) for architecture diagrams, services, and design decisions.

## Current Status

This folder contains documentation. There is no server implementation or
`package.json`; installation, execution, and test commands are not available yet.
The planned implementation uses Node.js, Express, and JavaScript, with Supabase
PostgreSQL as the central database and Supabase Auth proposed for administrator
credentials.

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
