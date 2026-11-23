# Website and Dashboard — Forest Monitoring

Public website for exploring routes and a demonstration dashboard for viewing
sensors, counts, and help requests. See the [main README](../README.md) for the
system structure, architecture, technical decisions, and navigation.

## Requirements

- Node.js 24 and npm to use the same major version as the mobile app.
- A modern browser.
- Internet access to load OpenStreetMap tiles.

## Installation and Development

From the repository root:

```sh
cd web
npm ci
npm run dev
```

Start Express separately from `backend/` with `npm run dev`, then open
`http://localhost:5173/login`. Vite uses port 5173 with `strictPort` and proxies
`/api` to `http://127.0.0.1:3001`. This lets the browser receive the API's HttpOnly
cookie through the website origin without exposing Supabase keys. Restart Vite
after changing its configuration. Keep `http://localhost:5173` in the backend's
`ALLOWED_ORIGINS`; the proxy preserves the browser Origin header. If the port is
occupied, stop the previous Vite instance before restarting.

The production build requires the hosting server to forward `/api` to Express;
the Vite development proxy is not included in static build files.

## Demo Configuration

From `web/`, copy the configuration example:

```sh
cp .env.example .env.local
```

Select the scenario using `VITE_DEMO_SCENARIO`:

| Value | Behavior |
| --- | --- |
| `success` | Returns fictional demonstration data. |
| `empty` | Returns valid empty results. |
| `error` | Simulates a query failure. |

Restart Vite after changing the value. The Actualizar (Refresh) and Reintentar
(Retry) buttons repeat the scenario's query; they do not generate new data.
`VITE_` variables are visible to the client and must not contain secrets.

## Tests and Build

From `web/`:

```sh
npm run lint
npm test
npm run build
```

Automated tests check the demo data service and login transport/error handling. To preview the local build after running
`npm run build`:

```sh
npm run preview
```

## Manual Checks

1. Open Home and Routes; select a route using a card or the map.
2. Open `/login` and enter the existing Supabase administrator email and password.
   A successful login opens the demonstration map dashboard. Verify an incorrect
   password stays on the login screen and shows a generic error. Never share real
   passwords in screenshots or chat.
3. Review Map, Counts, and Requests; they still contain demonstration data.
4. Change scenarios to check loading, empty results, and errors.
5. Review the screens at viewport widths of 360 and 1280 px.

## Map Considerations

`src/data/routes.js` contains fictional routes, not verified trails. Replace them
with approved coordinates before presenting them as real routes.
Keep OpenStreetMap attribution visible and follow its
[tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Integration Status

Data comes from the simulated adapter in `src/services/dataService.js`.
Pages use `useAsyncData` to manage loading, errors, and query cancellation.
When integrating the API, replace the adapter while preserving its contracts.

`src/services/authService.js` sends login credentials to `POST /api/auth/login`
with `credentials: "include"` and a 45-second timeout. It preserves the password
exactly, normalizes the email and shows safe errors for denied credentials, rate
limits, unavailable servers and malformed responses. The form prevents duplicate
submissions while awaiting a response and navigates only after a valid session
response. Credentials and session tokens are not stored in browser storage.

`src/auth/SessionProvider.jsx` restores the cookie session through `GET
/api/auth/me` on startup. Header, login and panel share this in-memory session.
Returning to the public site keeps the session; a profile icon replaces the
administrative access text and links to the dashboard. `/login` redirects signed-in
administrators to the map. `SessionGate.jsx` redirects signed-out visitors away
from `/admin/*`; service failures show a retry screen instead of assuming logout.

The first session check may show a loading state. Later checks run in the
background when entering/leaving the panel or returning to the browser tab;
switching between Map, Counts and Requests does not recheck or replace the panel
with a session loading screen. Backend endpoints still authorize every private
request, including after session expiry or revocation.

The sidebar logout button remains beside the session information. It posts to
`/api/auth/logout` with the current CSRF token and clears in-memory session state
only after server confirmation or an already-expired session. It is not moved to
the public header. Credentials and tokens are never saved to browser storage.
The panel continues to use fictional data until its adapter is replaced.

Login failures appear above the submit button in a red alert with an icon and
heading; keyboard focus moves to the alert. Loading text remains a separate status.

Validation: 13 web tests, lint and production build passed. Local browser checks
using a simulated account covered wrong-password alerts, login, section changes
without session-loading screens, home navigation, reload restoration, the profile
link, signed-in login redirects, logout and rejection of direct panel access after
logout. These checks do not use the real database. The owner reported real browser
login working; the updated navigation flow remains to be confirmed with that account.
