# Shared Backend

API shared by the website, administrative dashboard, mobile app, and Raspberry Pi.
Only the backend accesses the central database.

Responsibilities include:

- Providing public route data.
- Authenticating administrators and protecting private queries.
- Accepting detections from authorized devices.
- Validating and storing help requests and detections without duplicates.
- Confirming receipt only after persistence.
- Providing sensor data, route detection counts, and help requests to administrators.

The central database uses Supabase PostgreSQL. The proposed backend is
Node.js with Express and TypeScript, using Supabase Auth to verify administrator
credentials and server-managed cookie sessions for the administrative API.

See [the complete project structure](../estructura%20del%20proyecto.md) for
the proposed schema, endpoint contracts, permissions, and implementation plan.
Keep the OpenAPI contract in `docs/` in sync as implementation begins.

Setup and run instructions will be added when implementation begins.
