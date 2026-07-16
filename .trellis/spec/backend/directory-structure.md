# Directory Structure

> How backend code is organized in this project.

---

## Overview

The backend is intentionally small and uses CommonJS modules under `server/`. The root `server.js` remains a compatibility entry point for `npm start`; `server/index.js` is the composition root that starts HTTP and WebSocket handling.

There is no `src/` directory, route framework, service layer, dependency-injection container, or build step for backend code.

---

## Directory Layout

```
server.js              # Compatibility entry: require('./server/index.js')
server/
├── index.js           # HTTP/WS composition, connections, tick loop, listen
├── maps.js            # Map data, default map, map ID normalization
├── rooms.js           # The sole rooms Map, room lifecycle, spawning
├── snapshots.js       # Team scores, scoreboards, state snapshots
├── staticFiles.js     # Static request handler and Content-Type mapping
└── combat.js          # Authoritative hit, kill, and respawn behavior
package.json           # npm metadata and the `start` script
client/                # browser ES modules served as static assets
models/                # GLB assets served by the static file handler
index.html             # game shell served at `/`
style.css              # game UI styles
docs/                  # static landing page assets
```

---

## Module Organization

Keep behavior in the module that owns its state or responsibility:

- `maps.js` owns immutable map configuration and map ID normalization.
- `rooms.js` owns the only process-wide `rooms` collection plus room and spawn helpers.
- `snapshots.js` derives outgoing state without owning room data.
- `staticFiles.js` handles HTTP filesystem mapping without depending on game modules.
- `combat.js` owns authoritative combat transitions and receives the broadcast helper as a parameter.
- `index.js` owns transport helpers, connection-local state, the 50 ms loop, and server startup.

Dependency direction must stay toward leaf modules: `maps.js` has no project dependency; `rooms.js` and `snapshots.js` may depend on maps; combat may depend on room spawning; `index.js` composes all modules. Leaf modules must not import `index.js`. Pass transport callbacks such as `roomBroadcast` into gameplay helpers to avoid circular dependencies.

Keep `server.js` free of application logic so `npm start -> node server.js` remains a stable external contract. Prefer a small helper in the owning module instead of introducing classes, containers, or framework layers.

---

## Naming Conventions

- Use CommonJS imports in backend code: `const http = require('http')`.
- Use camelCase for functions and variables: `normalizeMapId`, `getOrCreateRoom`, `roomBroadcast`.
- Use UPPER_SNAKE_CASE for constants: `ROUND_SECONDS`, `RESPAWN_MS`, `DEFAULT_MAP`.
- Use concise game-domain names for in-memory entities: `room`, `player`, `victim`, `winner`.
- WebSocket payloads use a `type` field, for example `join`, `move`, `shoot`, `state`, `respawn`, and `roundEnd`.

---

## Examples

- `server/maps.js` defines `MAPS` and validates map IDs with `normalizeMapId`.
- `server/rooms.js` stores active rooms in its single in-memory `rooms` map keyed by `mode:mapId`.
- `server/index.js` broadcasts `snapshot(room)` every 50 ms.
- `server/combat.js` accepts `roomBroadcast` as an argument instead of importing the composition root.
