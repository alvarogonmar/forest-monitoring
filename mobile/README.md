# Mobile Application

React Native application developed with Expo for creating help requests,
including while offline.

Requests are saved locally with `expo-sqlite`, preserving their unique ID,
original timestamp, and pending or received status across app restarts.
NetInfo detects connectivity changes; pending requests are sent while the app
is open and the backend is available.

A request becomes received only after the backend confirms persistence.
Retries reuse the same ID to prevent duplicates. Receipt does not imply that
help has been dispatched.

The Expo project has not been initialized yet. Setup and run instructions
will be added when implementation begins.
