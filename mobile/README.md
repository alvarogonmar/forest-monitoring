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
npm start
```

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

1. Open the app and create a request using the help button.
2. Check location permission: the current demo uses location before sending.
3. Disconnect the network and verify that the request remains pending.
4. Close and reopen the app to verify that the saved request is restored.
5. Reconnect with the app active and observe the simulated sending and confirmation.

## Integration Status

Sending and confirmation are currently simulated: no administrator receives
the request. We will use `expo-sqlite` for the final local persistence layer;
its integration is still pending. Connecting the shared API and confirming
receipt only after central persistence are also pending.

No backend credentials are required to run the current demo. `node_modules/`,
`.expo/`, and local configuration files are excluded from Git.
