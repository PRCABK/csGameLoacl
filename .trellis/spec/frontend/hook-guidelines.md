# Stateful Logic Guidelines

## No Hook Framework

The project uses browser-native JavaScript, not React or another hook-based framework. There are no custom hooks, `use*` naming rules, React Query, SWR, or hook lifecycles. Do not introduce hook patterns into this codebase.

## Existing Alternatives

- Shared stateless helpers are ordinary functions, for example `teamColor` and `teamLabel` in `client/constants.js`.
- Resource operations are module functions, for example `loadGltf`, `normalizeProp`, and `disposeObject` in `client/assets.js`.
- Stateful browser behavior is registered with DOM, pointer-lock, keyboard, resize, and WebSocket event listeners in `client/main.js`.
- Continuous updates happen through the animation loop; network server state arrives through WebSocket messages.

## Lifecycle Rules

When adding stateful behavior, explicitly pair setup with cleanup where the resource outlives one action: remove scene objects and dispose geometry/material/texture resources, invalidate stale asynchronous map loads using the existing map generation token, and avoid duplicate event listeners or timers.
