# Forest Monitoring

Academic forest monitoring system with a mobile app, a public website,
an administrative dashboard, and a shared backend.

## Project structure

- `web/`: public website and administrative dashboard.
- `mobile/`: Expo mobile application.
- `backend/`: shared API and access to the central database.
- `hardware/`: Raspberry Pi and sensor code.
- `docs/`: project documentation and API agreements.

## Architecture

The website, mobile app, and Raspberry Pi communicate with the shared backend.
The backend validates requests, enforces permissions, and accesses the central
database. The mobile app also uses local SQLite storage to retain pending help
requests while offline.

## Collaboration

1. Keep `main` working and ready for integration.
2. Update your local `main` before starting a task.
3. Create a branch for each task, such as `feature/web-map`,
   `feature/app-help-button`, or `feature/backend-help-requests`.
4. Make small commits with clear messages and push your branch.
5. Open a pull request and have another team member review it before merging.

## Responsibilities

| Area                         | Owner          |
| ---------------------------- | -------------- |
| Website and dashboard        | To be assigned |
| Mobile application           | To be assigned |
| Backend and central database | To be assigned |
| Hardware                     | To be assigned |

## Development status

This repository currently contains the initial folder structure and documentation.
Setup commands will be documented in each component as it is implemented.
The confirmed technologies are React with JavaScript for the website, React Native with Expo
for the mobile app, and Supabase PostgreSQL for the central database.
The proposed implementation uses Vite, React Router, React Leaflet, and an
Express/TypeScript shared API with Supabase Auth for credential verification.

See [the complete project structure](estructura_proyecto.md) for the
database schema, API contracts, permissions, development plan, and open decisions.

Do not commit credentials or local environment files. When configuration is
introduced, provide an `.env.example` with placeholder values.
