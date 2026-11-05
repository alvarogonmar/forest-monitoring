# Forest Monitoring Web

## Local development

```sh
npm install
npm run dev
```

Run `npm run lint`, `npm test`, and `npm run build` before opening a pull request.

## Data access and demo scenarios

Pages load data through `src/services/dataService.js` and `useAsyncData` rather
than importing fixtures directly. Services accept an optional `AbortSignal`;
unmounting a page or refreshing cancels obsolete work. Keep the exported loader
functions stable when replacing the demo adapter with HTTP calls.

Service methods currently provide routes, sensor points, counts as
`{ routeId, count }` records, and help requests. Composite loaders assemble the
map and counts screens. Errors are not converted to empty responses or zero
counts. Loading, failed, and empty responses have separate presentation states.

To exercise these states without a backend, copy `.env.example` to `.env.local`
and choose `VITE_DEMO_SCENARIO=success`, `empty`, or `error`. Restart Vite after
changing the value. `Actualizar` and `Reintentar` repeat the demo request; fixed
fixtures remain unchanged. Vite variables are public; never put secrets there.

## Public routes map

The `/rutas` page uses Leaflet 1.9 and React Leaflet 5 with OpenStreetMap tiles.
It needs internet access to load the background map, but no API key or backend.
Keep the OpenStreetMap attribution visible and follow its tile usage policy:
https://operations.osmfoundation.org/policies/tiles/

`src/data/routes.js` contains fictional demonstration paths as `[latitude, longitude]`
pairs, not verified trails. Replace these with approved route coordinates before
presenting them as real hiking routes. Selecting a card or map path highlights
the route and fits the map to it; “Ver todas las rutas” restores the overview.

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
