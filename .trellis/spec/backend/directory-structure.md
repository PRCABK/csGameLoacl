# Directory Structure

> How backend code is organized in this project.

---

## Overview

The backend is intentionally small and currently lives in a single CommonJS entry file: `server.js`. It combines static file serving, WebSocket room management, game state updates, and the HTTP server bootstrap.

There is no `src/` directory, route framework, service layer, or build step for backend code.

---

## Directory Layout

```
server.js              # HTTP static server, WebSocket server, rooms, gameplay events
package.json           # npm metadata and the `start` script
client/                # browser ES modules served as static assets
models/                # GLB assets served by the static file handler
index.html             # game shell served at `/`
style.css              # game UI styles
docs/                  # static landing page assets
```

---

## Module Organization

Keep backend changes in `server.js` unless a task explicitly plans a module split. Existing helper functions are grouped by behavior:

- Configuration constants: `ROUND_SECONDS`, `DAMAGE`, `RESPAWN_MS`, `MAPS`, `DEFAULT_MAP`.
- Room helpers: `roomKey`, `normalizeMapId`, `createRoom`, `getOrCreateRoom`.
- Gameplay helpers: `startRound`, `spawn`, `teamScores`, `scoreboard`, `snapshot`.
- Transport helpers: `send`, `roomBroadcast`.
- Runtime handlers: `http.createServer(...)`, `wss.on('connection', ...)`, and the `setInterval(...)` tick.

When adding backend behavior, prefer another small helper near the related group instead of introducing a new abstraction prematurely.

---

## Naming Conventions

- Use CommonJS imports in backend code: `const http = require('http')`.
- Use camelCase for functions and variables: `normalizeMapId`, `getOrCreateRoom`, `roomBroadcast`.
- Use UPPER_SNAKE_CASE for constants: `ROUND_SECONDS`, `RESPAWN_MS`, `DEFAULT_MAP`.
- Use concise game-domain names for in-memory entities: `room`, `player`, `victim`, `winner`.
- WebSocket payloads use a `type` field, for example `join`, `move`, `shoot`, `state`, `respawn`, and `roundEnd`.

---

## Examples

- `server.js` defines map configuration in `MAPS` and validates map IDs with `normalizeMapId`.
- `server.js` stores active rooms in the in-memory `rooms` map keyed by `mode:mapId`.
- `server.js` builds client snapshots with `snapshot(room)` before broadcasting state every 50 ms.
