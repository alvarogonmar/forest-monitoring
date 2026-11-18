# Mobile App — Forest Monitoring

App for recording help requests and checking their status.
See the [main README](../README.md) for the system purpose, architecture diagrams,
design decisions, and navigation.

## Requirements

- Node.js 24, specified in `.nvmrc`, and npm.
- A phone with Expo Go compatible with the project's SDK 58 for device testing,
  or a runtime environment compatible with that SDK.
- Phone and computer connected to the same network to load the local project.

## Installation and Development

From the repository root:

```sh
cd mobile
npm ci
```

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the Express base URL.
For a physical iPhone, use the Mac's Wi-Fi IP, for example
`http://192.168.1.100:3001`. `localhost` on the phone refers to the phone itself.
This is a public URL, not a credential: never put Supabase keys in the mobile app.
Start Metro with `npm start`, then scan the QR code.

Scan the QR code using Expo Go on Android or Camera on iPhone. With the
corresponding environment available, you can also run:

```sh
npm run android
npm run ios
npm run web
```

The web version provides an additional preview; it does not replace testing
storage, permissions, and location on a phone.

## Checks and Tests

From `mobile/`:

```sh
npm run lint
npm test
```

The tests in `tests/` check request logic and route selection. They do not, by
themselves, verify native APIs on a phone or integration with a real backend.

## Basic Manual Test

1. In `backend/.env`, use `HOST=0.0.0.0` for LAN testing and restart `npm run dev`.
   Keep the Mac and phone on the same Wi-Fi network. First open
   `http://<MAC_WIFI_IP>:3001/api/health` in iPhone Safari and verify `status: ok`.
2. Run `npm start` in `mobile/`, open the project in Expo Go, and allow local network
   and foreground location access when requested. Changing the public API URL requires
   a full app reload. A Metro tunnel does not automatically tunnel the Express API.
3. Create a request with the help button. A real request will be inserted into
   Supabase. The confirmed screen means stored by the backend, not read by an admin
   or attended to. Verify the matching UUID in `help_requests` using the dashboard.
4. Stop the backend and create another request: it must remain pending. Restart
   the backend and use Retry; the same UUID, original timestamp and GPS are retained.
5. Close and reopen the app: pending requests and real receipts must be restored.
   A confirmed request must not be sent again.

If the phone cannot open the health URL, check the Mac's current Wi-Fi IP, backend
bind address, macOS firewall/local-network permission and whether the Wi-Fi network
allows devices to communicate. Do not put `0.0.0.0` in the mobile API URL; it is only
the server's bind address. Use HTTPS when deploying outside local development.

### Browser Preview on the Mac

Run `npm run web` and open the app at `http://localhost:8081` so browser geolocation
can use a localhost secure context. Approve location access. The browser's location
may be less accurate than the phone's GPS.

In `backend/.env`, set
`ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081` and restart Express.
If Metro uses another port or origin, add that exact origin. The public API URL
may use the same reachable Mac LAN address as the iPhone or `http://127.0.0.1:3001`.
Native apps do not enforce browser CORS; the browser preview does. CORS is not
authentication. No Supabase secret is required by either mobile or browser clients.

## Integration Status

`src/services/transport.js` sends HTTP POST requests to `/api/help-requests`, with
only `id`, `createdAt` and `coordinates`. Only HTTP 200/201 plus a matching real
receipt can confirm a request. Invalid receipts, errors, cancellation and timeouts
leave it pending. The transport has a 25-second limit and aborts when connectivity
is lost or the app leaves the foreground. Backend idempotency handles uncertain
outcomes and replayed requests. There is no background sending loop.

Local persistence currently uses AsyncStorage through `src/services/storage.js`
and validates records in `src/core/requestRecord.js`. Real records use version 2
and the key `@bosque-primavera/help-request/v2`. Historical version-1 demo records
remain untouched under their old key; they are not restored as real requests and
are never automatically transmitted. Corrupt version-2 data blocks restoration
without overwriting it. The planned SQLite migration remains a separate step.

Automated checks cover HTTP payload/receipt validation, offline lifecycle,
storage isolation and restore. Backend integration tests exercise the real mobile
transport against a local Express app with simulated database persistence,
including loss of a response followed by idempotent retry. Expo exports verify
bundling. The owner confirmed that the health URL opened in iPhone Safari and
reported a successful request through Expo Go on the physical iPhone. The owner
also confirmed restoration of the saved receipt after reopening and recovery
after stopping/restarting Express, retaining the same folio and a single row.
The backend-outage check kept Wi-Fi enabled; it does not verify airplane mode or
background delivery.

The administrator login, hardware ingestion and alert evaluation remain pending.
`node_modules/`,
`.expo/`, and local configuration files are excluded from Git.
