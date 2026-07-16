# Frontend State Management

## Overview

There is no state-management library. `client/main.js` owns game state in module-scoped variables and updates the DOM and Three.js scene imperatively.

## State Categories

- Shared static configuration: exported from `client/constants.js` (`PALETTE`, movement tuning, radar tuning, `WEAPONS`).
- Scene infrastructure: exported objects in `client/scene.js` (`scene`, `camera`, `renderer`, lights, `walls`).
- Asset cache: private `modelCache` in `client/assets.js` and template promises in `client/main.js`.
- Session/UI/input state: module variables in `client/main.js`, changed by DOM/input/WebSocket handlers and consumed by the animation loop.
- Server state: WebSocket `state` snapshots and discrete events. The server remains authoritative for health, death, kills, respawn, team scores, and round completion.

## Rules

- Keep a single owner for each mutable value; export only state that another module genuinely needs.
- Scores, player lists, teams, and round state are refreshed from server messages. Local health display is an exception in the current implementation: `client/main.js` decrements the `#health` DOM text on `hit` and resets it on respawn rather than deriving it from `state.players[].health`; preserve awareness of this synchronization limitation when changing combat UI.
- Remote-player rendering may interpolate for visual smoothness, but hit detection and gameplay decisions must deliberately use the latest network snapshot or another explicit authority source.
- Use a generation/token check for asynchronous work tied to the current map. `mapBuildToken` in `client/main.js` prevents old model loads from populating a newer map.
- Clear prior map-owned objects and collision data during map changes; use `trackMapObject`, `clearMap`, and `disposeObject`.

## Avoid

Do not introduce a global store library for isolated changes, duplicate server authority in the client, or scatter the same state across DOM attributes, scene objects, and separate variables without an explicit synchronization rule.
