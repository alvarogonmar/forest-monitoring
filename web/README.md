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

Open the address printed by Vite in the terminal.

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

Automated tests check the data service. To preview the local build after running
`npm run build`:

```sh
npm run preview
```

## Manual Checks

1. Open Home and Routes; select a route using a card or the map.
2. Open the demonstration dashboard and review Map, Counts, and Requests.
3. Change scenarios to check loading, empty results, and errors.
4. Review the screens at viewport widths of 360 and 1280 px.

## Map Considerations

`src/data/routes.js` contains fictional routes, not verified trails. Replace them
with approved coordinates before presenting them as real routes.
Keep OpenStreetMap attribution visible and follow its
[tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Integration Status

Data comes from the simulated adapter in `src/services/dataService.js`.
Pages use `useAsyncData` to manage loading, errors, and query cancellation.
When integrating the API, replace the adapter while preserving its contracts.

The login and dashboard are demonstrations without an authenticated session.
Authentication and backend authorization for administrative queries remain pending.
